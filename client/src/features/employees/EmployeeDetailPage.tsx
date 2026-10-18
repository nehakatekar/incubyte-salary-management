import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import { ApiError } from '../../api/client';
import { EmptyState, ErrorState, LoadingState } from '../../components/PageStates';
import { StatusChip } from '../../components/StatusChip';
import { TableLink } from '../../components/TableLink';
import { isValidId, useEmployee } from '../../hooks/useEmployees';
import { formatDate, formatMoney, humanize } from '../../lib/format';
import { employeesUrl } from '../../lib/links';
import { ChangeSalaryDialog } from './ChangeSalaryDialog';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { SalaryHistory } from './SalaryHistory';
import { TerminateDialog } from './TerminateDialog';

// The charting library loads only when a chart is shown, keeping the list page bundle small.
const SalaryTrendChart = lazy(() =>
  import('./SalaryTrendChart').then((module) => ({ default: module.SalaryTrendChart })),
);

type OpenDialog = 'edit' | 'salary' | 'terminate' | null;

export function EmployeeDetailPage() {
  const id = Number(useParams().id);
  const { data: employee, error, isPending, refetch } = useEmployee(id);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const close = () => setDialog(null);

  const backLink = (
    <Button component={RouterLink} to="/employees" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
      All employees
    </Button>
  );

  const notFound = !isValidId(id) || (error instanceof ApiError && error.status === 404);
  if (notFound) {
    return (
      <>
        {backLink}
        <EmptyState
          title="Employee not found"
          hint="They may have been removed, or the link is wrong."
        />
      </>
    );
  }
  if (isPending) return <LoadingState label="Loading employee…" />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const isActive = employee.status === 'ACTIVE';

  return (
    <>
      {backLink}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 3 }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="h5" component="h2">
              {employee.fullName}
            </Typography>
            <StatusChip status={employee.status} />
          </Stack>
          <Typography color="text.secondary">
            {employee.employeeCode} ·{' '}
            <TableLink
              variant="subtle"
              to={employeesUrl({ country: employee.country, jobTitle: employee.jobTitle })}
            >
              {employee.jobTitle}
            </TableLink>{' '}
            ·{' '}
            <TableLink
              variant="subtle"
              to={employeesUrl({ country: employee.country, department: employee.department })}
            >
              {employee.department}
            </TableLink>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setDialog('edit')}>
            Edit details
          </Button>
          <Button variant="contained" onClick={() => setDialog('salary')} disabled={!isActive}>
            Change salary
          </Button>
          <Button color="error" onClick={() => setDialog('terminate')} disabled={!isActive}>
            Terminate
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Current salary
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 600 }}>
                {formatMoney(employee.salary, employee.currency)}
              </Typography>
              <Typography color="text.secondary">
                per year · since {formatDate(employee.salaryEffectiveDate)}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Detail label="Email">{employee.email}</Detail>
                <Detail label="Country">
                  {employee.country} ({employee.currency})
                </Detail>
                <Detail label="Employment type">{humanize(employee.employmentType)}</Detail>
                <Detail label="Hire date">{formatDate(employee.hireDate)}</Detail>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                Salary history
              </Typography>
              <Suspense fallback={null}>
                <SalaryTrendChart revisions={employee.revisions} currency={employee.currency} />
              </Suspense>
              <SalaryHistory revisions={employee.revisions} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <EmployeeFormDialog
        mode="edit"
        employee={employee}
        open={dialog === 'edit'}
        onClose={close}
      />
      <ChangeSalaryDialog employee={employee} open={dialog === 'salary'} onClose={close} />
      <TerminateDialog employee={employee} open={dialog === 'terminate'} onClose={close} />
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography>{children}</Typography>
    </Box>
  );
}
