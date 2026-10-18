import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
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
  const searchInput = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300);
  // The search this box last wrote to the URL, to tell its own updates from outside ones.
  const pushedSearch = useRef(params.search ?? '');

  const pushSearch = (search: string) => {
    pushedSearch.current = search;
    update({ search: search || undefined });
  };

  useEffect(() => {
    if (debouncedSearch !== pushedSearch.current) pushSearch(debouncedSearch);
    // Only react to the user's typing; outside URL changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // The URL changed from elsewhere (nav link, back button): show what it now says.
  const urlSearch = params.search ?? '';
  useEffect(() => {
    if (urlSearch !== pushedSearch.current) {
      pushedSearch.current = urlSearch;
      setSearchText(urlSearch);
    }
  }, [urlSearch]);

  const handleClear = () => {
    setSearchText('');
    pushedSearch.current = '';
    clearFilters();
  };

  /** Clears immediately (no debounce wait) and keeps the cursor in the box for the next search. */
  const clearSearch = () => {
    setSearchText('');
    pushSearch('');
    searchInput.current?.focus();
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      <TextField
        label="Search"
        placeholder="Name, email or employee code"
        size="small"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && searchText) clearSearch();
        }}
        inputRef={searchInput}
        sx={{ minWidth: 280, flex: 1 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchText && (
              <InputAdornment position="end">
                <Tooltip title="Clear search (Esc)">
                  <IconButton
                    aria-label="Clear search"
                    size="small"
                    edge="end"
                    onClick={clearSearch}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
      <ChoiceFilter
        label="Country"
        value={params.country}
        options={options?.countries ?? []}
        onChange={(country) => update({ country })}
      />
      <ChoiceFilter
        label="Department"
        value={params.department}
        options={options?.departments ?? []}
        onChange={(department) => update({ department })}
        minWidth={230}
      />
      <ChoiceFilter
        label="Job title"
        value={params.jobTitle}
        options={options?.jobTitles ?? []}
        onChange={(jobTitle) => update({ jobTitle })}
        minWidth={220}
      />
      <TextField
        select
        label="Status"
        size="small"
        value={statusFilter}
        onChange={(event) => update({ status: event.target.value })}
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

interface ChoiceFilterProps {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string | undefined) => void;
  minWidth?: number;
}

/**
 * A pick-one filter with type-to-find and a clear (×) button. Empty means "all".
 * The clear button stays visible whenever a value is set, not only on hover, so
 * it is obvious how to remove the filter.
 */
function ChoiceFilter({ label, value, options, onChange, minWidth = 190 }: ChoiceFilterProps) {
  return (
    <Autocomplete
      size="small"
      options={options}
      value={value ?? null}
      onChange={(_event, choice) => onChange(choice ?? undefined)}
      clearText={`Clear ${label.toLowerCase()}`}
      renderInput={(input) => <TextField {...input} label={label} placeholder="All" />}
      sx={{ minWidth, '& .MuiAutocomplete-clearIndicator': { visibility: 'visible' } }}
    />
  );
}
