import SearchIcon from '@mui/icons-material/Search';
import { Autocomplete, Button, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useFilterValues } from '../../hooks/useEmployees';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { useListParams } from './useListParams';

type ListState = ReturnType<typeof useListParams>;

export function EmployeeFilters({
  params,
  statusFilter,
  update,
  clearFilters,
  hasFilters,
}: ListState) {
  const { data: options } = useFilterValues();
  const [searchText, setSearchText] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300);

  useEffect(() => {
    if (debouncedSearch !== (params.search ?? '')) update({ search: debouncedSearch });
    // Only react to the user's typing, not to URL changes made elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleClear = () => {
    setSearchText('');
    clearFilters();
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      <TextField
        label="Search"
        placeholder="Name, email or employee code"
        size="small"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        sx={{ minWidth: 280, flex: 1 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <SelectFilter
        label="Country"
        value={params.country}
        options={options?.countries ?? []}
        onChange={(country) => update({ country })}
      />
      <SelectFilter
        label="Department"
        value={params.department}
        options={options?.departments ?? []}
        onChange={(department) => update({ department })}
      />
      <Autocomplete
        size="small"
        options={options?.jobTitles ?? []}
        value={params.jobTitle ?? null}
        onChange={(_event, jobTitle) => update({ jobTitle: jobTitle ?? undefined })}
        renderInput={(input) => <TextField {...input} label="Job title" />}
        sx={{ minWidth: 220 }}
      />
      <TextField
        select
        label="Status"
        size="small"
        value={statusFilter}
        onChange={(event) =>
          update({ status: event.target.value === 'ACTIVE' ? undefined : event.target.value })
        }
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="ACTIVE">Active</MenuItem>
        <MenuItem value="TERMINATED">Terminated</MenuItem>
        <MenuItem value="ALL">All</MenuItem>
      </TextField>
      {hasFilters && (
        <Button onClick={handleClear} sx={{ whiteSpace: 'nowrap' }}>
          Clear filters
        </Button>
      )}
    </Stack>
  );
}

interface SelectFilterProps {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string | undefined) => void;
}

function SelectFilter({ label, value, options, onChange }: SelectFilterProps) {
  return (
    <TextField
      select
      label={label}
      size="small"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || undefined)}
      sx={{ minWidth: 170 }}
    >
      <MenuItem value="">
        <em>All</em>
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}
