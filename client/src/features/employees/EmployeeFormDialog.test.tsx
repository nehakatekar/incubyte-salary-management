import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  fill,
  buildEmployee,
  filterValues,
  mockApi,
  on,
  renderWithProviders,
} from '../../test/utils';
import { EmployeeFormDialog } from './EmployeeFormDialog';

const submit = (name: RegExp | string) => userEvent.click(screen.getByRole('button', { name }));
const postsOrPatches = (api: ReturnType<typeof mockApi>) =>
  api.calls.filter((call) => call.method !== 'GET');

describe('EmployeeFormDialog — create', () => {
  const openCreate = () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <EmployeeFormDialog mode="create" open onClose={onClose} onSaved={onSaved} />,
    );
    return { onSaved, onClose };
  };

  it('explains every missing or invalid field instead of submitting', async () => {
    const api = mockApi(on('GET', '/meta/filters', filterValues));
    openCreate();

    await fill(screen.getByLabelText(/work email/i), 'not-an-email');
    await submit('Add employee');

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Country is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a positive whole number')).toBeInTheDocument();
    expect(postsOrPatches(api)).toEqual([]);
  });

  it('creates the employee with trimmed values and a numeric salary', async () => {
    const created = buildEmployee({ id: 42, employeeCode: 'EMP00042', fullName: 'Meera Iyer' });
    const api = mockApi(
      on('GET', '/meta/filters', filterValues),
      on('POST', '/employees', created, 201),
    );
    const { onSaved, onClose } = openCreate();

    await fill(screen.getByLabelText(/full name/i), '  Meera Iyer ');
    await fill(screen.getByLabelText(/work email/i), 'meera@acme.com');
    await fill(screen.getByLabelText(/job title/i), 'Product Manager');
    await fill(screen.getByLabelText(/department/i), 'Product');
    await userEvent.click(screen.getByRole('combobox', { name: /country/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'India (INR)' }));
    await fill(screen.getByLabelText(/annual base salary/i), '3200000');
    await submit('Add employee');

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created));
    expect(onClose).toHaveBeenCalled();
    expect(postsOrPatches(api)[0]?.body).toMatchObject({
      fullName: 'Meera Iyer',
      email: 'meera@acme.com',
      jobTitle: 'Product Manager',
      department: 'Product',
      country: 'India',
      employmentType: 'FULL_TIME',
      salary: 3_200_000,
    });
  });

  it('shows the currency of the chosen country next to the salary', async () => {
    mockApi(on('GET', '/meta/filters', filterValues));
    openCreate();

    await userEvent.click(screen.getByRole('combobox', { name: /country/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'United Kingdom (GBP)' }));

    expect(screen.getByText('GBP')).toBeInTheDocument();
  });
});

describe('EmployeeFormDialog — edit', () => {
  const employee = buildEmployee();
  const openEdit = () => {
    const onClose = vi.fn();
    renderWithProviders(
      <EmployeeFormDialog mode="edit" employee={employee} open onClose={onClose} />,
    );
    return { onClose };
  };

  it('cannot change salary or country, and cannot save until something changes', async () => {
    mockApi(on('GET', '/meta/filters', filterValues));
    openEdit();

    expect(screen.queryByLabelText(/annual base salary/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /country/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('sends only the fields that changed', async () => {
    const api = mockApi(
      on('GET', '/meta/filters', filterValues),
      on('PATCH', '/employees/1', { ...employee, jobTitle: 'Staff Engineer' }),
    );
    const { onClose } = openEdit();

    const jobTitle = screen.getByLabelText(/job title/i);
    await userEvent.clear(jobTitle);
    await fill(jobTitle, 'Staff Engineer');
    await submit('Save changes');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(postsOrPatches(api)[0]?.body).toEqual({ jobTitle: 'Staff Engineer' });
  });

  it('keeps the dialog open and explains a duplicate email', async () => {
    mockApi(
      on('GET', '/meta/filters', filterValues),
      on(
        'PATCH',
        '/employees/1',
        { error: { code: 'CONFLICT', message: 'An employee with this email already exists' } },
        409,
      ),
    );
    const { onClose } = openEdit();

    const email = screen.getByLabelText(/work email/i);
    await userEvent.clear(email);
    await fill(email, 'taken@acme.com');
    await submit('Save changes');

    expect(
      await screen.findByText('An employee with this email already exists'),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
