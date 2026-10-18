/** Mirrors the server's response DTOs (server/src/http/dto.ts). */

export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  hireDate: string;
  salary: number;
  currency: string;
  salaryEffectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRevision {
  id: number;
  previousSalary: number | null;
  newSalary: number;
  currency: string;
  effectiveDate: string;
  reason: string;
  createdAt: string;
}

export interface EmployeeDetail extends Employee {
  revisions: SalaryRevision[];
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FilterValues {
  countries: string[];
  departments: string[];
  jobTitles: string[];
  statuses: EmployeeStatus[];
  employmentTypes: EmploymentType[];
  supportedCountries: { name: string; currency: string }[];
}

export const SORTABLE_FIELDS = [
  'fullName',
  'employeeCode',
  'jobTitle',
  'department',
  'country',
  'hireDate',
  'salary',
] as const;
export type SortField = (typeof SORTABLE_FIELDS)[number];

export interface ListEmployeesParams {
  page: number;
  pageSize: number;
  search?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
  status?: EmployeeStatus;
  sortBy: SortField;
  sortDir: 'asc' | 'desc';
}

export interface EmployeeInput {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  employmentType: EmploymentType;
  hireDate: string;
  salary: number;
}

export type EmployeeUpdate = Partial<Omit<EmployeeInput, 'country' | 'salary'>>;

export interface SalaryChangeInput {
  salary: number;
  effectiveDate: string;
  reason: string;
}
