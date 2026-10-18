import {
  Box,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState, LoadingState } from '../../components/PageStates';
import { useFilterValues } from '../../hooks/useEmployees';
import {
  useCountryInsights,
  useDepartmentInsights,
  useInsightsSummary,
  useJobTitleInsights,
  useRecentChanges,
  useSalaryDistribution,
} from '../../hooks/useInsights';
import { formatCompactMoney } from '../../lib/format';
import { DepartmentCostChart } from './DepartmentCostChart';
import {
  CountryTable,
  DistributionTable,
  JobTitleTable,
  RecentChangesTable,
} from './InsightTables';
import { SalaryDistributionChart } from './SalaryDistributionChart';
import { StatTile } from './StatTile';

export function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const country = searchParams.get('country') ?? undefined;
  const setCountry = (value: string) =>
    setSearchParams(value ? { country: value } : {}, { replace: true });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h2">
          Pay insights
        </Typography>
        <Typography color="text.secondary">
          Active employees only. Cross-country figures are converted to USD at fixed reference
          rates.
        </Typography>
      </Box>

      <SummaryTiles />

      <Section title="Pay by country" subtitle="Min, median and max in local currency">
        <QueryContent query={useCountryInsights()}>
          {(rows) => <CountryTable rows={rows} />}
        </QueryContent>
      </Section>

      <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Section title="Annual pay cost by department" subtitle="USD, largest first">
            <QueryContent query={useDepartmentInsights()}>
              {(data) => <DepartmentCostChart data={data} />}
            </QueryContent>
          </Section>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Section title="Recent salary changes" subtitle="Latest 10 across the organisation">
            <QueryContent query={useRecentChanges()}>
              {(rows) => <RecentChangesTable rows={rows} />}
            </QueryContent>
          </Section>
        </Grid>
      </Grid>

      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Box>
            <Typography variant="h6" component="h3">
              Explore pay
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {country
                ? `${country}, in local currency`
                : 'Whole organisation in USD. Pick a country to see its local pay bands.'}
            </Typography>
          </Box>
          <CountrySelect value={country} onChange={setCountry} />
        </Stack>
        <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <DistributionSection country={country} />
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Section
              title="Pay range by job title"
              subtitle="Dot marks the median; bar spans min to max"
            >
              <QueryContent query={useJobTitleInsights(country)}>
                {(data) => <JobTitleTable data={data} />}
              </QueryContent>
            </Section>
          </Grid>
        </Grid>
      </Box>
    </Stack>
  );
}

function SummaryTiles() {
  const query = useInsightsSummary();
  return (
    <QueryContent query={query}>
      {(summary) => {
        const usd = (value: number | null) =>
          value === null ? '–' : formatCompactMoney(value, 'USD');
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile
                label="Active employees"
                value={summary.headcount.toLocaleString()}
                caption={`${summary.countries} countries · ${summary.departments} departments`}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile
                label="Annual pay cost"
                value={usd(summary.totalAnnualCost)}
                caption="Base salary, USD"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile
                label="Median salary"
                value={usd(summary.medianSalary)}
                caption="Half earn more, half less"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile
                label="Average salary"
                value={usd(summary.averageSalary)}
                caption="Pulled up by senior pay"
              />
            </Grid>
          </Grid>
        );
      }}
    </QueryContent>
  );
}

function DistributionSection({ country }: { country?: string }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const toggle = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={view}
      onChange={(_event, next) => next && setView(next)}
      aria-label="Distribution view"
    >
      <ToggleButton value="chart">Chart</ToggleButton>
      <ToggleButton value="table">Table</ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <Section title="Salary distribution" subtitle="Employees per salary band" action={toggle}>
      <QueryContent query={useSalaryDistribution(country)}>
        {(data) =>
          view === 'chart' ? (
            <SalaryDistributionChart data={data} />
          ) : (
            <DistributionTable data={data} />
          )
        }
      </QueryContent>
    </Section>
  );
}

function CountrySelect({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const { data } = useFilterValues();
  return (
    <TextField
      select
      size="small"
      label="Country"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 220 }}
    >
      <MenuItem value="">All countries (USD)</MenuItem>
      {(data?.supportedCountries ?? []).map((c) => (
        <MenuItem key={c.name} value={c.name}>
          {c.name} ({c.currency})
        </MenuItem>
      ))}
    </TextField>
  );
}

interface SectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

function Section({ title, subtitle, action, children }: SectionProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}
        >
          <Box>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Loading and error handling for one query. While a new slice loads, the
 * previous render stays on screen at reduced opacity instead of flashing.
 */
function QueryContent<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.data !== undefined) {
    return (
      <Box sx={{ opacity: query.isPlaceholderData ? 0.5 : 1, transition: 'opacity 150ms' }}>
        {children(query.data)}
      </Box>
    );
  }
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <LoadingState />;
}
