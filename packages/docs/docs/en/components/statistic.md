# Statistic

Displays statistical values with `Intl.NumberFormat` thousands separators and precision (locale-aware), supporting prefix/suffix and a skeleton loading placeholder.

## Basic Usage

<DemoBlock title="Basic value">
  <oas-statistic value="1128"></oas-statistic>
</DemoBlock>

## Thousands Separator and Precision

<DemoBlock title="Thousands separator + precision">
  <oas-statistic value="1234567.891" precision="2"></oas-statistic>
</DemoBlock>

## Prefix / Suffix

<DemoBlock title="prefix / suffix">
  <oas-statistic value="8846" prefix="¥"></oas-statistic>
  <oas-statistic value="99.9" precision="1" suffix="%"></oas-statistic>
  <oas-statistic value="12" prefix="New this week " suffix=" orders"></oas-statistic>
</DemoBlock>

## Disabling Thousands Separator

<DemoBlock title="group-separator=false">
  <oas-statistic value="1234567" group-separator="false"></oas-statistic>
</DemoBlock>

## Loading State

<DemoBlock title="loading (reuses skeleton)">
  <oas-statistic value="8846" loading></oas-statistic>
</DemoBlock>

## Title and Extra

The `title` attribute (or `slot="title"`) renders a heading above the value; `extra` (attribute or `slot="extra"`) renders supplementary content below the value row (e.g. a trend footnote). `title` is a native global attribute — the component absorbs it after rendering to avoid the browser's native hover tooltip.

<DemoBlock title="title + extra (dashboard card)">
  <oas-statistic title="Total revenue" value="8846132" precision="2" extra="+24% vs yesterday"></oas-statistic>
  <oas-statistic value="99.9" precision="1" suffix="%">
    <span slot="title">Completion</span>
    <span slot="extra">-1.2% week over week</span>
  </oas-statistic>
</DemoBlock>

## Trend Indicator

`trend="up" | "down"` renders a rise/drop arrow before the value, colored by semantic tokens (up `--oas-color-success-text` / down `--oas-color-danger-text`, dark variants included). Override with `--oas-statistic-trend-up-color` / `--oas-statistic-trend-down-color`.

<DemoBlock title="trend up / down">
  <oas-statistic title="Orders today" value="1284" trend="up" extra="+12.5% vs yesterday"></oas-statistic>
  <oas-statistic title="Refund rate" value="2.4" precision="1" suffix="%" trend="down" extra="-0.8% week over week"></oas-statistic>
</DemoBlock>

## Value Animation (compose number-animation)

The component does not build in value animation — compose `oas-number-animation` via `slot="value"` for a rolling entrance:

<DemoBlock title="slot=value + oas-number-animation">
  <oas-statistic title="Total users">
    <oas-number-animation slot="value" value="128653" duration="2000" group-separator="true"></oas-number-animation>
  </oas-statistic>
</DemoBlock>

## Font Size

Font size is fixed at `--oas-font-size-lg` (16px) by default and does not follow the outer context; override with the CSS variable `--oas-statistic-font` (e.g. `32px`).

## Complex Prefix / Suffix (slot distribution)

<DemoBlock title="slot=prefix / slot=suffix">
  <oas-statistic value="8846">
    <oas-tag slot="prefix" type="primary">Total income</oas-tag>
  </oas-statistic>
  <oas-statistic value="99.9" precision="1">
    <span slot="suffix">completion</span>
  </oas-statistic>
</DemoBlock>

Use the `prefix` / `suffix` attributes for simple text; for complex content (icons/tags/badges etc.) distribute via the same-named `slot="prefix"` / `slot="suffix"` slots — distributed content natively replaces the attribute text.

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `extra` | Supplementary content below the value row (trend footnote etc.) | `string` | — |
| `group-separator` | Thousands grouping (`"false"` disables) | `string` | `true` |
| `loading` | Loading state (skeleton placeholder) | `boolean` | — |
| `precision` | Decimal places (rounded) | `string` | `0` |
| `prefix` | Prefix / suffix text | `string` | — |
| `suffix` | Prefix / suffix text | — | — |
| `title` | Heading above the value (native global attribute, absorbed after rendering) | `string` | — |
| `trend` | Trend indicator: `up` (rise, success semantic color) / `down` (drop, danger semantic color) with arrow | `string` | — |
| `value` | Numeric value (number string) | `string` | `0` |

### Slots

| Name | Description |
| --- | --- |
| `extra` | Supplementary content below the value row (distributed content takes precedence over the `extra` attribute text) |
| `prefix` | Leading content (icons/tags etc.; distributed content takes precedence over the `prefix` attribute text). For simple text use the `prefix` attribute |
| `suffix` | Trailing content (icons/tags etc.; distributed content takes precedence over the `suffix` attribute text). For simple text use the `suffix` attribute |
| `title` | Heading above the value (distributed content takes precedence over the `title` attribute text) |
| `value` | Custom value rendering (e.g. compose `oas-number-animation` for an animated value); when distributed, the Intl-formatted text is not rendered |

No events (purely presentational).
