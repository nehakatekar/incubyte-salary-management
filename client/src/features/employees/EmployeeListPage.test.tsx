import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link } from 'react-router';
import { EmployeeListPage } from './EmployeeListPage';
import {
  fill,
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

  it('includes terminated employees in a search unless a status is picked', async () => {
    const api = mockApi(
      on('GET', '/employees', pageOf([ada])),
      on('GET', '/meta/filters', filterValues),
    );
    renderWithProviders(<EmployeeListPage />);
    await screen.findByText('Ada Lovelace');

    await userEvent.type(screen.getByLabelText('Search'), 'lovelace');

    await waitFor(() =>
      expect(api.callsTo('/employees').at(-1)?.query.get('search')).toBe('lovelace'),
    );
    expect(api.callsTo('/employees').at(-1)?.query.has('status')).toBe(false);
    expect(screen.getByLabelText('Status')).toHaveTextContent('All');

    await userEvent.click(screen.getByLabelText('Status'));
    await userEvent.click(screen.getByRole('option', { name: 'Active' }));

    await waitFor(() =>
      expect(api.callsTo('/employees').at(-1)?.query.get('status')).toBe('ACTIVE'),
    );
    expect(api.callsTo('/employees').at(-1)?.query.get('search')).toBe('lovelace');
  });

  describe('clearing the search', () => {
    const searchFor = async (text: string) => {
      const api = mockApi(
        on('GET', '/employees', pageOf([ada])),
        on('GET', '/meta/filters', filterValues),
      );
      renderWithProviders(<EmployeeListPage />);
      await screen.findByText('Ada Lovelace');
      await fill(screen.getByLabelText('Search'), text);
      await waitFor(() => expect(api.callsTo('/employees').at(-1)?.query.get('search')).toBe(text));
      return api;
    };

    it('offers a clear button only once something is typed', async () => {
      mockApi(on('GET', '/employees', pageOf([ada])), on('GET', '/meta/filters', filterValues));
      renderWithProviders(<EmployeeListPage />);
      await screen.findByText('Ada Lovelace');

      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
      await userEvent.type(screen.getByLabelText('Search'), 'a');
      expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
    });

    it('empties the box, reloads the full list and keeps focus in the box', async () => {
      const api = await searchFor('lovelace');

      await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

      const input = screen.getByLabelText('Search');
      expect(input).toHaveValue('');
      expect(input).toHaveFocus();
      await waitFor(() =>
        expect(api.callsTo('/employees').at(-1)?.query.has('search')).toBe(false),
      );
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    it('clears with the Escape key', async () => {
      const api = await searchFor('lovelace');

      await userEvent.keyboard('{Escape}');

      expect(screen.getByLabelText('Search')).toHaveValue('');
      await waitFor(() =>
        expect(api.callsTo('/employees').at(-1)?.query.has('search')).toBe(false),
      );
    });
  });

  it('warns that salaries are not comparable across countries when sorting by salary', async () => {
    mockApi(on('GET', '/employees', pageOf([ada])), on('GET', '/meta/filters', filterValues));
    renderWithProviders(<EmployeeListPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Salary (local)' }));

    expect(
      await screen.findByText(/filter by a country to compare them fairly/i),
    ).toBeInTheDocument();
  });

  it('moves to the last page when the requested page no longer exists', async () => {
    const api = mockApi(
      (call) =>
        call.path === '/employees'
          ? {
              body: pageOf([ada], {
                page: Number(call.query.get('page')),
                total: 30,
                totalPages: 2,
              }),
            }
          : undefined,
      on('GET', '/meta/filters', filterValues),
    );

    renderWithProviders(<EmployeeListPage />, { route: '/?page=9' });

    await waitFor(() => expect(api.callsTo('/employees').at(-1)?.query.get('page')).toBe('2'));
  });

  it('empties the search box when the URL search is cleared elsewhere', async () => {
    mockApi(on('GET', '/employees', pageOf([ada])), on('GET', '/meta/filters', filterValues));
    renderWithProviders(
      <>
        <Link to="/">All employees</Link>
        <EmployeeListPage />
      </>,
      { route: '/?search=lovelace' },
    );
    expect(screen.getByLabelText('Search')).toHaveValue('lovelace');

    await userEvent.click(screen.getByRole('link', { name: 'All employees' }));

    await waitFor(() => expect(screen.getByLabelText('Search')).toHaveValue(''));
  });

  describe('clearing a dropdown filter', () => {
    it('offers a clear button only on filters that have a value', async () => {
      mockApi(on('GET', '/employees', pageOf([ada])), on('GET', '/meta/filters', filterValues));

      renderWithProviders(<EmployeeListPage />, { route: '/?country=India' });

      expect(await screen.findByRole('button', { name: 'Clear country' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear department' })).not.toBeInTheDocument();
    });

    it('removes only that filter, without opening the dropdown', async () => {
      const api = mockApi(
        on('GET', '/employees', pageOf([ada])),
        on('GET', '/meta/filters', filterValues),
      );
      renderWithProviders(<EmployeeListPage />, {
        route: '/?country=India&department=Engineering',
      });

      await userEvent.click(await screen.findByRole('button', { name: 'Clear country' }));

      await waitFor(() =>
        expect(api.callsTo('/employees').at(-1)?.query.has('country')).toBe(false),
      );
      expect(api.callsTo('/employees').at(-1)?.query.get('department')).toBe('Engineering');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
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
