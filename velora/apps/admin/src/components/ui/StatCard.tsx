import { Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface StatCardProps {
  label: string;
  value: string;
  /** Percentage change vs. the previous period; sign drives the colour. */
  delta?: number;
  deltaLabel?: string;
  hint?: string;
  icon?: ReactNode;
  accent?: 'neutral' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

const ACCENTS: Record<NonNullable<StatCardProps['accent']>, string> = {
  neutral: 'bg-ink-900/5 text-ink-700',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-tan-100 text-tan-600',
  danger: 'bg-danger-100 text-danger-600',
};

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  hint,
  icon,
  accent = 'neutral',
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton width="55%" height={14} />
          <Skeleton width="75%" height={34} sx={{ mt: 1 }} />
          <Skeleton width="40%" height={14} sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    );
  }

  const positive = (delta ?? 0) >= 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
          <div className="min-w-0">
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: 11 }}>
              {label}
            </Typography>

            <Typography variant="h3" sx={{ mt: 0.5, fontSize: 26, letterSpacing: '-0.02em' }}>
              {value}
            </Typography>
          </div>

          {icon && (
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded', ACCENTS[accent])}>
              {icon}
            </span>
          )}
        </Stack>

        {(delta != null || hint) && (
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1.25 }}>
            {delta != null && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  positive ? 'text-success-500' : 'text-danger-500',
                )}
              >
                {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {positive ? '+' : ''}
                {delta.toFixed(1)}%
              </span>
            )}

            <Typography variant="caption" color="text.secondary">
              {deltaLabel ?? hint}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
