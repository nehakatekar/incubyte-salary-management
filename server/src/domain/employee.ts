export const EMPLOYEE_STATUSES = ['ACTIVE', 'TERMINATED'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/** Largest salary we accept, kept well inside a 32-bit integer (see ADR-002). */
export const MAX_SALARY = 2_000_000_000;

export function formatEmployeeCode(id: number): string {
  return `EMP${String(id).padStart(5, '0')}`;
}
