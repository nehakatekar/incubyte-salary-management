import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router';
import type { DepartmentInsight } from '../../api/insights';
import { formatCompactMoney, formatMoney } from '../../lib/format';
import { employeesUrl } from '../../lib/links';
import { ChartTooltip } from '../../components/charts/ChartTooltip';
import { AXIS_TICK, CHART } from '../../components/charts/chartTheme';

const ROW_HEIGHT = 36;
const PADDING = 8;

/**
 * Annual pay cost per department in USD: one series, sorted largest first.
 * Every bar is labelled at its tip, so the value axis and grid are omitted.
 */
export function DepartmentCostChart({ data }: { data: DepartmentInsight[] }) {
  const usd = (value: number) => formatCompactMoney(value, 'USD');
  const navigate = useNavigate();

  return (
    <ResponsiveContainer width="100%" height={data.length * ROW_HEIGHT + PADDING}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="department"
          width={150}
          tick={{ ...AXIS_TICK, fill: CHART.textSecondary }}
          axisLine={{ stroke: CHART.axis }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(42,120,214,0.06)' }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as DepartmentInsight | undefined;
            return active && row ? (
              <ChartTooltip
                value={formatMoney(row.totalCostUsd, 'USD')}
                label={`${row.department} · annual pay cost`}
                detail={`${row.headcount.toLocaleString()} people · median ${formatMoney(row.medianUsd, 'USD')} · select to see the team`}
              />
            ) : null;
          }}
        />
        <Bar
          dataKey="totalCostUsd"
          fill={CHART.series}
          barSize={20}
          cursor="pointer"
          onClick={(entry) => {
            const department = (entry as { payload?: DepartmentInsight }).payload?.department;
            if (department) navigate(employeesUrl({ department }));
          }}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="totalCostUsd"
            position="right"
            formatter={(v) => usd(Number(v))}
            fill={CHART.textSecondary}
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
