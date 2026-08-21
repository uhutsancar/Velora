import { Card, CardContent, CardHeader } from '@mui/material';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatCurrency,
  formatDate,
  localeFor,
  type CategoryProductCount,
  type OrderStatusBreakdown,
  type SalesPoint,
  type TopProduct,
} from '@velora/shared';
import { env } from '@/config/env';
import { echarts } from './echartsCore';
import {
  baseChartOption,
  CATEGORICAL_PALETTE,
  CHART_COLORS,
  compactNumber,
  ORDER_STATUS_COLORS,
} from './chartTheme';

const CHART_HEIGHT = 320;

function ChartCard({
  title,
  subheader,
  children,
}: {
  title: string;
  subheader?: string;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={title}
        subheader={subheader}
        titleTypographyProps={{ variant: 'h5' }}
        subheaderTypographyProps={{ variant: 'caption' }}
        sx={{ pb: 0 }}
      />
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Revenue and order count over time.
 *
 * Two y-axes because the units genuinely differ (currency vs. count) — the
 * alternative would be a revenue line flattening the order series to nothing.
 */
export function SalesTrendChart({ data, loading }: { data: SalesPoint[]; loading?: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);

  const option = useMemo<EChartsOption>(() => {
    const dates = data.map((point) => formatDate(point.date, locale, { day: '2-digit', month: 'short' }));

    return {
      ...baseChartOption,
      legend: {
        data: [t('admin.revenueTrend'), t('admin.orderCount')],
        bottom: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11, color: '#5E5850' },
      },
      grid: { left: 8, right: 8, top: 24, bottom: 40, containLabel: true },
      tooltip: {
        ...baseChartOption.tooltip,
        valueFormatter: undefined,
        formatter: (params: unknown) => {
          const points = params as Array<{ axisValue: string; seriesName: string; value: number; color: string }>;
          if (points.length === 0) return '';

          const rows = points
            .map((point) => {
              const value =
                point.seriesName === t('admin.revenueTrend')
                  ? formatCurrency(point.value, locale, env.currency)
                  : `${point.value}`;

              return `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                        <span style="width:8px;height:8px;background:${point.color};display:inline-block"></span>
                        <span style="flex:1">${point.seriesName}</span>
                        <strong>${value}</strong>
                      </div>`;
            })
            .join('');

          return `<div style="min-width:180px"><strong>${points[0]?.axisValue ?? ''}</strong>${rows}</div>`;
        },
      },
      xAxis: { ...baseChartOption.xAxis, data: dates },
      yAxis: [
        {
          ...baseChartOption.yAxis,
          name: '',
          axisLabel: { color: '#847D72', fontSize: 11, formatter: compactNumber },
        },
        {
          type: 'value',
          splitLine: { show: false },
          axisLine: { show: false },
          axisLabel: { color: '#847D72', fontSize: 11 },
        },
      ],
      series: [
        {
          name: t('admin.revenueTrend'),
          type: 'line',
          smooth: 0.3,
          showSymbol: false,
          lineStyle: { width: 2, color: CHART_COLORS.accent },
          itemStyle: { color: CHART_COLORS.accent },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(184, 122, 63, 0.22)' },
                { offset: 1, color: 'rgba(184, 122, 63, 0)' },
              ],
            },
          },
          data: data.map((point) => point.revenue),
        },
        {
          name: t('admin.orderCount'),
          type: 'bar',
          yAxisIndex: 1,
          barMaxWidth: 14,
          itemStyle: { color: 'rgba(18, 16, 14, 0.18)' },
          data: data.map((point) => point.orders),
        },
      ],
    };
  }, [data, locale, t]);

  return (
    <ChartCard title={t('admin.salesTrend')} subheader={t('admin.daysCount', { count: data.length })}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: CHART_HEIGHT }}
        showLoading={loading}
        opts={{ renderer: 'canvas' }}
        notMerge
      />
    </ChartCard>
  );
}

