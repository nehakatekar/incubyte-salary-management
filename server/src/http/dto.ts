import type { Employee, SalaryRevision } from '@prisma/client';

/** Calendar dates go over the wire as YYYY-MM-DD; timestamps stay ISO-8601. */
const toDate = (value: Date) => value.toISOString().slice(0, 10);

export function toEmployeeDto(employee: Employee) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    email: employee.email,
    jobTitle: employee.jobTitle,
    department: employee.department,
    country: employee.country,
    employmentType: employee.employmentType,
    status: employee.status,
    hireDate: toDate(employee.hireDate),
    salary: employee.salary,
    currency: employee.currency,
    salaryEffectiveDate: toDate(employee.salaryEffectiveDate),
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

export function toRevisionDto(revision: SalaryRevision) {
  return {
    id: revision.id,
    previousSalary: revision.previousSalary,
    newSalary: revision.newSalary,
    currency: revision.currency,
    effectiveDate: toDate(revision.effectiveDate),
    reason: revision.reason,
    createdAt: revision.createdAt.toISOString(),
  };
}

export function toEmployeeDetailDto(employee: Employee & { revisions: SalaryRevision[] }) {
  return { ...toEmployeeDto(employee), revisions: employee.revisions.map(toRevisionDto) };
}
