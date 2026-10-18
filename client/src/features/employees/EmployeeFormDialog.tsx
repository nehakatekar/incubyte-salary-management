import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../api/client';
import type { Employee, EmployeeInput, EmploymentType } from '../../api/types';
import { useNotify } from '../../components/Notifications';
import { useCreateEmployee, useFilterValues, useUpdateEmployee } from '../../hooks/useEmployees';
import { humanize, todayIso } from '../../lib/format';

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormValues = Omit<EmployeeInput, 'salary'> & { salary: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

type Props =
  | { mode: 'create'; open: boolean; onClose: () => void; onSaved: (employee: Employee) => void }
  | {
      mode: 'edit';
      employee: Employee;
      open: boolean;
      onClose: () => void;
      onSaved?: (employee: Employee) => void;
    };

export function EmployeeFormDialog(props: Props) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      {/* Re-mount the form each time it opens so it starts from fresh values. */}
      {props.open && <EmployeeForm {...props} />}
    </Dialog>
  );
}

function EmployeeForm(props: Props) {
  const isEdit = props.mode === 'edit';
  const { data: options } = useFilterValues();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee(isEdit ? props.employee.id : 0);
  const mutation = isEdit ? updateEmployee : createEmployee;
  const notify = useNotify();

  const initial: FormValues = isEdit
    ? { ...props.employee, salary: String(props.employee.salary) }
    : {
        fullName: '',
        email: '',
        jobTitle: '',
        department: '',
        country: '',
        employmentType: 'FULL_TIME',
        hireDate: todayIso(),
        salary: '',
      };
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (field: keyof FormValues) => (value: string) =>
    setValues((v) => ({ ...v, [field]: value }));
  const currency = options?.supportedCountries.find((c) => c.name === values.country)?.currency;
  const editableFields = [
    'fullName',
    'email',
    'jobTitle',
    'department',
    'employmentType',
    'hireDate',
  ] as const;
  const changes = isEdit
    ? Object.fromEntries(
        editableFields.filter((f) => values[f] !== initial[f]).map((f) => [f, values[f].trim()]),
      )
    : {};

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validate(values, isEdit);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const saved = isEdit
      ? await updateEmployee.mutateAsync(changes)
      : await createEmployee.mutateAsync({
          ...trimAll(values),
          employmentType: values.employmentType,
          salary: Number(values.salary),
        });
    notify(
      isEdit ? 'Employee details updated' : `${saved.fullName} added as ${saved.employeeCode}`,
    );
    props.onSaved?.(saved);
    props.onClose();
  };

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event).catch(() => {})}>
      <DialogTitle>{isEdit ? `Edit ${props.employee.fullName}` : 'Add employee'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {mutation.error && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
          <TextField
            label="Full name"
            value={values.fullName}
            onChange={(e) => set('fullName')(e.target.value)}
            error={!!errors.fullName}
            helperText={errors.fullName}
            required
            autoFocus
          />
          <TextField
            label="Work email"
            type="email"
            value={values.email}
            onChange={(e) => set('email')(e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
            required
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FreeTextAutocomplete
              label="Job title"
              value={values.jobTitle}
              options={options?.jobTitles ?? []}
              onChange={set('jobTitle')}
              error={errors.jobTitle}
            />
            <FreeTextAutocomplete
              label="Department"
              value={values.department}
              options={options?.departments ?? []}
              onChange={set('department')}
              error={errors.department}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Employment type"
              value={values.employmentType}
              onChange={(e) => set('employmentType')(e.target.value)}
              fullWidth
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {humanize(type)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Hire date"
              type="date"
              value={values.hireDate}
              onChange={(e) => set('hireDate')(e.target.value)}
              error={!!errors.hireDate}
              helperText={errors.hireDate}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          {!isEdit && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Country"
                value={values.country}
                onChange={(e) => set('country')(e.target.value)}
                error={!!errors.country}
                helperText={errors.country ?? 'Sets the salary currency'}
                fullWidth
                required
              >
                {(options?.supportedCountries ?? []).map((c) => (
                  <MenuItem key={c.name} value={c.name}>
                    {c.name} ({c.currency})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Annual base salary"
                type="number"
                value={values.salary}
                onChange={(e) => set('salary')(e.target.value)}
                error={!!errors.salary}
                helperText={errors.salary ?? 'Whole currency units, before tax'}
                fullWidth
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">{currency ?? '—'}</InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1, step: 100 },
                }}
              />
            </Stack>
          )}
          {isEdit && (
            <Alert severity="info">
              Salary and country have their own workflows: use <strong>Change salary</strong> on the
              employee page.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          loading={mutation.isPending}
          disabled={isEdit && Object.keys(changes).length === 0}
        >
          {isEdit ? 'Save changes' : 'Add employee'}
        </Button>
      </DialogActions>
    </form>
  );
}

interface FreeTextAutocompleteProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
}

/** Suggests existing values but allows new ones (e.g. a brand-new job title). */
function FreeTextAutocomplete({
  label,
  value,
  options,
  onChange,
  error,
}: FreeTextAutocompleteProps) {
  return (
    <Autocomplete
      freeSolo
      fullWidth
      options={options}
      inputValue={value}
      onInputChange={(_event, text) => onChange(text)}
      renderInput={(input) => (
        <TextField {...input} label={label} required error={!!error} helperText={error} />
      )}
    />
  );
}

function validate(values: FormValues, isEdit: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!values.fullName.trim()) errors.fullName = 'Name is required';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address';
  if (!values.jobTitle.trim()) errors.jobTitle = 'Job title is required';
  if (!values.department.trim()) errors.department = 'Department is required';
  if (!values.hireDate) errors.hireDate = 'Hire date is required';
  if (!isEdit) {
    if (!values.country) errors.country = 'Country is required';
    const salary = Number(values.salary);
    if (!Number.isInteger(salary) || salary <= 0) errors.salary = 'Enter a positive whole number';
  }
  return errors;
}

function trimAll(values: FormValues) {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    jobTitle: values.jobTitle.trim(),
    department: values.department.trim(),
    country: values.country,
    hireDate: values.hireDate,
  };
}
