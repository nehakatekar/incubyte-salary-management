import { request } from './client';

/** Mirrors server/src/services/insights.service.ts. Only active employees are counted. */

export interface InsightsSummary {
  reportingCurrency: string;
  headcount: number;
  totalAnnualCost: number;
  medianSalary: number | null;
  averageSalary: number | null;
  countries: number;
  departments: number;
}

export interface CountryInsight {
  country: string;
  currency: string;
  headcount: number;
  min: number;
  median: number;
  average: number;
  max: number;
  medianUsd: number;
  totalCostUsd: number;
}

export interface DepartmentInsight {
  department: string;
  headcount: number;
  totalCostUsd: number;
  medianUsd: number;
  averageUsd: number;
}

export interface JobTitleInsights {
  currency: string;
  rows: {
    jobTitle: string;
    headcount: number;
    min: number;
    median: number;
    average: number;
    max: number;
  }[];
}

export interface SalaryDistribution {
  currency: string;
  bucketWidth: number;
  buckets: { from: number; to: number; count: number }[];
}

export interface RecentChange {
  id: number;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  country: string;
  previousSalary: number;
  newSalary: number;
  currency: string;
  changePercent: number;
  effectiveDate: string;
  reason: string;
}

export const insightsApi = {
  summary: () => request<InsightsSummary>('/insights/summary'),
  byCountry: () => request<CountryInsight[]>('/insights/by-country'),
  byDepartment: () => request<DepartmentInsight[]>('/insights/by-department'),
  byJobTitle: (country?: string) =>
    request<JobTitleInsights>('/insights/by-job-title', { query: { country } }),
  distribution: (country?: string) =>
    request<SalaryDistribution>('/insights/distribution', { query: { country } }),
  recentChanges: (limit = 10) =>
    request<RecentChange[]>('/insights/recent-changes', { query: { limit } }),
};