/** Revenue by product, ranked. Horizontal bars keep long product names readable. */
export function TopProductsChart({ data, loading }: { data: TopProduct[]; loading?: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);

  const option = useMemo<EChartsOption>(() => {
    // ECharts draws the first category at the bottom, so reverse for a top-down ranking.
    const ordered = [...data].reverse();

    return {
      ...baseChartOption,
      grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
      tooltip: {
        ...baseChartOption.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const points = params as Array<{ name: string; value: number }>;
          const point = points[0];
          if (!point) return '';

          const product = ordered.find((item) => item.productName === point.name);

          return `<strong>${point.name}</strong><br/>${formatCurrency(point.value, locale, env.currency)}<br/>${product?.unitsSold ?? 0} adet`;
        },
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F0EE' } },
        axisLabel: { color: '#847D72', fontSize: 11, formatter: compactNumber },
      },
      yAxis: {
        type: 'category',
        data: ordered.map((item) => item.productName),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#5E5850',
          fontSize: 11,
          width: 140,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: { color: CHART_COLORS.primary, borderRadius: [0, 2, 2, 0] },
          data: ordered.map((item) => item.revenue),
        },
      ],
    };
  }, [data, locale]);

  if (!loading && data.length === 0) {
    return (
      <ChartCard title={t('admin.topProducts')}>
        <p className="py-16 text-center text-sm text-ink-400">{t('admin.noSalesPeriod')}</p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t('admin.topProducts')} subheader={t('admin.byRevenue')}>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: CHART_HEIGHT }} showLoading={loading} notMerge />
    </ChartCard>
  );
}

/** Order status mix as a donut, with the total in the middle. */
export function OrderStatusChart({
  data,
  loading,
}: {
  data: OrderStatusBreakdown[];
  loading?: boolean;
}) {
  const { t } = useTranslation();

  const option = useMemo<EChartsOption>(() => {
    const visible = data.filter((item) => item.count > 0);
    const total = visible.reduce((sum, item) => sum + item.count, 0);

    return {
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif' },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#12100E',
        borderWidth: 0,
        textStyle: { color: '#F7F4EF', fontSize: 12 },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#5E5850' },
      },
      series: [
        {
          type: 'pie',
          radius: ['58%', '82%'],
          center: ['36%', '50%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            position: 'center',
            formatter: () => `${total}\n${t('admin.ordersUnit')}`,
            fontSize: 13,
            lineHeight: 18,
            color: '#5E5850',
          },
          emphasis: { label: { show: true, fontSize: 15, fontWeight: 600 } },
          labelLine: { show: false },
          data: visible.map((item) => ({
            name: item.status,
            value: item.count,
            itemStyle: { color: ORDER_STATUS_COLORS[item.statusId] ?? CHART_COLORS.muted },
          })),
        },
      ],
    };
  }, [data, t]);

  return (
    <ChartCard title={t('admin.statusBreakdown')}>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: CHART_HEIGHT }} showLoading={loading} notMerge />
    </ChartCard>
  );
}

/** Catalogue composition: how many products sit in each category. */
export function CategoryDistributionChart({
  data,
  loading,
}: {
  data: CategoryProductCount[];
  loading?: boolean;
}) {
  const { t } = useTranslation();

  const option = useMemo<EChartsOption>(
    () => ({
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif' },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#12100E',
        borderWidth: 0,
        textStyle: { color: '#F7F4EF', fontSize: 12 },
        formatter: `{b}: {c} ${t('admin.productsUnit')} ({d}%)`,
      },
      series: [
        {
          type: 'pie',
          radius: '72%',
          center: ['50%', '50%'],
          data: data.map((item, index) => ({
            name: item.category,
            value: item.count,
            itemStyle: { color: CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length] },
          })),
          label: { fontSize: 11, color: '#5E5850' },
          labelLine: { length: 8, length2: 8 },
        },
      ],
    }),
    [data, t],
  );

  return (
    <ChartCard title={t('admin.productsByCategory')}>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: CHART_HEIGHT }} showLoading={loading} notMerge />
    </ChartCard>
  );
}
