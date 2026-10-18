import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { insightsApi } from '../api/insights';

/** Insights are org-wide aggregates; refreshed whenever an employee write invalidates `employees`. */
const insightsKey = (...parts: unknown[]) => ['employees', 'insights', ...parts] as const;

export const useInsightsSummary = () =>
  useQuery({ queryKey: insightsKey('summary'), queryFn: insightsApi.summary });

export const useCountryInsights = () =>
  useQuery({ queryKey: insightsKey('by-country'), queryFn: insightsApi.byCountry });

export const useDepartmentInsights = () =>
  useQuery({ queryKey: insightsKey('by-department'), queryFn: insightsApi.byDepartment });

export const useJobTitleInsights = (country?: string) =>
  useQuery({
    queryKey: insightsKey('by-job-title', country),
    queryFn: () => insightsApi.byJobTitle(country),
    placeholderData: keepPreviousData,
  });

export const useSalaryDistribution = (country?: string) =>
  useQuery({
    queryKey: insightsKey('distribution', country),
    queryFn: () => insightsApi.distribution(country),
    placeholderData: keepPreviousData,
  });

export const useRecentChanges = () =>
  useQuery({
    queryKey: insightsKey('recent-changes'),
    queryFn: () => insightsApi.recentChanges(10),
  });
