export interface EmployeeFilters {
  country?: string;
  department?: string;
  jobTitle?: string;
}

/** The employee list, pre-filtered: the way from an insight to the people behind it. */
export function employeesUrl(filters: EmployeeFilters): string {
  const params = new URLSearchParams();
  for (const key of ['country', 'department', 'jobTitle'] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/employees?${query}` : '/employees';
}
