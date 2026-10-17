import type { PrismaClient } from '@prisma/client';
import { currencyForCountry } from '../../src/domain/countries.js';

export interface EmployeeFixture {
  fullName?: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  country?: string;
  employmentType?: string;
  status?: string;
  salary?: number;
  hireDate?: string;
}

let sequence = 0;

/** Inserts an employee (with its initial revision) directly, bypassing the API. */
export async function insertEmployee(prisma: PrismaClient, overrides: EmployeeFixture = {}) {
  sequence += 1;
  const country = overrides.country ?? 'United States';
  const currency = currencyForCountry(country)!;
  const hireDate = new Date(overrides.hireDate ?? '2020-01-15');
  const salary = overrides.salary ?? 100_000;

  return prisma.employee.create({
    data: {
      employeeCode: `EMP${String(sequence).padStart(5, '0')}`,
      fullName: overrides.fullName ?? `Employee ${sequence}`,
      email: overrides.email ?? `employee.${sequence}@acme.com`,
      jobTitle: overrides.jobTitle ?? 'Software Engineer',
      department: overrides.department ?? 'Engineering',
      country,
      employmentType: overrides.employmentType ?? 'FULL_TIME',
      status: overrides.status ?? 'ACTIVE',
      hireDate,
      salary,
      currency,
      salaryEffectiveDate: hireDate,
      revisions: {
        create: {
          previousSalary: null,
          newSalary: salary,
          currency,
          effectiveDate: hireDate,
          reason: 'Initial salary',
        },
      },
    },
  });
}
