import { Card, CardContent, CardHeader, Skeleton } from '@mui/material';
import { lazy, Suspense, type ComponentType } from 'react';
import type { ComponentProps } from 'react';
import type { DashboardCharts } from './chartModule';

/**
 * Deferred chart loading.
 *
 * ECharts is around 186 kB gzipped. The dashboard is the admin's landing route
 * and is therefore imported statically by the router, which made the charting
 * library a static dependency of the entry chunk: every session downloaded it
 * before rendering anything, including the sign-in screen, which draws no
 * charts at all.
 *
 * Splitting here rather than making the whole dashboard route lazy keeps the
 * page itself in the entry bundle, so the KPI cards, the recent orders list and
 * the low-stock list paint on the first frame while the four charts stream in
 * behind their own placeholders. All four resolve the same module, so the
 * browser fetches one chunk, once.
 */
const load = <K extends keyof DashboardCharts>(name: K) =>
  lazy(async () => {
    const module = await import('./DashboardCharts');
    return { default: module[name] as ComponentType<ComponentProps<DashboardCharts[K]>> };
  });

const SalesTrend = load('SalesTrendChart');
const TopProducts = load('TopProductsChart');
const OrderStatus = load('OrderStatusChart');
const CategoryDistribution = load('CategoryDistributionChart');

/** Placeholder with the same footprint as a chart card, so nothing reflows. */
function ChartFallback() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={<Skeleton width="40%" height={22} />} sx={{ pb: 0 }} />
      <CardContent>
        <Skeleton variant="rectangular" height={320} />
      </CardContent>
    </Card>
  );
}

function withFallback<P extends object>(Component: ComponentType<P>) {
  return function LazyChart(props: P) {
    return (
      <Suspense fallback={<ChartFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

export const SalesTrendChart = withFallback(SalesTrend);
export const TopProductsChart = withFallback(TopProducts);
export const OrderStatusChart = withFallback(OrderStatus);
export const CategoryDistributionChart = withFallback(CategoryDistribution);
