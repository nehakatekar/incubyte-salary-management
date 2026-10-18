import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangeSalaryDialog } from './ChangeSalaryDialog';
import { fill, buildEmployee, mockApi, on, renderWithProviders } from '../../test/utils';

// Ada earns £60,000, effective 2023-04-01.
const employee = buildEmployee();

describe('ChangeSalaryDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  const open = (onClose = vi.fn()) => {
    renderWithProviders(<ChangeSalaryDialog employee={employee} open onClose={onClose} />);
    return onClose;
  };
  const typeSalary = (amount: string) =>
    fill(screen.getByLabelText(/new annual base salary/i), amount);
  const typeReason = (reason: string) => fill(screen.getByLabelText(/reason/i), reason);
  const save = () => userEvent.click(screen.getByRole('button', { name: 'Save salary' }));

  it('previews the change against the current salary', async () => {
    mockApi();
    open();

    await typeSalary('66000');

    expect(screen.getByTestId('salary-preview')).toHaveTextContent('£60,000 → £66,000 (+10.0%)');
  });

  it('submits the change and closes', async () => {
    const api = mockApi(
      on('POST', '/employees/1/salary', { ...employee, salary: 66_000, revisions: [] }, 201),
    );
    const onClose = open();

    await typeSalary('66000');
    await typeReason('Annual review');
    await save();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.calls[0]?.body).toEqual({
      salary: 66_000,
      effectiveDate: '2026-10-17',
      reason: 'Annual review',
    });
  });

  it('explains what is wrong instead of submitting', async () => {
    const api = mockApi();
    open();

    await typeSalary('60000');
    fireEvent.change(screen.getByLabelText(/effective date/i), { target: { value: '2026-10-18' } });
    await save();

    expect(screen.getByText('New salary is the same as the current salary')).toBeInTheDocument();
    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(screen.getByText('Reason is required')).toBeInTheDocument();
    expect(api.calls).toEqual([]);
  });

  it('rejects a date before the current salary took effect', async () => {
    mockApi();
    open();

    fireEvent.change(screen.getByLabelText(/effective date/i), { target: { value: '2023-03-31' } });
    await save();

    expect(screen.getByText(/must be on or after 1 apr 2023/i)).toBeInTheDocument();
  });

  it('requires explicit confirmation for a change over 30%', async () => {
    const api = mockApi(on('POST', '/employees/1/salary', { ...employee, revisions: [] }, 201));
    open();

    await typeSalary('999999');
    await typeReason('Promotion');
    expect(screen.getByText(/this is a \+1566\.7% change/i)).toBeInTheDocument();

    await save();
    expect(api.calls).toEqual([]);

    await userEvent.click(screen.getByLabelText(/i have checked this amount is correct/i));
    await save();
    await waitFor(() => expect(api.calls).toHaveLength(1));
  });

  it('shows the server explanation when the change is refused', async () => {
    mockApi(
      on(
        'POST',
        '/employees/1/salary',
        {
          error: {
            code: 'CONFLICT',
            message: 'Employee was changed by someone else; reload and try again',
          },
        },
        409,
      ),
    );
    const onClose = open();

    await typeSalary('62000');
    await typeReason('Annual review');
    await save();

    expect(await screen.findByText(/changed by someone else/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
