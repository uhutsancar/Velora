import type * as DashboardChartModule from './DashboardCharts';

/**
 * The chart module's shape, as a type only.
 *
 * LazyCharts needs to name each chart's props to stay type-safe, but importing
 * the module for its values would defeat the whole point of loading it lazily.
 * `import type` is erased at build time, so this reference costs nothing at
 * runtime while still failing the build if a chart is renamed or its props
 * change.
 */
export type DashboardCharts = typeof DashboardChartModule;
