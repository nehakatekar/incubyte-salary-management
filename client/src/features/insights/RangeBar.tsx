import { Box } from '@mui/material';
import { CHART } from './chartTheme';

interface Props {
  min: number;
  median: number;
  max: number;
  /** Upper end of the shared scale, so rows are comparable with each other. */
  scaleMax: number;
}

/**
 * Min–max span with a median dot, on a scale shared by every row. Decorative:
 * the same numbers are in the neighbouring table cells.
 */
export function RangeBar({ min, median, max, scaleMax }: Props) {
  const pct = (value: number) => `${(value / scaleMax) * 100}%`;

  return (
    <Box aria-hidden sx={{ position: 'relative', height: 16, minWidth: 140 }}>
      <Box
        sx={{
          position: 'absolute',
          top: 7,
          left: 0,
          right: 0,
          height: 2,
          bgcolor: CHART.track,
          borderRadius: 1,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 6,
          left: pct(min),
          width: `calc(${pct(max)} - ${pct(min)})`,
          minWidth: 2,
          height: 4,
          bgcolor: CHART.series,
          opacity: 0.35,
          borderRadius: 2,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 2,
          left: `calc(${pct(median)} - 6px)`,
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: CHART.series,
          border: `2px solid ${CHART.surface}`,
        }}
      />
    </Box>
  );
}
