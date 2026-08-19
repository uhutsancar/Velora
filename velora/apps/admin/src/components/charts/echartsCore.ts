import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LabelLayout, UniversalTransition } from 'echarts/features';

/**
 * Tree-shaken ECharts build.
 *
 * Importing the `echarts` barrel pulls every chart type, renderer and component
 * into the bundle (~350 kB gzip). Registering only what the dashboard actually
 * draws cuts that by roughly two thirds. Add a `use([...])` entry here whenever
 * a new chart type is introduced.
 */
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);

export { echarts };
