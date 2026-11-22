---
description: "Price display: currency symbol, thousands separators and configurable decimals, with original price, price range and trend arrows. Formatting uses Intl.NumberFormat and all colors come from theme tokens."
---

# Price

Price display with currency symbol, thousands separators and configurable decimals, plus original price (`original`), price range (`min` + `max`) and trend arrows (`trend` + `trend-value`). Formatting uses `Intl.NumberFormat`, and the symbol/number order follows the real Intl part order (so locales such as `de-DE` that place the symbol after the number work correctly).

## Basic usage

`value` is a numeric string and `currency` is an ISO 4217 code (default `CNY`); `original` renders a struck-through original price.

<DemoBlock title="Single value + original price">
  <oas-price value="1299" original="1599"></oas-price>
</DemoBlock>

## Currency and locale

`locale` defaults to the document `<html lang>` and can be overridden; `precision` controls decimals (`0` hides them).

<DemoBlock title="Currencies / locales">
  <oas-price value="1299" currency="USD" locale="en-US"></oas-price>
  <oas-price value="1299" currency="EUR" locale="de-DE"></oas-price>
  <oas-price value="1299.5" precision="0"></oas-price>
</DemoBlock>

## Price range

With both `min` and `max` present and no `value`, a range is rendered (single value wins):

<DemoBlock title="Range">
  <oas-price min="19.9" max="29.9"></oas-price>
</DemoBlock>

## Trend

`trend="up"` / `trend="down"` renders a directional arrow and semantic color; numeric `trend-value` gets a sign and `%`, other text renders as-is. Up defaults to the danger color and down to success (Chinese market convention), both overridable via CSS variables.

<DemoBlock title="Trend">
  <oas-price value="88.8" trend="up" trend-value="12.5"></oas-price>
  <oas-price value="88.8" trend="down" trend-value="3"></oas-price>
  <oas-price value="88.8" trend="up" trend-value="new"></oas-price>
</DemoBlock>

## Size

`size="sm|md|lg"` switches the three-level type scale (default `md`):

<DemoBlock title="Sizes">
  <oas-price value="99" size="sm"></oas-price>
  <oas-price value="99" size="md"></oas-price>
  <oas-price value="99" size="lg"></oas-price>
</DemoBlock>

## API

### oas-price

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `currency` | ISO 4217 currency code, default `CNY`; invalid codes fall back to the default | — | — |
| `locale` | `Intl.NumberFormat` locale; defaults to the document `<html lang>`, then `en` | — | — |
| `max` | Range upper bound (effective with `min` when `value` is absent) | — | — |
| `min` | Range lower bound (effective with `max` when `value` is absent) | — | — |
| `original` | Struck-through original price (rendered as `<s>` with an "Original price" screen-reader prefix) | — | — |
| `precision` | Decimal places (integer 0–20, default 2; invalid values fall back) | — | — |
| `size` | Size step: `sm` / `md` (default) / `lg` | `PriceSize` | — |
| `trend` | Trend direction: `up` / `down`; invalid values render no trend | — | — |
| `trend-value` | Change text (numeric values get a sign and `%`, other text renders as-is) | — | — |
| `value` | Single price (numeric string); wins over `min` + `max` when both are present | — | — |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-price-color` | `var(--oas-color-text-primary)` |
| `--oas-price-down-color` | `var(--oas-color-success-text)` |
| `--oas-price-original-color` | `var(--oas-color-text-secondary)` |
| `--oas-price-up-color` | `var(--oas-color-danger-text)` |
