import { OASChart } from './oas-chart.js'

if (!customElements.get('oas-chart')) {
  customElements.define('oas-chart', OASChart)
}

export { OASChart }
export type { ChartType, ChartDatum, ChartSeries, ChartData, ChartOptions } from './oas-chart.js'
