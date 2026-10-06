# Chart

A self-developed SVG chart component (no third-party chart engine) supporting line / bar / pie / area / donut / stacked-bar / radar / polar-area, plus series-level combo and dual axis. Data updates redraw automatically, and animations are disabled under `prefers-reduced-motion`.

## Line Chart

<DemoBlock title="Line chart (default)">
  <div style="width: 100%">
    <oas-chart type="line" data='[{"label":"Jan","value":10},{"label":"Feb","value":20},{"label":"Mar","value":15},{"label":"Apr","value":28},{"label":"May","value":22}]'></oas-chart>
  </div>
</DemoBlock>

The default is `type="line"`. An array `[{label, value}]` is a single series; hovering over a data point shows its value (native `<title>`).

## Bar Chart

<DemoBlock title="Bar chart">
  <div style="width: 100%">
    <oas-chart type="bar" data='[{"label":"Beijing","value":86},{"label":"Shanghai","value":92},{"label":"Guangzhou","value":65},{"label":"Shenzhen","value":78}]'></oas-chart>
  </div>
</DemoBlock>

`type="bar"` renders grouped bars.

## Pie Chart

<DemoBlock title="Pie chart">
  <div style="width: 100%">
    <oas-chart type="pie" data='[{"label":"Marketing","value":40},{"label":"R&D","value":35},{"label":"Operations","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="pie"` renders sectors, with the tooltip showing the percentage.

## Donut Chart

<DemoBlock title="Donut chart">
  <div style="width: 100%">
    <oas-chart type="donut" data='[{"label":"Marketing","value":40},{"label":"R&D","value":35},{"label":"Operations","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="donut"` uses the same data format as the pie chart, with the middle hollowed out into a ring; the tooltip also shows percentages.

## Area Chart

<DemoBlock title="Area chart (smooth + legend)">
  <div style="width: 100%">
    <oas-chart type="area" options='{"smooth":true}' data='{"labels":["Mon","Tue","Wed","Thu","Fri"],"series":[{"name":"Visits","data":[320,302,341,374,390]},{"name":"Downloads","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="area"` fills a semi-transparent area between the line and the baseline (still readable with multiple series overlaid), and supports `options.smooth` for smooth curves.

<DemoBlock title="Area chart (gradient fill)">
  <div style="width: 100%">
    <oas-chart type="area" options='{"smooth":true,"gradient":true}' data='{"labels":["Mon","Tue","Wed","Thu","Fri"],"series":[{"name":"Visits","data":[320,302,341,374,390]},{"name":"Downloads","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

With `options.gradient` (default false), the area fill fades vertically from the series color at the line to transparent at the baseline, keeping the visual focus on the data line.

## Stacked Bar Chart

<DemoBlock title="Stacked bar chart">
  <div style="width: 100%">
    <oas-chart type="stacked-bar" data='{"labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"Online","data":[120,132,101,134]},{"name":"Stores","data":[90,95,110,102]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="stacked-bar"` stacks multiple series from bottom to top into a single bar; the bar height equals the category total, and the y-axis ticks are computed from the totals.

## Radar Chart

<DemoBlock title="Radar chart (radarShape + max scale)">
  <div style="width: 100%">
    <oas-chart type="radar" options='{"max":100}' data='{"labels":["Speed","Stability","Range","Smart","Safety"],"series":[{"name":"Model A","data":[80,92,75,88,95]},{"name":"Model B","data":[90,70,82,79,85]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="radar"` reuses `labels` as dimension names (the same data shape as line/bar, zero migration cost). `options.max` sets a global unified scale (defaults to the series max passed through nice ticks); `options.radarShape` (default `polygon`, concentric polygons) can be set to `circle` for concentric-ring grid. Hovering a vertex shows "dimension: value"; legend and colors match the other chart types.

## Polar Area Chart

<DemoBlock title="Polar area chart (rose)">
  <div style="width: 100%">
    <oas-chart type="polar-area" data='[{"label":"East","value":11},{"label":"South","value":16},{"label":"West","value":7},{"label":"North","value":14}]'></oas-chart>
  </div>
</DemoBlock>

`type="polar-area"` renders equal-angle sectors whose radius encodes the value (the maximum fills the full radius); concentric reference rings provide a radial magnitude cue. Unlike the pie chart's "share" mental model, the tooltip shows the raw value instead of a percentage. Single series takes `series[0]` (same data format as pie/donut).

## Combo Chart

<DemoBlock title="Combo chart (bar + line series-level mixing)">
  <div style="width: 100%">
    <oas-chart type="bar" data='{"labels":["Jan","Feb","Mar","Apr"],"series":[{"name":"Sales","data":[120,132,101,134]},{"name":"Growth","data":[5,12,8,15],"type":"line"}]}'></oas-chart>
  </div>
</DemoBlock>

