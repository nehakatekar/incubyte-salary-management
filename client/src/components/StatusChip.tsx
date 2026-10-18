import { Chip } from '@mui/material';
import type { EmployeeStatus } from '../api/types';
import { humanize } from '../lib/format';

export function StatusChip({ status }: { status: EmployeeStatus }) {
  return (
    <Chip
      size="small"
      label={humanize(status)}
      color={status === 'ACTIVE' ? 'success' : 'default'}
      variant={status === 'ACTIVE' ? 'outlined' : 'filled'}
    />
  );
}
