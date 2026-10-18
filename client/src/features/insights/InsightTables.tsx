import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import type {
  CountryInsight,
  JobTitleInsights,
  RecentChange,
  SalaryDistribution,
} from '../../api/insights';
import { formatDate, formatMoney, formatPercent } from '../../lib/format';
import { RangeBar } from './RangeBar';

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

function SimpleTable({
  label,
  head,
  children,
}: {
  label: string;
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <TableContainer>
      <Table size="small" aria-label={label}>
        <TableHead>
          <TableRow>{head}</TableRow>
        </TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </TableContainer>
  );
}

export function CountryTable({ rows }: { rows: CountryInsight[] }) {
  return (
    <SimpleTable
      label="Pay by country"
      head={
        <>
          <TableCell>Country</TableCell>
          <TableCell align="right">Headcount</TableCell>
          <TableCell align="right">Min</TableCell>
          <TableCell align="right">Median</TableCell>
          <TableCell align="right">Max</TableCell>
          <TableCell align="right">Median (USD)</TableCell>
          <TableCell align="right">Annual cost (USD)</TableCell>
        </>
      }
    >
      {rows.map((row) => (
        <TableRow key={row.country}>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>
            {row.country}{' '}
            <Typography component="span" variant="body2" color="text.secondary">
              {row.currency}
            </Typography>
          </TableCell>
          <TableCell align="right" sx={num}>
            {row.headcount.toLocaleString()}
          </TableCell>
          <TableCell align="right" sx={num}>
            {formatMoney(row.min, row.currency)}
          </TableCell>
          <TableCell align="right" sx={{ ...num, fontWeight: 600 }}>
            {formatMoney(row.median, row.currency)}
          </TableCell>
          <TableCell align="right" sx={num}>
            {formatMoney(row.max, row.currency)}
          </TableCell>
          <TableCell align="right" sx={num}>
            {formatMoney(row.medianUsd, 'USD')}
          </TableCell>
          <TableCell align="right" sx={num}>
            {formatMoney(row.totalCostUsd, 'USD')}
          </TableCell>
        </TableRow>
      ))}
    </SimpleTable>
  );
}

export function JobTitleTable({ data }: { data: JobTitleInsights }) {
  const scaleMax = Math.max(...data.rows.map((row) => row.max), 1);
  const money = (value: number) => formatMoney(value, data.currency);

  return (
    <SimpleTable
      label="Pay by job title"
      head={
        <>
          <TableCell>Job title</TableCell>
          <TableCell align="right">People</TableCell>
          <TableCell align="right">Min</TableCell>
          <TableCell align="right">Median</TableCell>
          <TableCell align="right">Max</TableCell>
          <TableCell sx={{ width: '28%' }}>Range</TableCell>
        </>
      }
    >
      {data.rows.map((row) => (
        <TableRow key={row.jobTitle}>
          <TableCell>{row.jobTitle}</TableCell>
          <TableCell align="right" sx={num}>
            {row.headcount.toLocaleString()}
          </TableCell>
          <TableCell align="right" sx={num}>
            {money(row.min)}
          </TableCell>
          <TableCell align="right" sx={{ ...num, fontWeight: 600 }}>
            {money(row.median)}
          </TableCell>
          <TableCell align="right" sx={num}>
            {money(row.max)}
          </TableCell>
          <TableCell>
            <RangeBar min={row.min} median={row.median} max={row.max} scaleMax={scaleMax} />
          </TableCell>
        </TableRow>
      ))}
    </SimpleTable>
  );
}

/** Table view of the histogram, so no value is only reachable by hovering. */
export function DistributionTable({ data }: { data: SalaryDistribution }) {
  return (
    <SimpleTable
      label="Salary distribution"
      head={
        <>
          <TableCell>Salary band ({data.currency})</TableCell>
          <TableCell align="right">Employees</TableCell>
        </>
      }
    >
      {data.buckets.map((bucket) => (
        <TableRow key={bucket.from}>
          <TableCell sx={num}>
            {formatMoney(bucket.from, data.currency)} – {formatMoney(bucket.to, data.currency)}
          </TableCell>
          <TableCell align="right" sx={num}>
            {bucket.count.toLocaleString()}
          </TableCell>
        </TableRow>
      ))}
    </SimpleTable>
  );
}

export function RecentChangesTable({ rows }: { rows: RecentChange[] }) {
  return (
    <SimpleTable
      label="Recent salary changes"
      head={
        <>
          <TableCell>Effective</TableCell>
          <TableCell>Employee</TableCell>
          <TableCell align="right">Change</TableCell>
          <TableCell>Reason</TableCell>
        </>
      }
    >
      {rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.effectiveDate)}</TableCell>
          <TableCell>
            <RouterLink
              to={`/employees/${row.employeeId}`}
              style={{ color: 'inherit', fontWeight: 500 }}
            >
              {row.fullName}
            </RouterLink>
            <Typography variant="body2" color="text.secondary">
              {row.jobTitle} · {row.country}
            </Typography>
          </TableCell>
          <TableCell align="right" sx={num}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: row.changePercent >= 0 ? 'success.dark' : 'error.main',
              }}
            >
              {formatPercent(row.changePercent / 100)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatMoney(row.previousSalary, row.currency)} →{' '}
              {formatMoney(row.newSalary, row.currency)}
            </Typography>
          </TableCell>
          <TableCell>{row.reason}</TableCell>
        </TableRow>
      ))}
    </SimpleTable>
  );
}
