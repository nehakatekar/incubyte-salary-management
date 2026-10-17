import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessRuleError, NotFoundError } from '../../src/errors.js';
import type {
  EmployeeWithRevisions,
  NewRevision,
} from '../../src/repositories/employee.repository.js';
import { SalaryService, type SalaryRepository } from '../../src/services/salary.service.js';

const TODAY = new Date('2026-10-17T15:30:00Z');
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

function makeEmployee(overrides: Partial<EmployeeWithRevisions> = {}): EmployeeWithRevisions {
  return {
    id: 1,
    employeeCode: 'EMP00001',
    fullName: 'Ada Lovelace',
    email: 'ada@acme.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    country: 'United Kingdom',
    employmentType: 'FULL_TIME',
    hireDate: day('2022-03-01'),
    status: 'ACTIVE',
    salary: 60_000,
    currency: 'GBP',
    salaryEffectiveDate: day('2023-04-01'),
    createdAt: day('2022-03-01'),
    updatedAt: day('2023-04-01'),
    revisions: [],
    ...overrides,
  };
}

/** In-memory stand-in for the repository, recording what the service asked it to do. */
class FakeSalaryRepository implements SalaryRepository {
  readonly recorded: NewRevision[] = [];

  constructor(private employee: EmployeeWithRevisions | null) {}

  async findById(id: number) {
    return this.employee?.id === id ? this.employee : null;
  }

  async recordSalaryChange(_id: number, _expected: unknown, revision: NewRevision) {
    this.recorded.push(revision);
    this.employee = {
      ...this.employee!,
      salary: revision.newSalary,
      salaryEffectiveDate: revision.effectiveDate,
    };
  }
}

describe('SalaryService.changeSalary', () => {
  let repository: FakeSalaryRepository;
  let service: SalaryService;

  const change = (input: Partial<{ salary: number; effectiveDate: Date; reason: string }> = {}) =>
    service.changeSalary(1, {
      salary: 66_000,
      effectiveDate: day('2026-10-01'),
      reason: 'Annual review',
      ...input,
    });

  beforeEach(() => {
    repository = new FakeSalaryRepository(makeEmployee());
    service = new SalaryService(repository, () => TODAY);
  });

  it('records a revision from the current salary to the new one, in the employee currency', async () => {
    await change();

    expect(repository.recorded).toEqual([
      {
        previousSalary: 60_000,
        newSalary: 66_000,
        currency: 'GBP',
        effectiveDate: day('2026-10-01'),
        reason: 'Annual review',
      },
    ]);
  });

  it('returns the employee with the new salary applied', async () => {
    const updated = await change();

    expect(updated).toMatchObject({ salary: 66_000, salaryEffectiveDate: day('2026-10-01') });
  });

  it('allows a decrease, e.g. moving to part-time', async () => {
    await change({ salary: 40_000, reason: 'Moved to part-time' });

    expect(repository.recorded[0]?.newSalary).toBe(40_000);
  });

  it('allows a change effective today', async () => {
    await change({ effectiveDate: day('2026-10-17') });

    expect(repository.recorded).toHaveLength(1);
  });

  it('allows a correction on the same day as the current salary took effect', async () => {
    await change({ effectiveDate: day('2023-04-01') });

    expect(repository.recorded).toHaveLength(1);
  });

  it('fails for an unknown employee', async () => {
    await expect(
      service.changeSalary(99, { salary: 1, effectiveDate: TODAY, reason: 'x' }),
    ).rejects.toThrow(NotFoundError);
  });

  describe('rejects, without recording anything,', () => {
    it.each([
      [
        'a terminated employee',
        () => (repository = new FakeSalaryRepository(makeEmployee({ status: 'TERMINATED' }))),
        {},
        /terminated/i,
      ],
      ['an unchanged salary', () => {}, { salary: 60_000 }, /same as the current/i],
      [
        'a date before the current salary took effect',
        () => {},
        { effectiveDate: day('2023-03-31') },
        /on or after 2023-04-01/,
      ],
      ['a date in the future', () => {}, { effectiveDate: day('2026-10-18') }, /future/i],
    ])('%s', async (_case, arrange, input, message) => {
      arrange();
      service = new SalaryService(repository, () => TODAY);

      const result = change(input);

      await expect(result).rejects.toThrow(BusinessRuleError);
      await expect(result).rejects.toThrow(message);
      expect(repository.recorded).toEqual([]);
    });
  });
});
