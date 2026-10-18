import { Box, Typography } from '@mui/material';
import { CHART } from './chartTheme';

/** Value leads (strong), label follows (secondary), keyed by a short line in the series color. */
export function ChartTooltip({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail?: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(11,11,11,0.10)',
        borderRadius: 1,
        boxShadow: 2,
        px: 1.5,
        py: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 2, bgcolor: CHART.series, borderRadius: 1 }} />
        <Typography sx={{ fontWeight: 600, color: CHART.textPrimary }}>{value}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: CHART.textSecondary }}>
        {label}
      </Typography>
      {detail && (
        <Typography variant="body2" sx={{ color: CHART.muted }}>
          {detail}
        </Typography>
      )}
    </Box>
  );
}
