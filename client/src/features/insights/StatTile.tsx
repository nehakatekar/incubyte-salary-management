import { Card, CardContent, Typography } from '@mui/material';

/** Label, then the value (semibold, proportional figures), then context. */
export function StatTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography component="p" sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="body2" color="text.secondary">
            {caption}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
