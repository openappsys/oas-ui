---
description: A text component whose digits and characters roll column by column on value changes, with prefix/suffix, decimal precision and per-column duration
---

# RollingText

A display component that rolls digits and characters column by column: each digit column is a vertical 0–9 wheel that rolls to the target digit on value changes, while non-digit columns (decimal point, minus sign, letters) flip vertically.

- `value` accepts a string or number; `precision` sets decimal places (pad / round)
- `prefix-text` / `suffix-text` render currency symbols, units, etc.
- `duration` sets the per-column roll duration; CSS variables allow further tuning
- Digits roll along the **shortest path** (`9 → 0` moves one step, not a full reverse sweep); digit columns always stay LTR, so `123` never renders as `321` on RTL pages
- Accessibility: the visual columns are `aria-hidden`, with the full text kept in a visually hidden node; `live` enables polite announcements
- Under `prefers-reduced-motion` transitions and flips are disabled, showing the target value directly

## Basic Usage

<DemoBlock title="Amount (¥ prefix + two decimals)">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-3); align-items: flex-start;">
    <oas-rolling-text id="rt-demo" value="1288" prefix-text="¥" precision="2"></oas-rolling-text>
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="rt-random" size="small">Randomize</oas-button>
      <oas-button id="rt-reset" size="small">Reset</oas-button>
    </div>
  </div>
</DemoBlock>

## Character Columns

Decimal points, minus signs, percent signs and other non-digit characters roll column by column too:

<DemoBlock title="Character columns">
  <oas-rolling-text value="-12.5%" precision="1"></oas-rolling-text>
  <oas-rolling-text value="OAS-2026" style="margin-inline-start: var(--oas-space-4)"></oas-rolling-text>
</DemoBlock>

## Speed and Size

`duration` controls the roll duration (ms); `--oas-rolling-text-font` / `--oas-rolling-text-height` control font size and column height:

<DemoBlock title="duration=1200 / larger font">
  <oas-rolling-text id="rt-slow" value="2026" duration="1200" suffix-text=" year" style="--oas-rolling-text-font: calc(var(--oas-font-size-xl) * 2)"></oas-rolling-text>
</DemoBlock>

## Screen Reader Announcements

Silent by default (`aria-live="off"`) to avoid interrupting screen readers with frequent rolls; add `live` to enable announcements:

<DemoBlock title="live: polite announcements">
  <oas-rolling-text value="99" prefix-text="Stock " suffix-text=" pcs" live></oas-rolling-text>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-rolling-text').then(() => {
    const demo = document.querySelector('#rt-demo')
    document.querySelector('#rt-random')?.addEventListener('click', () => {
      const value = Math.round(Math.random() * 99999) / 100
      demo?.setAttribute('value', String(value))
    })
    document.querySelector('#rt-reset')?.addEventListener('click', () => {
      demo?.setAttribute('value', '1288')
    })
    document.querySelector('#rt-slow')?.addEventListener('click', () => {
      const el = document.querySelector('#rt-slow')
      el?.setAttribute('value', String(Math.round(Math.random() * 9000) + 1000))
    })
  })
})
</script>

## API

### oas-rolling-text

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `duration` | Per-column roll duration (ms, default 600); invalid or non-positive falls back to the default | `string` | — |
| `live` | Boolean; when present the screen-reader live region is `polite` (off by default to avoid frequent announcements) | — | — |
| `precision` | Decimal places (0–10): pad / round; missing or invalid keeps the original text | `string` | — |
| `prefix-text` | Prefix text (e.g. a currency symbol) | `string` | — |
| `suffix-text` | Suffix text (e.g. a unit) | `string` | — |
| `value` | Display value (string; numeric property assignments reflect to the attribute) | `string \| number` | — |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-rolling-text-duration` | Roll duration | `var(--oas-transition-base)` |
| `--oas-rolling-text-font` | Font size | `var(--oas-font-size-xl)` |
| `--oas-rolling-text-height` | Column height | `1em` |
| `--oas-rolling-text-separator-color` | Color of non-digit columns (decimal point / signs) | `var(--oas-color-text-primary)` |
