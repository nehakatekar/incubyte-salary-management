import { request } from './client';
import type {
  Employee,
  EmployeeDetail,
  EmployeeInput,
  EmployeeUpdate,
  FilterValues,
  ListEmployeesParams,
  Page,
  SalaryChangeInput,
} from './types';

export const employeesApi = {
  list: (params: ListEmployeesParams) =>
    request<Page<Employee>>('/employees', { query: { ...params } }),
  get: (id: number) => request<EmployeeDetail>(`/employees/${id}`),
  create: (input: EmployeeInput) =>
    request<Employee>('/employees', { method: 'POST', body: input }),
  update: (id: number, changes: EmployeeUpdate) =>
    request<Employee>(`/employees/${id}`, { method: 'PATCH', body: changes }),
  terminate: (id: number) => request<Employee>(`/employees/${id}`, { method: 'DELETE' }),
  changeSalary: (id: number, input: SalaryChangeInput) =>
    request<EmployeeDetail>(`/employees/${id}/salary`, { method: 'POST', body: input }),
  filters: () => request<FilterValues>('/meta/filters'),
};
