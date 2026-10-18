import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { errorMessage } from '../../api/client';
import type { Employee } from '../../api/types';
import { useNotify } from '../../components/Notifications';
import { useTerminateEmployee } from '../../hooks/useEmployees';

interface Props {
  employee: Employee;
  open: boolean;
  onClose: () => void;
}

export function TerminateDialog({ employee, open, onClose }: Props) {
  const terminate = useTerminateEmployee(employee.id);
  const notify = useNotify();

  const handleConfirm = async () => {
    await terminate.mutateAsync();
    notify(`${employee.fullName} marked as terminated`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Terminate {employee.fullName}?</DialogTitle>
      <DialogContent>
        {terminate.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage(terminate.error)}
          </Alert>
        )}
        <DialogContentText>
          They will be marked as terminated and excluded from pay insights. Their record and salary
          history are kept.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          loading={terminate.isPending}
          onClick={() => void handleConfirm().catch(() => {})}
        >
          Terminate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
