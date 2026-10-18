/**
 * Chart tokens (dataviz reference palette). Every chart here is a single
 * series, so it uses categorical slot 1 only; validated against the white
 * card surface with the palette validator (all checks pass).
 */
export const CHART = {
  series: '#2a78d6',
  surface: '#ffffff',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  track: '#e1e0d9',
} as const;

export const AXIS_TICK = { fill: CHART.muted, fontSize: 12 };
