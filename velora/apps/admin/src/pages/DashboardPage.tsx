import { Card, CardContent, CardHeader, Chip, MenuItem, Select, Stack, Typography } from '@mui/material';
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber, localeFor } from '@velora/shared';
import {
  CategoryDistributionChart,
  OrderStatusChart,
  SalesTrendChart,
  TopProductsChart,
} from '@/components/charts/DashboardCharts';
import { ORDER_STATUS_COLORS } from '@/components/charts/chartTheme';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/Feedback';
import { env } from '@/config/env';
import { useGetCatalogStatsQuery } from '@/store/api/catalogAdminApi';
import { useGetDashboardQuery } from '@/store/api/operationsApi';
import { useGetUserStatsQuery } from '@/store/api/operationsApi';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';

const RANGE_OPTIONS = [7, 14, 30, 90] as const;

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);

  const [days, setDays] = useState<number>(30);

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useGetDashboardQuery({ days });

  const { data: catalogStats, isLoading: catalogLoading } = useGetCatalogStatsQuery();
  const { data: userStats } = useGetUserStatsQuery();

  const summary = dashboard?.summary;
  const money = (value: number) => formatCurrency(value, locale, env.currency);

  return (
    <>
      <PageHeader
        title={t('admin.dashboard')}
        description={t('admin.dashboardSubtitle')}
        actions={
          <Select
            value={days}
            size="small"
            onChange={(event) => setDays(Number(event.target.value))}
            aria-label={t('admin.dateRange')}
          >
            {RANGE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {t('admin.lastDays', { count: option })}
              </MenuItem>
            ))}
          </Select>
        }
      />

      {dashboardError ? (
        <ErrorState onRetry={() => void refetchDashboard()} />
      ) : (
        <Stack spacing={3}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t('admin.totalRevenue')}
              value={summary ? money(summary.totalRevenue) : '—'}
              delta={summary?.revenueGrowthPercentage}
              deltaLabel={t('admin.vsLastMonth')}
              icon={<Wallet size={17} />}
              accent="success"
              loading={dashboardLoading}
            />
            <StatCard
              label={t('admin.todayRevenue')}
              value={summary ? money(summary.todayRevenue) : '—'}
              hint={summary ? t('admin.ordersCount', { count: summary.todayOrders }) : undefined}
              icon={<TrendingUp size={17} />}
              loading={dashboardLoading}
            />
            <StatCard
              label={t('admin.orderCount')}
              value={summary ? formatNumber(summary.totalOrders, locale) : '—'}
              hint={summary ? `${summary.pendingOrders} bekleyen` : undefined}
              icon={<ShoppingCart size={17} />}
              accent={summary && summary.pendingOrders > 0 ? 'warning' : 'neutral'}
              loading={dashboardLoading}
            />
            <StatCard
              label={t('admin.averageOrder')}
              value={summary ? money(summary.averageOrderValue) : '—'}
              hint={summary ? t('admin.uniqueCustomersCount', { count: summary.uniqueCustomers }) : undefined}
              icon={<Users size={17} />}
              loading={dashboardLoading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SalesTrendChart data={dashboard?.salesSeries ?? []} loading={dashboardLoading} />
            </div>
            <OrderStatusChart data={dashboard?.statusBreakdown ?? []} loading={dashboardLoading} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t('admin.totalProducts')}
              value={catalogStats ? formatNumber(catalogStats.totalProducts, locale) : '—'}
              hint={catalogStats ? t('admin.publishedCount', { count: catalogStats.publishedProducts }) : undefined}
              icon={<Package size={17} />}
              loading={catalogLoading}
            />
            <StatCard
              label={t('admin.lowStock')}
              value={catalogStats ? formatNumber(catalogStats.lowStockProducts, locale) : '—'}
              hint={catalogStats ? t('admin.outOfStockCount', { count: catalogStats.outOfStockProducts }) : undefined}
              icon={<AlertTriangle size={17} />}
              accent={catalogStats && catalogStats.lowStockProducts > 0 ? 'warning' : 'neutral'}
              loading={catalogLoading}
            />
            <StatCard
              label={t('admin.inventoryValue')}
              value={catalogStats ? formatCompactCurrency(catalogStats.inventoryValue, locale, env.currency) : '—'}
              hint={t('admin.overCost')}
              icon={<Wallet size={17} />}
              loading={catalogLoading}
            />
            <StatCard
              label={t('admin.potentialMargin')}
              value={catalogStats ? formatCompactCurrency(catalogStats.potentialMargin, locale, env.currency) : '—'}
              hint={userStats ? t('admin.newCustomers30', { count: userStats.newUsersLast30Days }) : undefined}
              icon={<TrendingUp size={17} />}
              accent="success"
              loading={catalogLoading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TopProductsChart data={dashboard?.topProducts ?? []} loading={dashboardLoading} />
            <CategoryDistributionChart
              data={catalogStats?.productsByCategory ?? []}
              loading={catalogLoading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title={t('admin.recentOrders')}
               
                action={
                  <Link to="/orders" className="text-sm text-ink-500 underline-offset-4 hover:underline">
                    {t('common.all')}
                  </Link>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                {(dashboard?.recentOrders ?? []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {t('admin.noOrdersPeriod')}
                  </Typography>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {dashboard?.recentOrders.map((order) => (
                      <li key={order.id}>
                        <Link
                          to={`/orders/${order.id}`}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-ink-50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-900">{order.orderNumber}</p>
                            <p className="truncate text-xs text-ink-400">
                              {order.userName ?? 'Misafir'} · {formatDate(order.date, locale)}
                            </p>
                          </div>

                          <Chip
                            label={order.status}
                            size="small"
                            sx={{
                              bgcolor: `${ORDER_STATUS_COLORS[order.statusId] ?? '#B0AAA0'}22`,
                              color: ORDER_STATUS_COLORS[order.statusId] ?? '#5E5850',
                            }}
                          />

                          <span className="shrink-0 text-sm font-medium tabular-nums">
                            {money(order.total)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title={t('admin.lowStock')}
               
                action={
                  <Link
                    to="/products?lowStock=true"
                    className="text-sm text-ink-500 underline-offset-4 hover:underline"
                  >
                    {t('common.all')}
                  </Link>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                {(catalogStats?.lowStockItems ?? []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {t('admin.noCriticalStock')}
                  </Typography>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {catalogStats?.lowStockItems.map((product) => (
                      <li key={product.id}>
                        <Link
                          to={`/products/${product.id}`}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-ink-50"
                        >
                          <img
                            src={mediaUrl(product.primaryImageUrl) ?? PRODUCT_PLACEHOLDER}
                            alt=""
                            loading="lazy"
                            className="h-12 w-10 shrink-0 object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-900">{product.name}</p>
                            <p className="truncate text-xs text-ink-400">{product.brandName}</p>
                          </div>

                          <Chip
                            label={`${product.totalStock} adet`}
                            size="small"
                            color={product.totalStock === 0 ? 'error' : 'warning'}
                            variant="outlined"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </Stack>
      )}
    </>
  );
}
