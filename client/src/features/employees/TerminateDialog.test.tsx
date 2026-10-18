import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildEmployee, mockApi, on, renderWithProviders } from '../../test/utils';
import { TerminateDialog } from './TerminateDialog';

const employee = buildEmployee();

describe('TerminateDialog', () => {
  const open = () => {
    const onClose = vi.fn();
    renderWithProviders(<TerminateDialog employee={employee} open onClose={onClose} />);
    return onClose;
  };

  it('explains that the record and history are kept', () => {
    mockApi();
    open();

    expect(screen.getByText(/record and salary history are kept/i)).toBeInTheDocument();
  });

  it('terminates only after explicit confirmation', async () => {
    const api = mockApi(on('DELETE', '/employees/1', { ...employee, status: 'TERMINATED' }));
    const onClose = open();

    await userEvent.click(screen.getByRole('button', { name: 'Terminate' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.calls).toEqual([
      expect.objectContaining({ method: 'DELETE', path: '/employees/1' }),
    ]);
  });

  it('does nothing when cancelled', async () => {
    const api = mockApi();
    const onClose = open();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(api.calls).toEqual([]);
  });
});
