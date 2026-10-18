import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../api/employees';
import type {
  EmployeeInput,
  EmployeeUpdate,
  ListEmployeesParams,
  SalaryChangeInput,
} from '../api/types';

export const employeeKeys = {
  all: ['employees'] as const,
  list: (params: ListEmployeesParams) => ['employees', 'list', params] as const,
  detail: (id: number) => ['employees', 'detail', id] as const,
  filters: ['meta', 'filters'] as const,
};

export function useEmployeeList(params: ListEmployeesParams) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeesApi.list(params),
    // Keep showing the current page while the next one loads, so the table does not flash.
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: number) {
  return useQuery({ queryKey: employeeKeys.detail(id), queryFn: () => employeesApi.get(id) });
}

export function useFilterValues() {
  return useQuery({
    queryKey: employeeKeys.filters,
    queryFn: employeesApi.filters,
    staleTime: 5 * 60_000,
  });
}

/** Any write can change lists, details and filter options, so refresh them all. */
function useInvalidateEmployees() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
      queryClient.invalidateQueries({ queryKey: employeeKeys.filters }),
    ]);
}

export function useCreateEmployee() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (input: EmployeeInput) => employeesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee(id: number) {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (changes: EmployeeUpdate) => employeesApi.update(id, changes),
    onSuccess: invalidate,
  });
}

export function useTerminateEmployee(id: number) {
  const invalidate = useInvalidateEmployees();
  return useMutation({ mutationFn: () => employeesApi.terminate(id), onSuccess: invalidate });
}

export function useChangeSalary(id: number) {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (input: SalaryChangeInput) => employeesApi.changeSalary(id, input),
    onSuccess: invalidate,
  });
}
