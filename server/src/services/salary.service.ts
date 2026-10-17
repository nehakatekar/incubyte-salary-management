import { formatIsoDate, startOfUtcDay, type Clock } from '../domain/clock.js';
import { BusinessRuleError, NotFoundError } from '../errors.js';
import type {
  EmployeeRepository,
  EmployeeWithRevisions,
} from '../repositories/employee.repository.js';
import type { ChangeSalaryInput } from '../validation/salary.schemas.js';

export type SalaryRepository = Pick<EmployeeRepository, 'findById' | 'recordSalaryChange'>;

export class SalaryService {
  constructor(
    private readonly employees: SalaryRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Changes an employee's current salary and appends a revision to their
   * history. Dates are calendar days in UTC.
   */
  async changeSalary(id: number, input: ChangeSalaryInput): Promise<EmployeeWithRevisions> {
    const employee = await this.employees.findById(id);
    if (!employee) throw new NotFoundError('Employee not found');

    assertChangeAllowed(employee, input, startOfUtcDay(this.clock()));

    await this.employees.recordSalaryChange(
      id,
      { salary: employee.salary, salaryEffectiveDate: employee.salaryEffectiveDate },
      {
        previousSalary: employee.salary,
        newSalary: input.salary,
        currency: employee.currency,
        effectiveDate: input.effectiveDate,
        reason: input.reason,
      },
    );

    return (await this.employees.findById(id))!;
  }
}

function assertChangeAllowed(
  employee: EmployeeWithRevisions,
  input: ChangeSalaryInput,
  today: Date,
) {
  if (employee.status === 'TERMINATED') {
    throw new BusinessRuleError('Cannot change the salary of a terminated employee');
  }
  if (input.salary === employee.salary) {
    throw new BusinessRuleError('New salary is the same as the current salary');
  }
  if (input.effectiveDate < employee.salaryEffectiveDate) {
    throw new BusinessRuleError(
      `Effective date must be on or after ${formatIsoDate(employee.salaryEffectiveDate)}, when the current salary took effect`,
    );
  }
  if (input.effectiveDate > today) {
    throw new BusinessRuleError(
      'Effective date cannot be in the future; scheduled changes are not supported',
    );
  }
}
