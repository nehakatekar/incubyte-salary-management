import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { SalaryRevision } from '../../api/types';
import { formatDate, formatMoney, formatPercent, percentChange } from '../../lib/format';

/** Salary revisions, newest first, as returned by the API. */
export function SalaryHistory({ revisions }: { revisions: SalaryRevision[] }) {
  return (
    <Table size="small" aria-label="Salary history">
      <TableHead>
        <TableRow>
          <TableCell>Effective</TableCell>
          <TableCell align="right">Salary</TableCell>
          <TableCell align="right">Change</TableCell>
          <TableCell>Reason</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {revisions.map((revision) => {
          const change =
            revision.previousSalary === null
              ? null
              : percentChange(revision.previousSalary, revision.newSalary);
          return (
            <TableRow key={revision.id}>
              <TableCell>{formatDate(revision.effectiveDate)}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(revision.newSalary, revision.currency)}
              </TableCell>
              <TableCell align="right">
                {change === null ? (
                  <Typography variant="body2" color="text.secondary">
                    Starting salary
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: change >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {formatPercent(change)}
                  </Typography>
                )}
              </TableCell>
              <TableCell>{revision.reason}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
