import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import type { Employee, FilterValues, Page } from '../api/types';
import { NotificationProvider } from '../components/Notifications';
import { theme } from '../theme';

export interface ApiCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

type Handler = (call: ApiCall) => { status?: number; body: unknown } | undefined;

/**
 * Replaces `fetch` with an in-memory API. Each handler may answer a call or
 * return undefined to let the next one try; unanswered calls fail loudly.
 */
export function mockApi(...handlers: Handler[]) {
  const calls: ApiCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const call: ApiCall = {
      method: init?.method ?? 'GET',
      path: url.pathname.replace(/^\/api/, ''),
      query: url.searchParams,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const response = handlers.map((handle) => handle(call)).find(Boolean);
    if (!response) throw new Error(`Unhandled API call: ${call.method} ${call.path}`);
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, callsTo: (path: string) => calls.filter((c) => c.path === path) };
}

export const on =
  (method: string, path: string, body: unknown, status = 200): Handler =>
  (call) =>
    call.method === method && call.path === path ? { status, body } : undefined;

export function renderWithProviders(ui: ReactElement, { route = '/', path = '*' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MemoryRouter initialEntries={[route]}>
          <NotificationProvider>
            <Routes>
              <Route path={path} element={ui} />
            </Routes>
          </NotificationProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

export function buildEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    employeeCode: 'EMP00001',
    fullName: 'Ada Lovelace',
    email: 'ada@acme.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    country: 'United Kingdom',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    hireDate: '2022-03-01',
    salary: 60_000,
    currency: 'GBP',
    salaryEffectiveDate: '2023-04-01',
    createdAt: '2022-03-01T00:00:00.000Z',
    updatedAt: '2023-04-01T00:00:00.000Z',
    ...overrides,
  };
}

export function pageOf(data: Employee[], overrides: Partial<Page<Employee>> = {}): Page<Employee> {
  return { data, page: 1, pageSize: 25, total: data.length, totalPages: 1, ...overrides };
}

export const filterValues: FilterValues = {
  countries: ['India', 'United Kingdom'],
  departments: ['Engineering', 'Sales'],
  jobTitles: ['Software Engineer'],
  statuses: ['ACTIVE', 'TERMINATED'],
  employmentTypes: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
  supportedCountries: [
    { name: 'India', currency: 'INR' },
    { name: 'United Kingdom', currency: 'GBP' },
  ],
};
