import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JobTitleInsights, SalaryDistribution } from '../../api/insights';
import { filterValues, mockApi, on, renderWithProviders, type ApiCall } from '../../test/utils';
import { InsightsPage } from './InsightsPage';

const summary = {
  reportingCurrency: 'USD',
  headcount: 9_594,
  totalAnnualCost: 791_884_902,
  medianSalary: 73_889,
  averageSalary: 82_540,
  countries: 8,
  departments: 7,
};
const byCountry = [
  {
    country: 'India',
    currency: 'INR',
    headcount: 2_400,
    min: 1_166_700,
    median: 2_600_000,
    average: 2_797_609,
    max: 6_526_100,
    medianUsd: 31_325,
    totalCostUsd: 80_000_000,
  },
];
const byDepartment = [
  {
    department: 'Engineering',
    headcount: 3_393,
    totalCostUsd: 373_206_859,
    medianUsd: 109_706,
    averageUsd: 109_993,
  },
];
const titles = (currency: string, median: number): JobTitleInsights => ({
  currency,
  rows: [
    {
      jobTitle: 'Software Engineer',
      headcount: 10,
      min: median / 2,
      median,
      average: median,
      max: median * 2,
    },
  ],
});
const distribution: SalaryDistribution = {
  currency: 'USD',
  bucketWidth: 20_000,
  buckets: [
    { from: 40_000, to: 60_000, count: 1_433 },
    { from: 60_000, to: 80_000, count: 1_745 },
  ],
};

/** Answers every insights endpoint; job titles depend on the requested country. */
function mockInsightsApi() {
  return mockApi(
    on('GET', '/insights/summary', summary),
    on('GET', '/insights/by-country', byCountry),
    on('GET', '/insights/by-department', byDepartment),
    on('GET', '/insights/distribution', distribution),
    on('GET', '/insights/recent-changes', []),
    on('GET', '/meta/filters', filterValues),
    (call: ApiCall) =>
      call.path === '/insights/by-job-title'
        ? {
            body:
              call.query.get('country') === 'India'
                ? titles('INR', 3_000_000)
                : titles('USD', 100_000),
          }
        : undefined,
  );
}

describe('InsightsPage', () => {
  it('leads with headline figures for the organisation', async () => {
    mockInsightsApi();

    renderWithProviders(<InsightsPage />);

    expect(await screen.findByText('9,594')).toBeInTheDocument();
    expect(screen.getByText('$791.9M')).toBeInTheDocument();
    expect(screen.getByText('$73.9K')).toBeInTheDocument();
    expect(screen.getByText('8 countries · 7 departments')).toBeInTheDocument();
  });

  it('shows each country in its own currency alongside USD comparisons', async () => {
    mockInsightsApi();

    renderWithProviders(<InsightsPage />);

    const table = await screen.findByRole('table', { name: 'Pay by country' });
    const india = within(table).getByRole('row', { name: /india/i });
    expect(india).toHaveTextContent('₹2,600,000');
    expect(india).toHaveTextContent('$31,325');
  });

  it('switches job-title pay bands to local currency when a country is picked', async () => {
    const api = mockInsightsApi();
    renderWithProviders(<InsightsPage />);
    const titlesTable = await screen.findByRole('table', { name: 'Pay by job title' });
    expect(titlesTable).toHaveTextContent('$100,000');

    await userEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    await userEvent.click(await screen.findByRole('option', { name: 'India (INR)' }));

    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Pay by job title' })).toHaveTextContent(
        '₹3,000,000',
      ),
    );
    expect(api.callsTo('/insights/distribution').at(-1)?.query.get('country')).toBe('India');
  });

  it('offers the distribution as a table so no value is hover-only', async () => {
    mockInsightsApi();
    renderWithProviders(<InsightsPage />);
    await screen.findByText('9,594');

    await userEvent.click(screen.getByRole('button', { name: 'Table' }));

    const table = await screen.findByRole('table', { name: 'Salary distribution' });
    expect(within(table).getByRole('row', { name: /\$40,000 – \$60,000/ })).toHaveTextContent(
      '1,433',
    );
  });

  it('shows an error for a failed section without hiding the rest', async () => {
    mockApi(
      on(
        'GET',
        '/insights/by-country',
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
        500,
      ),
      on('GET', '/insights/summary', summary),
      on('GET', '/insights/by-department', byDepartment),
      on('GET', '/insights/distribution', distribution),
      on('GET', '/insights/by-job-title', titles('USD', 100_000)),
      on('GET', '/insights/recent-changes', []),
      on('GET', '/meta/filters', filterValues),
    );

    renderWithProviders(<InsightsPage />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(await screen.findByText('9,594')).toBeInTheDocument();
  });
});
