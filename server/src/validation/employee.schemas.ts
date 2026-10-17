import { z } from 'zod';
import { COUNTRIES } from '../domain/countries.js';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES, MAX_SALARY } from '../domain/employee.js';
import { isoDate } from './common.js';

const text = z.string().trim().min(1).max(100);
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const country = z.string().refine((value) => COUNTRIES.some((c) => c.name === value), {
  message: 'Unsupported country',
});
export const salary = z.number().int().positive().max(MAX_SALARY);

export const SORTABLE_FIELDS = [
  'fullName',
  'employeeCode',
  'jobTitle',
  'department',
  'country',
  'hireDate',
  'salary',
] as const;

export const listEmployeesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  country: text.optional(),
  department: text.optional(),
  jobTitle: text.optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).default('fullName'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuery>;

export const createEmployeeBody = z.strictObject({
  fullName: text,
  email,
  jobTitle: text,
  department: text,
  country,
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hireDate: isoDate,
  salary,
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeBody>;

/**
 * Salary, country and status each have their own workflow (salary change,
 * relocation, termination), so a general edit cannot touch them.
 */
export const updateEmployeeBody = z
  .strictObject({
    fullName: text,
    email,
    jobTitle: text,
    department: text,
    employmentType: z.enum(EMPLOYMENT_TYPES),
    hireDate: isoDate,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeBody>;
