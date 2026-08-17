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
| `group-separator` | Thousands grouping (`"false"` disables) | `string` | `true` |
| `loading` | Loading state (skeleton placeholder) | `boolean` | — |
| `precision` | Decimal places (rounded) | `string` | `0` |
| `prefix` | Prefix / suffix text | `string` | — |
| `suffix` | Prefix / suffix text | `string` | — |
| `value` | Numeric value (number string) | `string` | `0` |

### Slots

| Name | Description |
| --- | --- |
| `prefix` | Leading content (icons/tags etc.; distributed content takes precedence over the `prefix` attribute text). For simple text use the `prefix` attribute |
| `suffix` | Trailing content (icons/tags etc.; distributed content takes precedence over the `suffix` attribute text). For simple text use the `suffix` attribute |

No events (purely presentational).
