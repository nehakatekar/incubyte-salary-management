import { Box } from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SalaryRevision } from '../../api/types';
import {
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatPercent,
  percentChange,
  todayIso,
} from '../../lib/format';
import { ChartTooltip } from '../../components/charts/ChartTooltip';
import { AXIS_TICK, CHART } from '../../components/charts/chartTheme';

interface Point {
  time: number;
  salary: number;
  revision: SalaryRevision;
  /** The extension to today: no marker, since nothing changed on that day. */
  isToday?: boolean;
}

/**
 * Round y-axis ticks from ~85% of the lowest salary to just above the highest,
 * so a modest raise reads as modest rather than as a cliff.
 */
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const monthYear = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Years for long histories; month and year when years alone would repeat. */
export function timeTickFormatter(from: number, to: number): (time: number) => string {
  return to - from > 3 * YEAR_MS
    ? (time) => String(new Date(time).getUTCFullYear())
    : (time) => monthYear.format(new Date(time));
}

export function salaryAxisTicks(min: number, max: number, targetCount = 4): number[] {
  const low = min * 0.85;
  const raw = (max - low) / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  const ticks = [Math.floor(low / step) * step];
  while (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! + step);
  return ticks;
}

/**
 * Salary over time as a step line: pay holds until the next change. One series,
 * so no legend; the accessible label states the overall trend, and every value
 * is also in the history table below.
 */
export function SalaryTrendChart({
  revisions,
  currency,
}: {
  revisions: SalaryRevision[];
  currency: string;
}) {
  // The API returns newest first; the chart reads left to right in time.
  const changesOverTime: Point[] = [...revisions].reverse().map((revision) => ({
    time: Date.parse(`${revision.effectiveDate}T00:00:00Z`),
    salary: revision.newSalary,
    revision,
  }));
  const first = changesOverTime[0];
  const last = changesOverTime.at(-1);
  if (!first || !last || changesOverTime.length < 2) return null;

  // The latest salary still applies today, so the line runs on to now.
  const today = Date.parse(`${todayIso()}T00:00:00Z`);
  const points =
    today > last.time
      ? [...changesOverTime, { ...last, time: today, isToday: true }]
      : changesOverTime;

  const salaries = changesOverTime.map((point) => point.salary);
  const ticks = salaryAxisTicks(Math.min(...salaries), Math.max(...salaries));
  const changes = changesOverTime.length - 1;
  const summary = `Salary went from ${formatMoney(first.salary, currency)} to ${formatMoney(last.salary, currency)} (${formatPercent(percentChange(first.salary, last.salary))}) over ${changes} ${changes === 1 ? 'change' : 'changes'}`;
  const timeTick = timeTickFormatter(first.time, points.at(-1)!.time);

  return (
    <Box role="img" aria-label={summary} sx={{ mb: 2 }}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={points} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={timeTick}
            tick={AXIS_TICK}
            axisLine={{ stroke: CHART.axis }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompactMoney(value, currency)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={64}
            ticks={ticks}
            domain={[ticks[0]!, ticks.at(-1)!]}
          />
          <Tooltip
            cursor={{ stroke: CHART.axis }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined;
              if (!active || !point) return null;
              const { previousSalary, newSalary, effectiveDate, reason } = point.revision;
              if (point.isToday) {
                return (
                  <ChartTooltip
                    value={formatMoney(newSalary, currency)}
                    label="Today"
                    detail={`Unchanged since ${formatDate(effectiveDate)}`}
                  />
                );
              }
              const change =
                previousSalary === null
                  ? 'Starting salary'
                  : `${formatPercent(percentChange(previousSalary, newSalary))} · ${reason}`;
              return (
                <ChartTooltip
                  value={formatMoney(newSalary, currency)}
                  label={formatDate(effectiveDate)}
                  detail={change}
                />
              );
            }}
          />
          <Line
            type="stepAfter"
            dataKey="salary"
            stroke={CHART.series}
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: Point }) =>
              props.payload?.isToday ? (
                <g key={props.index} />
              ) : (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill={CHART.series}
                  stroke={CHART.surface}
                  strokeWidth={2}
                />
              )
            }
            activeDot={{ r: 6, fill: CHART.series, stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
