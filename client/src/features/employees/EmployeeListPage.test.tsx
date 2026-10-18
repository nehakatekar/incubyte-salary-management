import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeListPage } from './EmployeeListPage';
import {
  buildEmployee,
  filterValues,
  mockApi,
  on,
  pageOf,
  renderWithProviders,
} from '../../test/utils';

const ada = buildEmployee();
const ravi = buildEmployee({
  id: 2,
  employeeCode: 'EMP00002',
  fullName: 'Ravi Kumar',
  email: 'ravi@acme.com',
  country: 'India',
  salary: 2_400_000,
  currency: 'INR',
});

describe('EmployeeListPage', () => {
  it('shows employees with salaries in their local currency', async () => {
    mockApi(
      on('GET', '/employees', pageOf([ada, ravi], { total: 2 })),
      on('GET', '/meta/filters', filterValues),
    );

    renderWithProviders(<EmployeeListPage />);

    const table = await screen.findByRole('table', { name: 'Employees' });
    expect(within(table).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(table).getByText('£60,000')).toBeInTheDocument();
    expect(within(table).getByText('₹2,400,000')).toBeInTheDocument();
    expect(screen.getByText('2 matching employees')).toBeInTheDocument();
  });

  it('asks the server for active employees sorted by name by default', async () => {
    const api = mockApi(
      on('GET', '/employees', pageOf([ada])),
      on('GET', '/meta/filters', filterValues),
    );

    renderWithProviders(<EmployeeListPage />);

    await screen.findByText('Ada Lovelace');
    const [request] = api.callsTo('/employees');
    expect(Object.fromEntries(request!.query)).toEqual({
      page: '1',
      pageSize: '25',
      status: 'ACTIVE',
      sortBy: 'fullName',
      sortDir: 'asc',
    });
  });

  it('searches on the server once the user stops typing, from page 1', async () => {
    const api = mockApi(
      on('GET', '/employees', pageOf([ada])),
      on('GET', '/meta/filters', filterValues),
    );
    renderWithProviders(<EmployeeListPage />, { route: '/?page=3' });
    await screen.findByText('Ada Lovelace');

    await userEvent.type(screen.getByLabelText('Search'), 'lovelace');

    await waitFor(() =>
      expect(api.callsTo('/employees').at(-1)?.query.get('search')).toBe('lovelace'),
    );
    const searches = api.callsTo('/employees').filter((call) => call.query.has('search'));
    expect(searches).toHaveLength(1);
    expect(searches[0]?.query.get('page')).toBe('1');
  });

  it('warns that salaries are not comparable across countries when sorting by salary', async () => {
    mockApi(on('GET', '/employees', pageOf([ada])), on('GET', '/meta/filters', filterValues));
    renderWithProviders(<EmployeeListPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Salary (local)' }));

    expect(
      await screen.findByText(/filter by a country to compare them fairly/i),
    ).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    mockApi(on('GET', '/employees', pageOf([])), on('GET', '/meta/filters', filterValues));

    renderWithProviders(<EmployeeListPage />);

    expect(await screen.findByText('No employees match these filters')).toBeInTheDocument();
  });

  it('shows the API error and recovers on retry', async () => {
    let attempts = 0;
    mockApi(
      (call) =>
        call.path === '/employees'
          ? ++attempts === 1
            ? {
                status: 500,
                body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
              }
            : { body: pageOf([ada]) }
          : undefined,
      on('GET', '/meta/filters', filterValues),
    );
    renderWithProviders(<EmployeeListPage />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });
});
