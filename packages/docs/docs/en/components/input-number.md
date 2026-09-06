# InputNumber

A numeric input component: text input with numeric keypad (`inputmode="decimal"`), stepper buttons, range constraints and formatted display, with full `role="spinbutton"` aria state.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-input-number value="5" placeholder="Enter quantity" style="width: 160px"></oas-input-number>
</DemoBlock>

`placeholder` passes through to the inner input as a hint; when `label` is unset, the placeholder also participates in the accessible-name fallback chain (see the label section below).

## Range & Step

<DemoBlock title="min / max / step">
  <oas-input-number value="50" min="0" max="100" step="5" style="width: 160px"></oas-input-number>
</DemoBlock>

The corresponding stepper button is automatically disabled when a boundary is reached. Typing an out-of-range value **does not interrupt digit-by-digit input** (typing 1 then 00 to reach 100 works); the value is corrected on blur with a temporary red border while out of range (see "Status & out-of-range hint").

## Precision

<DemoBlock title="precision">
  <oas-input-number value="1.5" step="0.1" precision="2" style="width: 160px"></oas-input-number>
</DemoBlock>

`precision` controls the number of decimal places for both display and committed values: `1.5` renders as `1.50`, and stepping / blur correction keeps two decimals.

## Sizes

<DemoBlock title="size (sm / md / lg)">
  <oas-input-number value="5" size="sm" style="width: 140px"></oas-input-number>
  <oas-input-number value="5" style="width: 160px"></oas-input-number>
  <oas-input-number value="5" size="lg" style="width: 180px"></oas-input-number>
</DemoBlock>

`size` has three tiers aligned with the global control tokens (`--oas-control-height-*` / `--oas-font-size-*`); default is `md`.

## Stepper Buttons

<DemoBlock title="controls visibility & controls-position">
  <oas-input-number value="5" controls="false" placeholder="No steppers (↑↓ still work)" style="width: 220px"></oas-input-number>
  <oas-input-number value="5" style="width: 160px"></oas-input-number>
  <oas-input-number value="5" controls-position="both" style="width: 200px"></oas-input-number>
</DemoBlock>

- `controls` shows stepper buttons by default; `controls="false"` hides them (keyboard ↑↓ stepping still works)
- `controls-position="right"` (default): stacked arrows on the right side
- `controls-position="both"`: `- / +` buttons on both sides — friendlier for touch counter scenarios

Press and hold a stepper button for 800ms to enter auto-repeat: it steps every 100ms until release (built-in behavior, no configuration needed).

## Prefix & Suffix

<DemoBlock title="prefix / suffix">
  <oas-input-number value="1280" prefix="¥" style="width: 160px"></oas-input-number>
  <oas-input-number value="30" suffix="%" style="width: 160px"></oas-input-number>
  <oas-input-number value="500" prefix="Qty" suffix="pcs" style="width: 180px"></oas-input-number>
</DemoBlock>

`prefix` / `suffix` are inline decorative texts (not part of value parsing); same-named slots also accept arbitrary content: `<span slot="prefix">…</span>`.

<DemoBlock title="clearable + controls + suffix stacked">
  <oas-input-number value="1280" clearable suffix="USD" style="width: 200px"></oas-input-number>
  <oas-input-number value="42" clearable prefix="$" controls-position="both" style="width: 240px"></oas-input-number>
</DemoBlock>

`clearable` / stepper controls / affixes compose freely: right-side elements lay out left-to-right as steppers → clear button → suffix, all embedded inside the input box, and the entered text yields by the combined width (`controls-position="both"` keeps the clear button / suffix inside the box, clear of the right `+` button).

## Grouping & Declarative Formatting

<DemoBlock title="grouping (thousands separator)">
  <oas-input-number value="1234567.89" grouping precision="2" style="width: 200px"></oas-input-number>
</DemoBlock>

