import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import type { Employee, SortField } from '../../api/types';
import { EmptyState, ErrorState, LoadingState } from '../../components/PageStates';
import { StatusChip } from '../../components/StatusChip';
import { useEmployeeList } from '../../hooks/useEmployees';
import { formatDate, formatMoney } from '../../lib/format';
import { EmployeeFilters } from './EmployeeFilters';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { PAGE_SIZES, useListParams } from './useListParams';

const COLUMNS: { field: SortField; label: string; align?: 'right' }[] = [
  { field: 'employeeCode', label: 'Code' },
  { field: 'fullName', label: 'Name' },
  { field: 'jobTitle', label: 'Job title' },
  { field: 'department', label: 'Department' },
  { field: 'country', label: 'Country' },
  { field: 'hireDate', label: 'Hired' },
  { field: 'salary', label: 'Salary (local)', align: 'right' },
];

export function EmployeeListPage() {
  const listState = useListParams();
  const { params, update } = listState;
  const { data, error, isPending, isFetching, refetch } = useEmployeeList(params);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const toggleSort = (field: SortField) => {
    const sortDir = params.sortBy === field && params.sortDir === 'asc' ? 'desc' : 'asc';
    update({ sortBy: field, sortDir });
  };

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h2">
            Employees
          </Typography>
          <Typography color="text.secondary">
            {data ? `${data.total.toLocaleString()} matching employees` : ' '}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          Add employee
        </Button>
      </Stack>

      <EmployeeFilters {...listState} />

      {params.sortBy === 'salary' && !params.country && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Salaries are in each country&apos;s local currency. Filter by a country to compare them
          fairly.
        </Alert>
      )}

      {error && !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <LoadingState label="Loading employees…" />
      ) : (
        <Paper variant="outlined">
          <Box sx={{ height: 4 }}>{isFetching && <LinearProgress />}</Box>
          <TableContainer>
            <Table size="small" aria-label="Employees">
              <TableHead>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableCell key={column.field} align={column.align}>
                      <TableSortLabel
                        active={params.sortBy === column.field}
                        direction={params.sortBy === column.field ? params.sortDir : 'asc'}
                        onClick={() => toggleSort(column.field)}
                      >
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    onOpen={() => navigate(`/employees/${employee.id}`)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data.total === 0 ? (
            <EmptyState
              title="No employees match these filters"
              hint="Try a different search or clear the filters."
            />
          ) : (
            <TablePagination
              component="div"
              count={data.total}
              page={params.page - 1}
              rowsPerPage={params.pageSize}
              rowsPerPageOptions={PAGE_SIZES}
              onPageChange={(_event, page) => update({ page: String(page + 1) })}
              onRowsPerPageChange={(event) => update({ pageSize: event.target.value })}
            />
          )}
        </Paper>
      )}

      <EmployeeFormDialog
        mode="create"
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(employee) => navigate(`/employees/${employee.id}`)}
      />
    </>
  );
}

function EmployeeRow({ employee, onOpen }: { employee: Employee; onOpen: () => void }) {
  return (
    <TableRow hover onClick={onOpen} sx={{ cursor: 'pointer' }}>
      <TableCell sx={{ fontFamily: 'monospace' }}>{employee.employeeCode}</TableCell>
      <TableCell>
        <RouterLink
          to={`/employees/${employee.id}`}
          onClick={(event) => event.stopPropagation()}
          style={{ color: 'inherit', fontWeight: 500 }}
        >
          {employee.fullName}
        </RouterLink>
        <Typography variant="body2" color="text.secondary">
          {employee.email}
        </Typography>
      </TableCell>
      <TableCell>{employee.jobTitle}</TableCell>
      <TableCell>{employee.department}</TableCell>
      <TableCell>{employee.country}</TableCell>
      <TableCell>{formatDate(employee.hireDate)}</TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(employee.salary, employee.currency)}
      </TableCell>
      <TableCell>
        <StatusChip status={employee.status} />
      </TableCell>
    </TableRow>
  );
}
