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

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `group-separator` | Thousands grouping (`"false"` disables) | — | `true` |
| `loading` | Loading state (skeleton placeholder) | — | — |
| `precision` | Decimal places (rounded) | — | `0` |
| `prefix` | Prefix / suffix text | `string` | — |
| `suffix` | Prefix / suffix text | — | — |
| `value` | Numeric value (number string) | — | `0` |

No events (purely presentational).
