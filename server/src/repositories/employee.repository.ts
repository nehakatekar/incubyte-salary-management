import { randomUUID } from 'node:crypto';
import { Prisma, type Employee, type PrismaClient, type SalaryRevision } from '@prisma/client';
import { formatEmployeeCode } from '../domain/employee.js';
import { ConflictError, NotFoundError } from '../errors.js';
import type { ListEmployeesQuery } from '../validation/employee.schemas.js';

const LIKE_WILDCARDS = /[%_]/;

export type EmployeeWithRevisions = Employee & { revisions: SalaryRevision[] };

export type NewEmployee = Omit<
  Employee,
  'id' | 'employeeCode' | 'status' | 'createdAt' | 'updatedAt'
>;
export type NewRevision = Pick<
  SalaryRevision,
  'previousSalary' | 'newSalary' | 'currency' | 'effectiveDate' | 'reason'
>;
export type EmployeeChanges = Partial<
  Pick<
    Employee,
    'fullName' | 'email' | 'jobTitle' | 'department' | 'employmentType' | 'hireDate' | 'status'
  >
>;

export interface FilterValues {
  countries: string[];
  departments: string[];
  jobTitles: string[];
}

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: ListEmployeesQuery): Promise<{ rows: Employee[]; total: number }> {
    const where = await this.buildWhere(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        // Secondary sort on id keeps paging stable when the primary key ties.
        orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: number): Promise<EmployeeWithRevisions | null> {
    return this.prisma.employee.findUnique({
      where: { id },
      include: { revisions: { orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }] } },
    });
  }

  /** Creates the employee and its first salary revision atomically. */
  create(data: NewEmployee, initialRevision: NewRevision): Promise<Employee> {
    return withConstraintErrors(() =>
      this.prisma.$transaction(async (tx) => {
        // The code is derived from the id, so insert with a unique placeholder first.
        const created = await tx.employee.create({
          data: {
            ...data,
            employeeCode: `PENDING-${randomUUID()}`,
            revisions: { create: initialRevision },
          },
        });
        return tx.employee.update({
          where: { id: created.id },
          data: { employeeCode: formatEmployeeCode(created.id) },
        });
      }),
    );
  }

  /**
   * Applies a salary change and appends its revision atomically. The update
   * only matches if the salary is still what the caller read (optimistic
   * concurrency) and the employee is still active, so two HR users cannot
   * silently overwrite each other or pay someone just terminated.
   */
  async recordSalaryChange(
    id: number,
    expected: Pick<Employee, 'salary' | 'salaryEffectiveDate'>,
    revision: NewRevision,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.employee.updateMany({
        where: { id, status: 'ACTIVE', ...expected },
        data: { salary: revision.newSalary, salaryEffectiveDate: revision.effectiveDate },
      });
      if (count === 0) {
        throw new ConflictError('Employee was changed by someone else; reload and try again');
      }
      await tx.salaryRevision.create({ data: { ...revision, employeeId: id } });
    });
  }

  update(id: number, changes: EmployeeChanges): Promise<Employee> {
    return withConstraintErrors(() =>
      this.prisma.employee.update({ where: { id }, data: changes }),
    );
  }

  private async buildWhere({
    search,
    country,
    department,
    jobTitle,
    status,
  }: ListEmployeesQuery): Promise<Prisma.EmployeeWhereInput> {
    const filters = { country, department, jobTitle, status };
    if (!search) return filters;
    if (!LIKE_WILDCARDS.test(search)) {
      return {
        ...filters,
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
          { employeeCode: { contains: search } },
        ],
      };
    }
    return { ...filters, id: { in: await this.idsContainingLiterally(search) } };
  }

  /**
   * Prisma's `contains` passes % and _ straight to LIKE as wildcards and has no
   * escape option, so terms containing them are matched here with ESCAPE.
   * Only such (rare) terms take this path, which keeps the id list small.
   */
  private async idsContainingLiterally(search: string): Promise<number[]> {
    const pattern = `%${search.replace(/[!%_]/g, (char) => `!${char}`)}%`;
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM Employee
      WHERE fullName LIKE ${pattern} ESCAPE '!'
         OR email LIKE ${pattern} ESCAPE '!'
         OR employeeCode LIKE ${pattern} ESCAPE '!'`;
    return rows.map((row) => Number(row.id));
  }

  async filterValues(): Promise<FilterValues> {
    const { employee } = this.prisma;
    const [countries, departments, jobTitles] = await Promise.all([
      employee
        .findMany({ distinct: ['country'], select: { country: true }, orderBy: { country: 'asc' } })
        .then((rows) => rows.map((row) => row.country)),
      employee
        .findMany({
          distinct: ['department'],
          select: { department: true },
          orderBy: { department: 'asc' },
        })
        .then((rows) => rows.map((row) => row.department)),
      employee
        .findMany({
          distinct: ['jobTitle'],
          select: { jobTitle: true },
          orderBy: { jobTitle: 'asc' },
        })
        .then((rows) => rows.map((row) => row.jobTitle)),
    ]);
    return { countries, departments, jobTitles };
  }
}

/** Translates Prisma constraint failures into errors the API can report. */
async function withConstraintErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictError('An employee with this email already exists');
      if (error.code === 'P2025') throw new NotFoundError('Employee not found');
    }
    throw error;
  }
}
