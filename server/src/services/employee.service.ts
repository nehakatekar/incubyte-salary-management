import type { Employee } from '@prisma/client';
import { currencyForCountry } from '../domain/countries.js';
import { NotFoundError } from '../errors.js';
import type {
  EmployeeRepository,
  EmployeeWithRevisions,
} from '../repositories/employee.repository.js';
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from '../validation/employee.schemas.js';

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class EmployeeService {
  constructor(private readonly employees: EmployeeRepository) {}

  async list(query: ListEmployeesQuery): Promise<Page<Employee>> {
    const { rows, total } = await this.employees.list(query);
    return {
      data: rows,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async get(id: number): Promise<EmployeeWithRevisions> {
    const employee = await this.employees.findById(id);
    if (!employee) throw new NotFoundError('Employee not found');
    return employee;
  }

  create(input: CreateEmployeeInput): Promise<Employee> {
    // Validation guarantees the country is supported, so a currency always exists.
    const currency = currencyForCountry(input.country)!;
    return this.employees.create(
      { ...input, currency, salaryEffectiveDate: input.hireDate },
      {
        previousSalary: null,
        newSalary: input.salary,
        currency,
        effectiveDate: input.hireDate,
        reason: 'Initial salary',
      },
    );
  }

  update(id: number, changes: UpdateEmployeeInput): Promise<Employee> {
    return this.employees.update(id, changes);
  }

  /** Soft delete: the record and salary history are kept for reporting. */
  terminate(id: number): Promise<Employee> {
    return this.employees.update(id, { status: 'TERMINATED' });
  }
}
