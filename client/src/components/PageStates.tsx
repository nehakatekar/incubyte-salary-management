import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { errorMessage } from '../api/client';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box
      role="status"
      sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6, justifyContent: 'center' }}
    >
      <CircularProgress size={24} />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="subtitle1">{title}</Typography>
      {hint && <Typography color="text.secondary">{hint}</Typography>}
    </Box>
  );
}
