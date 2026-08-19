import { Alert, Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { isNormalizedApiError } from '@velora/shared';

export function LoadingScreen({ height = '60vh' }: { height?: string | number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
      <CircularProgress size={32} thickness={4} />
    </Box>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Stack spacing={1}>
      <Skeleton variant="rectangular" height={44} />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rectangular" height={52} />
      ))}
    </Stack>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ color: 'text.disabled' }}>{icon ?? <Inbox size={40} />}</Box>
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );
}

/**
 * Renders a failed query consistently.
 * `error` is the NormalizedApiError produced by the shared axios base query.
 */
export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const message = isNormalizedApiError(error)
    ? error.message
    : 'Veriler yüklenemedi. Lütfen tekrar deneyin.';

  return (
    <Alert
      severity="error"
      icon={<AlertTriangle size={20} />}
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Tekrar dene
          </Button>
        )
      }
      sx={{ borderRadius: 1 }}
    >
      {message}
    </Alert>
  );
}
