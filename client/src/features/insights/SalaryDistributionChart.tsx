import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SalaryDistribution } from '../../api/insights';
import { formatCompactMoney } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';
import { AXIS_TICK, CHART } from './chartTheme';

/** Histogram of salaries: touching columns separated by a 2px surface gap. */
export function SalaryDistributionChart({ data }: { data: SalaryDistribution }) {
  const money = (value: number) => formatCompactMoney(value, data.currency);
  const bandLabel = (bucket: { from: number; to: number }) =>
    `${money(bucket.from)} – ${money(bucket.to)}`;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data.buckets}
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        barCategoryGap={2}
      >
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="from"
          tickFormatter={money}
          tick={AXIS_TICK}
          axisLine={{ stroke: CHART.axis }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <Tooltip
          cursor={{ fill: 'rgba(42,120,214,0.06)' }}
          content={({ active, payload }) => {
            const bucket = payload?.[0]?.payload as
              SalaryDistribution['buckets'][number] | undefined;
            return active && bucket ? (
              <ChartTooltip
                value={`${bucket.count.toLocaleString()} employees`}
                label={bandLabel(bucket)}
              />
            ) : null;
          }}
        />
        <Bar
          dataKey="count"
          fill={CHART.series}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