Combo has **no dedicated type value**: the top-level `type` acts as the default series type, and `series[].type` (`bar` / `line` / `area`) overrides it per series; missing/invalid values fall back to the top-level type. All series share one category axis, and line/area points align to band centers (unlike a pure line chart's endpoint alignment); the draw order is fixed to bar → area → line; colors and legend follow the series declaration order.

## Dual Axis

<DemoBlock title="Dual-axis combo (right axis + alignTicks)">
  <div style="width: 100%">
    <oas-chart type="bar" options='{"yAxis":[{"name":"Sales"},{"name":"Growth"}]}' data='{"labels":["Jan","Feb","Mar","Apr"],"series":[{"name":"Sales","data":[120,132,101,134]},{"name":"Growth","data":[5,12,8,15],"type":"line","yAxisIndex":1}]}'></oas-chart>
  </div>
</DemoBlock>

Dual axis is axis configuration, not a chart type: the right axis renders when a second entry exists in the `options.yAxis` array **AND both sides have series bound via `series[].yAxisIndex`** (`name` is the axis title rendered at the top; if either side has no bound series a single axis is rendered — no empty axis), and `series[].yAxisIndex` (`0` left, default / `1` right) binds each series; it can be combined with line / bar / combo freely. With dual axes, ticks are force-aligned (alignTicks): the secondary axis recomputes its nice ticks anchored to the primary axis' segment count, so left/right tick lines align horizontally — eliminating the misaligned-ticks misreading. Note the two axes have different units, so readings on the same line are **not comparable across axes**. `yAxis` is ignored by stacked-bar / pie-family / radar (single-axis semantics).

## Multiple Series + Legend

<DemoBlock title="Multi-series line (smooth + legend)">
  <div style="width: 100%">
    <oas-chart type="line" options='{"smooth":true}' data='{"labels":["Mon","Tue","Wed","Thu","Fri"],"series":[{"name":"Visits","data":[320,302,341,374,390]},{"name":"Downloads","data":[120,132,101,134,90]}]}'></oas-chart>
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

## Data channel contract

`data` / `options` accept both channels:

- **Attribute channel**: write a JSON string in HTML (e.g. `data='[{...}]'`); the component parses it with `JSON.parse`.
- **Property channel**: assign an object/array from JS (`el.data = [{...}]`), avoiding serialization; the property is parsed in the setter and takes precedence over the attribute.

**Reflection behavior differs (the two components read data differently — follow these rules)**:

- `oas-table`'s `columns` / `data` setters **reflect back to the attribute** — after a property assignment, `getAttribute('columns')` / `getAttribute('data')` read back the corresponding JSON string (attribute and property stay in sync as one source of truth).
- `oas-chart`'s `data` (and `options`) setter **only writes internal state and does not reflect** — after a property assignment the attribute still holds the old/empty value, so **read through the `el.data` property** (the getter returns the last assigned parsed result); do not read back with `getAttribute('data')`.

> Exception: if `oas-table`'s `columns` contain function fields (such as `render`, which JSON serialization would drop), the setter takes a pure in-memory path without reflecting — read those columns via the `el.columns` property.

## API

### oas-chart

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Chart description (falls back to locale by type) | — | — |
| `data` | Data. Array single-series `[{label, value}]` or object multi-series `{labels, series:[{name, data, type?, yAxisIndex?}]}` (series-level `type` / `yAxisIndex` for combo and dual-axis) | `unknown` | — |
| `options` | Config: `smooth` (smoothing), `colors` (series palette), `showLegend`, `gradient` (area-chart vertical gradient fill, default false), `max` (radar global scale), `radarShape` (radar grid `polygon`/`circle`, default polygon), `yAxis` (dual-axis array; dual axis requires the second entry AND series bound on both sides via yAxisIndex, otherwise single axis) | `unknown` | — |
| `type` | Chart type: `line` / `bar` / `pie` / `area` / `donut` / `stacked-bar` / `radar` / `polar-area` (combo has no type value — override per series via `series.type`) | `ChartType` | `line` |

`data` / `options` also support the property channel (JS objects, taking precedence over attributes).

### Boundaries

- Data updates redraw the SVG (same pattern as qrcode), without rebuilding nodes
- Empty / invalid data → empty state placeholder
- Every data point carries a native `<title>` tooltip
- Animations are pure CSS (wrapped in `@media (prefers-reduced-motion: no-preference)`), auto-disabled under reduced-motion, with no JS timers; zero orphaned overlays
- Radar uses one global scale (`options.max` or nice ticks); per-dimension scales are not supported yet — normalize your data first if needed (e.g. a 0–100 score)
- Polar-area renders no sectors when all values are 0 (same as pie); the radius scale tops at the maximum value
- Combo only allows mixing `bar` / `line` / `area` (one cartesian coordinate system); other type values silently fall back to the top-level type
- Series-level `type` / `yAxisIndex` is consumed only by cartesian types (line / bar / area / combo); `stacked-bar` / `pie` / `donut` / `radar` / `polar-area` ignore series-level overrides and always render per the top-level `type`
- Declaring a second `options.yAxis` entry without bindings on both sides (nothing bound right, or everything bound right leaving the left axis empty) renders a single axis — no zero-tick fake axis (unused axis titles included)
- Y-axis tick steps are always integers (nice ceiling, minimum step 1): sub-integer ranges (e.g. 0–0.01) degrade to whole-number steps and all data collapses to the baseline — rescale such data first (e.g. ×100 as percentages)
- Color mapping semantics: the pie family (pie / donut / polar-area) colors by **category**, cartesian types (line / bar / area / stacked-bar / radar / combo) color by **series**; `options.colors` overrides in the same order
- Text inside the chart svg is pinned to `direction: ltr` (coordinate semantics are orthogonal to writing direction): a host `dir=rtl` neither flips text anchors nor mirrors geometry