<DemoBlock title="format currency / percent / unit">
  <oas-input-number value="1234.5" format="currency:USD" style="width: 180px"></oas-input-number>
  <oas-input-number value="0.15" format="percent" style="width: 160px"></oas-input-number>
  <oas-input-number value="1024" format="unit:GB" style="width: 160px"></oas-input-number>
</DemoBlock>

- `grouping`: thousands grouping for display (separators are stripped when parsing)
- `format`: Intl-style declarative formatting — `percent` (ratio semantics: `0.15` renders as `15%`), `currency:USD`, `unit:GB`, etc., following the host locale
- The formatted text is mirrored to `aria-valuetext` so screen readers announce it

## Function Formatting

<DemoBlock title="formatter / parser function properties">
  <oas-input-number id="num-fn-format" value="5" style="width: 200px"></oas-input-number>
</DemoBlock>

Attributes cannot carry functions; pair them via JS properties (takes precedence over the declarative format attributes):

```js
el.formatter = (v) => `≈ ${v.toLocaleString()} pcs`
el.parser = (s) => Number(s.replace(/[^0-9.\-]/g, ''))
```

A `parser` returning a non-finite number is treated as invalid input (reverts to the last valid value on blur). The demo above is wired in the unified script block at the bottom of this page.

## Empty Value & Clearable

<DemoBlock title="clearable & empty value semantics">
  <oas-input-number id="num-clear" value="" clearable placeholder="Not filled" min="0" max="100" style="width: 200px"></oas-input-number>
  <span id="num-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

"Unfilled" ≠ "0": when `value` is empty (or unset) the component is in the empty state, `oas-change` dispatches `detail.value === null`, and form serialization yields an empty string. Once a value is entered, a clear button appears and returns to the empty state in one click (dispatching `oas-clear` + `oas-change null`). Stepping from empty starts at `min` (when set) or 0.

## Status & Out-of-range Hint

<DemoBlock title="status & temporary out-of-range highlight">
  <oas-input-number value="3" status="error" style="width: 160px"></oas-input-number>
  <oas-input-number value="3" status="warning" style="width: 160px"></oas-input-number>
  <oas-input-number value="3" status="success" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-over" value="50" min="0" max="100" style="width: 160px"></oas-input-number>
</DemoBlock>

`status` (`error` / `warning` / `success`) sets the semantic border color for form-validation wiring. In the fourth example, type `200` to see the temporary red border while out of range (input is not interrupted); it is corrected back to `100` on blur.

## Strict Step

<DemoBlock title="step-strictly">
  <oas-input-number value="0" step="12" step-strictly style="width: 160px"></oas-input-number>
</DemoBlock>

With `step-strictly`, committed values snap to the nearest multiple of `step` (whole-case / whole-dozen purchasing): typing `7` becomes `12` on blur; typing `5` becomes `0`.

## Readonly

<DemoBlock title="readonly">
  <oas-input-number value="1280" readonly style="width: 160px"></oas-input-number>
</DemoBlock>

`readonly` is distinct from `disabled`: focusable, copyable, submittable, but stepper buttons are disabled and keyboard / wheel cannot change the value (`aria-readonly` synced).

## Wheel Stepping

<DemoBlock title="wheel (off by default)">
  <oas-input-number value="50" wheel style="width: 160px"></oas-input-number>
</DemoBlock>

With `wheel`, scrolling while the input is focused steps the value (up increases, down decreases) and prevents page scrolling; off by default to avoid accidental triggers.

## Disabled

<DemoBlock title="Disabled">
  <oas-input-number value="3" disabled style="width: 160px"></oas-input-number>
</DemoBlock>

## Accessible Name (label)

<DemoBlock title="label (accessible name)">
  <oas-input-number id="num-label" label="Item quantity" value="3" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-label-default" value="5" style="width: 160px"></oas-input-number>
  <span id="num-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 280px"></span>
</DemoBlock>

`label` serves as the accessible name (`aria-label`) for the input: once set, screen readers announce it; when unset, it falls back to `placeholder`, then to the built-in text "Number input". The stepper buttons "Increase / Decrease" also use built-in text for their accessible names.

## Events

