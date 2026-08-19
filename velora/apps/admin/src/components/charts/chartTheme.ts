import type { EChartsOption } from 'echarts';

/**
 * Shared ECharts styling so every chart in the panel reads as one system.
 *
 * The palette is ordered by perceptual distinctness, not by hue rotation, so a
 * series stays identifiable even when three of them overlap.
 */
export const CHART_COLORS = {
  primary: '#12100E',
  accent: '#B87A3F',
  accentSoft: '#D9B486',
  success: '#3F5A46',
  danger: '#7A2E3C',
  info: '#5E5850',
  muted: '#B0AAA0',
} as const;

export const CATEGORICAL_PALETTE = [
  '#12100E',
  '#B87A3F',
  '#3F5A46',
  '#7A2E3C',
  '#5E5850',
  '#D9B486',
  '#847D72',
  '#243D30',
] as const;

/** Status id to colour, so a status keeps the same colour across every chart. */
export const ORDER_STATUS_COLORS: Record<number, string> = {
  1: '#B0AAA0',
  2: '#D9B486',
  3: '#B87A3F',
  4: '#3F5A46',
  5: '#243D30',
  6: '#7A2E3C',
};

const AXIS_LABEL = {
  color: '#847D72',
  fontSize: 11,
  fontFamily: 'Inter, system-ui, sans-serif',
};

/** Base options every chart spreads over its own configuration. */
export const baseChartOption: EChartsOption = {
  textStyle: { fontFamily: 'Inter, system-ui, sans-serif' },
  grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#12100E',
    borderWidth: 0,
    padding: [8, 12],
    textStyle: { color: '#F7F4EF', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#D2CEC7' } },
  },
  xAxis: {
    type: 'category',
    axisLine: { lineStyle: { color: '#E9E7E3' } },
    axisTick: { show: false },
    axisLabel: AXIS_LABEL,
  },
  yAxis: {
    type: 'value',
    // Only horizontal guides: vertical ones add ink without adding meaning.
    splitLine: { lineStyle: { color: '#F1F0EE' } },
    axisLine: { show: false },
    axisLabel: AXIS_LABEL,
  },
};

/** Compact axis formatter: 12.500 -> 12,5B */
export function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}Mn`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}B`;

  return String(value);
}
