import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../api/client';
import type { Employee } from '../../api/types';
import { useNotify } from '../../components/Notifications';
import { useChangeSalary } from '../../hooks/useEmployees';
import { formatDate, formatMoney, formatPercent, percentChange, todayIso } from '../../lib/format';

/** Changes bigger than this need an explicit "I've checked" confirmation (ADR-007). */
export const LARGE_CHANGE_THRESHOLD = 0.3;
const REASONS = ['Annual review', 'Promotion', 'Market adjustment', 'Role change', 'Correction'];

interface Props {
  employee: Employee;
  open: boolean;
  onClose: () => void;
}

export function ChangeSalaryDialog({ employee, open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open && <ChangeSalaryForm employee={employee} onClose={onClose} />}
    </Dialog>
  );
}

function ChangeSalaryForm({ employee, onClose }: Omit<Props, 'open'>) {
  const changeSalary = useChangeSalary(employee.id);
  const notify = useNotify();
  const today = todayIso();

  const [salaryText, setSalaryText] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [reason, setReason] = useState('');
  const [confirmedLargeChange, setConfirmedLargeChange] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const newSalary = Number(salaryText);
  const hasAmount = salaryText !== '' && Number.isInteger(newSalary) && newSalary > 0;
  const change = hasAmount ? percentChange(employee.salary, newSalary) : 0;
  const isLargeChange = Math.abs(change) > LARGE_CHANGE_THRESHOLD;

  const errors = {
    salary: !hasAmount
      ? 'Enter a positive whole number'
      : newSalary === employee.salary
        ? 'New salary is the same as the current salary'
        : undefined,
    effectiveDate: !effectiveDate
      ? 'Effective date is required'
      : effectiveDate < employee.salaryEffectiveDate
        ? `Must be on or after ${formatDate(employee.salaryEffectiveDate)}, when the current salary took effect`
        : effectiveDate > today
          ? 'Cannot be in the future'
          : undefined,
    reason: reason.trim() ? undefined : 'Reason is required',
  };
  const isValid = !errors.salary && !errors.effectiveDate && !errors.reason;
  const show = (message: string | undefined) => (submitted ? message : undefined);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isValid || (isLargeChange && !confirmedLargeChange)) return;

    await changeSalary.mutateAsync({ salary: newSalary, effectiveDate, reason: reason.trim() });
    notify(`Salary updated to ${formatMoney(newSalary, employee.currency)}`);
    onClose();
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event).catch(() => {})}>
      <DialogTitle>Change salary for {employee.fullName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {changeSalary.error && <Alert severity="error">{errorMessage(changeSalary.error)}</Alert>}
          <Typography color="text.secondary">
            Current salary: <strong>{formatMoney(employee.salary, employee.currency)}</strong> since{' '}
            {formatDate(employee.salaryEffectiveDate)}
          </Typography>
          <TextField
            label="New annual base salary"
            type="number"
            value={salaryText}
            onChange={(e) => {
              setSalaryText(e.target.value);
              setConfirmedLargeChange(false);
            }}
            error={!!show(errors.salary)}
            helperText={show(errors.salary)}
            required
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">{employee.currency}</InputAdornment>
                ),
              },
              htmlInput: { min: 1, step: 100 },
            }}
          />
          {hasAmount && newSalary !== employee.salary && (
            <Box
              data-testid="salary-preview"
              sx={{ px: 1.5, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}
            >
              {formatMoney(employee.salary, employee.currency)} →{' '}
              {formatMoney(newSalary, employee.currency)}{' '}
              <Typography
                component="span"
                sx={{ fontWeight: 600, color: change > 0 ? 'success.main' : 'error.main' }}
              >
                ({formatPercent(change)})
              </Typography>
            </Box>
          )}
          {hasAmount && isLargeChange && (
            <Alert severity="warning">
              This is a {formatPercent(change)} change. Please double-check the amount before
              saving.
              <FormControlLabel
                sx={{ display: 'flex', mt: 1 }}
                control={
                  <Checkbox
                    checked={confirmedLargeChange}
                    onChange={(e) => setConfirmedLargeChange(e.target.checked)}
                  />
                }
                label="I have checked this amount is correct"
              />
            </Alert>
          )}
          <TextField
            label="Effective date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            error={!!show(errors.effectiveDate)}
            helperText={show(errors.effectiveDate)}
            required
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: employee.salaryEffectiveDate, max: today },
            }}
          />
          <Autocomplete
            freeSolo
            options={REASONS}
            inputValue={reason}
            onInputChange={(_event, text) => setReason(text)}
            renderInput={(input) => (
              <TextField
                {...input}
                label="Reason"
                required
                error={!!show(errors.reason)}
                helperText={show(errors.reason) ?? 'Recorded in the salary history'}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          loading={changeSalary.isPending}
          disabled={submitted && (!isValid || (isLargeChange && !confirmedLargeChange))}
        >
          Save salary
        </Button>
      </DialogActions>
    </form>
  );
}