<DemoBlock title="Change events">
  <oas-input-number id="num-event" value="5" min="0" max="10" clearable style="width: 200px"></oas-input-number>
  <span id="num-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

Listen to `oas-change` (fires on blur / Enter / step / wheel / clear, `detail: { value }` where `value` is a number or `null`) and `oas-clear` (clear button click):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // function formatter/parser demo: fully custom format (function channel)
  const fnEl = document.getElementById('num-fn-format')
  if (fnEl) {
    fnEl.formatter = (v) => `≈ ${v.toLocaleString()} pcs`
    fnEl.parser = (s) => Number(s.replace(/[^0-9.\-]/g, ''))
  }

  const el = document.getElementById('num-event')
  const out = document.getElementById('num-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = e.detail.value === null ? 'oas-change: null (empty)' : `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-clear', () => {
    out.textContent = 'oas-clear'
  })

  // empty value semantics demo
  const clearEl = document.getElementById('num-clear')
  const clearOut = document.getElementById('num-clear-output')
  clearEl?.addEventListener('oas-change', (e) => {
    clearOut.textContent = e.detail.value === null ? 'empty (value="" → null)' : `number ${clearEl.getAttribute('value')}`
  })

  // label (accessible name) demo: read the inner input's aria-label after the component upgrades
  const numLabelSet = document.getElementById('num-label')
  const numLabelFallback = document.getElementById('num-label-default')
  const numLabelOut = document.getElementById('num-label-output')
  const readNumLabel = () => {
    const a = numLabelSet?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    const b = numLabelFallback?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    if (a !== undefined && b !== undefined) {
      numLabelOut.textContent = `aria-label: set "${a}" / fallback "${b}"`
    } else {
      setTimeout(readNumLabel, 60)
    }
  }
  readNumLabel()
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clearable` | Clear button when a value is present (returns to the empty-value state) | `boolean` | — |
| `controls` | Stepper buttons visibility (shown by default; `controls="false"` hides them, keyboard ↑↓ still steps) | — | — |
| `controls-position` | Button layout: `right` (default, stacked up/down on the right) / `both` (−/+ on both sides, stepper-counter form) | — | — |
| `disabled` | Disabled | `boolean` | — |
| `format` | Intl-style declarative format: `percent` (0.15→15%) / `currency:USD` / `unit:GB`, following the host locale | `string` | — |
| `grouping` | Thousands grouping display (group separators stripped on parse) | `boolean` | — |
| `label` | Accessible name (`aria-label` source; falls back to built-in "数字输入框" when unset) | `string` | — |
| `max` | Range, out-of-range values are clamped automatically | `string` | — |
| `min` | Range, out-of-range values are clamped automatically | `string` | — |
| `placeholder` | Placeholder (participates in the aria-label fallback chain) | `string` | — |
| `precision` | Number of decimal places | `string` | — |
| `prefix` | Inline prefix text (slot="prefix" accepts any content; not part of value parsing) | `string` | — |
| `readonly` | Read-only: focusable, copyable, submittable; buttons disabled + aria-readonly, keyboard/wheel cannot change the value | `boolean` | — |
| `size` | Size preset `sm` / `md` (default) / `lg`: control height and font scale | — | — |
| `status` | Validation status: `error` / `warning` / `success` semantic border colors | — | — |
| `step` | Step | `string` | `1` |
| `step-strictly` | Strict stepping: committed value snaps to the nearest step multiple | `boolean` | — |
| `suffix` | Inline suffix text (slot="suffix" likewise) | `string` | — |
| `value` | Current value (controlled) | `string` | — |
| `wheel` | Wheel stepping while focused (up increments, down decrements; off by default to prevent accidental changes) | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Change on step or blur, `detail: { value }` (number) |
| `oas-clear` | Fires when the clear button is clicked (value returns to the empty state), `detail: {}` |

### Slots

| Name | Description |
| --- | --- |
| `prefix` | Prefix content slot (not part of value parsing) |
| `suffix` | Suffix content slot (not part of value parsing) |
