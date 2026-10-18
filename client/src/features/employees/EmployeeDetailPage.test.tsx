import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EmployeeDetail } from '../../api/types';
import { buildEmployee, filterValues, mockApi, on, renderWithProviders } from '../../test/utils';
import { EmployeeDetailPage } from './EmployeeDetailPage';

const detail = (overrides: Partial<EmployeeDetail> = {}): EmployeeDetail => ({
  ...buildEmployee({ salary: 66_000, salaryEffectiveDate: '2024-04-01' }),
  revisions: [
    {
      id: 2,
      previousSalary: 60_000,
      newSalary: 66_000,
      currency: 'GBP',
      effectiveDate: '2024-04-01',
      reason: 'Annual review',
      createdAt: '2024-04-01T00:00:00.000Z',
    },
    {
      id: 1,
      previousSalary: null,
      newSalary: 60_000,
      currency: 'GBP',
      effectiveDate: '2022-03-01',
      reason: 'Initial salary',
      createdAt: '2022-03-01T00:00:00.000Z',
    },
  ],
  ...overrides,
});

const openPage = () =>
  renderWithProviders(<EmployeeDetailPage />, { route: '/employees/1', path: '/employees/:id' });

describe('EmployeeDetailPage', () => {
  it('shows the current salary and the history with each change', async () => {
    mockApi(on('GET', '/employees/1', detail()), on('GET', '/meta/filters', filterValues));

    openPage();

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('£66,000', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/per year · since 1 apr 2024/i)).toBeInTheDocument();
    const history = screen.getByRole('table', { name: 'Salary history' });
    const [, newest, oldest] = within(history).getAllByRole('row');
    expect(newest).toHaveTextContent('1 Apr 2024£66,000+10.0%Annual review');
    expect(oldest).toHaveTextContent('Starting salary');
  });

  it('lets HR act on an active employee', async () => {
    mockApi(on('GET', '/employees/1', detail()), on('GET', '/meta/filters', filterValues));

    openPage();

    expect(await screen.findByRole('button', { name: 'Change salary' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Terminate' })).toBeEnabled();
  });

  it('blocks salary changes and termination for a terminated employee', async () => {
    mockApi(
      on('GET', '/employees/1', detail({ status: 'TERMINATED' })),
      on('GET', '/meta/filters', filterValues),
    );

    openPage();

    expect(await screen.findByRole('button', { name: 'Change salary' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Terminate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeEnabled();
  });

  it('summarises the salary trend for the chart', async () => {
    mockApi(on('GET', '/employees/1', detail()), on('GET', '/meta/filters', filterValues));

    openPage();

    expect(
      await screen.findByRole(
        'img',
        {
          name: 'Salary went from £60,000 to £66,000 (+10.0%) over 1 change',
        },
        // The chart is lazy-loaded; its first import in a test run takes a moment.
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it('links the job title and department to colleagues in the same country', async () => {
    mockApi(on('GET', '/employees/1', detail()), on('GET', '/meta/filters', filterValues));

    openPage();

    expect(await screen.findByRole('link', { name: 'Software Engineer' })).toHaveAttribute(
      'href',
      '/employees?country=United+Kingdom&jobTitle=Software+Engineer',
    );
    expect(screen.getByRole('link', { name: 'Engineering' })).toHaveAttribute(
      'href',
      '/employees?country=United+Kingdom&department=Engineering',
    );
  });

  it('explains a missing employee and links back to the list', async () => {
    mockApi(
      on(
        'GET',
        '/employees/1',
        { error: { code: 'NOT_FOUND', message: 'Employee not found' } },
        404,
      ),
    );

    openPage();

    expect(await screen.findByText('Employee not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all employees/i })).toHaveAttribute(
      'href',
      '/employees',
    );
  });

  it('treats a malformed id in the URL as not found, without calling the API', async () => {
    const api = mockApi();

    renderWithProviders(<EmployeeDetailPage />, {
      route: '/employees/abc',
      path: '/employees/:id',
    });

    expect(await screen.findByText('Employee not found')).toBeInTheDocument();
    expect(api.calls).toEqual([]);
  });

  it('opens the salary dialog from the page', async () => {
    mockApi(on('GET', '/employees/1', detail()), on('GET', '/meta/filters', filterValues));
    openPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Change salary' }));

    expect(
      screen.getByRole('dialog', { name: /change salary for ada lovelace/i }),
    ).toBeInTheDocument();
  });
});
