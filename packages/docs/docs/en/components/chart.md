# Chart

A self-developed SVG chart component (no third-party chart engine) supporting line / bar / pie / area / donut / stacked-bar. Data updates redraw automatically, and animations are disabled under `prefers-reduced-motion`.

## Line Chart

<DemoBlock title="Line chart (default)">
  <div style="width: 100%">
    <oas-chart type="line" data='[{"label":"一月","value":10},{"label":"二月","value":20},{"label":"三月","value":15},{"label":"四月","value":28},{"label":"五月","value":22}]'></oas-chart>
  </div>
</DemoBlock>

The default is `type="line"`. An array `[{label, value}]` is a single series; hovering over a data point shows its value (native `<title>`).

## Bar Chart

<DemoBlock title="Bar chart">
  <div style="width: 100%">
    <oas-chart type="bar" data='[{"label":"北京","value":86},{"label":"上海","value":92},{"label":"广州","value":65},{"label":"深圳","value":78}]'></oas-chart>
  </div>
</DemoBlock>

`type="bar"` renders grouped bars.

## Pie Chart

<DemoBlock title="Pie chart">
  <div style="width: 100%">
    <oas-chart type="pie" data='[{"label":"市场","value":40},{"label":"研发","value":35},{"label":"运营","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="pie"` renders sectors, with the tooltip showing the percentage.

## Donut Chart

<DemoBlock title="Donut chart">
  <div style="width: 100%">
    <oas-chart type="donut" data='[{"label":"市场","value":40},{"label":"研发","value":35},{"label":"运营","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="donut"` uses the same data format as the pie chart, with the middle hollowed out into a ring; the tooltip also shows percentages.

## Area Chart

<DemoBlock title="Area chart (smooth + legend)">
  <div style="width: 100%">
    <oas-chart type="area" options='{"smooth":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="area"` fills a semi-transparent area between the line and the baseline (still readable with multiple series overlaid), and supports `options.smooth` for smooth curves.

## Stacked Bar Chart

<DemoBlock title="Stacked bar chart">
  <div style="width: 100%">
    <oas-chart type="stacked-bar" data='{"labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"线上","data":[120,132,101,134]},{"name":"门店","data":[90,95,110,102]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="stacked-bar"` stacks multiple series from bottom to top into a single bar; the bar height equals the category total, and the y-axis ticks are computed from the totals.

## Multiple Series + Legend

<DemoBlock title="Multi-series line (smooth + legend)">
  <div style="width: 100%">
    <oas-chart type="line" options='{"smooth":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

The object format `{labels, series:[{name, data}]}` supports multiple series; the legend is shown by default for multiple series, and `options.smooth` enables smooth curves.

## Empty Data

<DemoBlock title="Empty data placeholder">
  <div style="width: 100%">
    <oas-chart data='[]'></oas-chart>
  </div>
</DemoBlock>

No data / invalid JSON shows an empty state placeholder without errors.

## API

### Attributes

| Attribute    | Description                                                         | Type     | Default |
| ------------ | ------------------------------------------------------------------- | -------- | ------- |
| `type`       | Chart type: `line` / `bar` / `pie` / `area` / `donut` / `stacked-bar` | `string` | `line`  |
| `data`       | Data. Array single-series `[{label, value}]` or object multi-series `{labels, series}` | `JSON`   | —       |
| `options`    | Config: `smooth` (smoothing), `colors` (series palette), `showLegend` | `JSON`   | `{}`    |
| `aria-label` | Chart description (falls back to locale by type)                    | `string` | —       |

`data` / `options` also support the property channel (JS objects, taking precedence over attributes).

### Engine Choice (Architecture Decision)

**Self-developed SVG rendering, no third-party chart engine**:

1. **Zero-dependency core selling point**: zero third-party runtime dependencies is a core constraint of the library; self-developed SVG introduces no dependencies.
2. **Six types cover common scenarios**: line/bar/pie/area/donut/stacked-bar cover the vast majority of dashboard/data-display scenarios; complex charts (scatter, composite coordinate systems, complex maps, etc.) are future enhancements, at which point the trade-off of introducing an engine will be re-evaluated.
3. **Consistent styling and theming**: the in-house implementation can use the library's token palette entirely (including dark variants), staying unified with the library's visual language.
4. Animations are pure CSS (wrapped in `@media (prefers-reduced-motion: no-preference)`), auto-disabled under reduced-motion, with no JS timers and zero leaks.

### Boundaries

- Data updates redraw the SVG (same pattern as qrcode), without rebuilding nodes
- Empty / invalid data → empty state placeholder
- Every data point carries a native `<title>` tooltip; zero orphaned overlays
