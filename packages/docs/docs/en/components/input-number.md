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
  <oas-input-number value="1280" prefix-text="¥" style="width: 160px"></oas-input-number>
  <oas-input-number value="30" suffix-text="%" style="width: 160px"></oas-input-number>
  <oas-input-number value="500" prefix-text="Qty" suffix-text="pcs" style="width: 180px"></oas-input-number>
</DemoBlock>

`prefix-text` / `suffix-text` are inline decorative texts (not part of value parsing); same-named slots also accept arbitrary content: `<span slot="prefix">…</span>`. `prefix` / `suffix` are compatibility aliases (canonical: `prefix-text` / `suffix-text`), usable through both the attribute and property channels (React / Vue bindings included).

<DemoBlock title="clearable + controls + suffix stacked">
  <oas-input-number value="1280" clearable suffix-text="USD" style="width: 200px"></oas-input-number>
  <oas-input-number value="42" clearable prefix-text="$" controls-position="both" style="width: 240px"></oas-input-number>
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

## Pointer Scrubbing

<DemoBlock title="Press-drag the numeric area (scrub) + Shift/Alt fine steps">
  <oas-input-number id="innum-scrub" value="50" min="0" max="100" step="1" style="width: 160px"></oas-input-number>
  <span id="innum-scrub-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

The numeric area supports pointer scrubbing: press and drag the input horizontally — 4px per step (step size = `step`) — no precise clicking or typing needed in dense tuning. Modifier keys share the knob convention: **Shift for fine adjustment (×0.2), Alt for ultra-fine (×0.04)**; no acceleration tier. Dragging back to the press point restores the original value (mistaken drags are losslessly undone); movement under one step counts as a plain click (focus and text selection unaffected). Release commits per the commit-based model (`oas-change`, not dispatched when the value is unchanged), and dragging dispatches `oas-input`.

Scrubbing is not enabled on coarse pointers (tap focuses and raises the keyboard — typing wins); CSS already permits vertical touch scrolling (`touch-action: pan-y`) so only horizontal movement enters scrub. Set `scrub="false"` to disable entirely.

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

## Decimal Separator (decimal-separator)

<DemoBlock title="decimal-separator (locale-aware by default)">
  <oas-input-number id="num-sep-default" value="1.5" step="0.1" placeholder="locale default" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-sep-comma" value="1.5" step="0.1" decimal-separator="," placeholder="comma" style="width: 160px"></oas-input-number>
  <span id="num-sep-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

`decimal-separator` sets the decimal point character (defaults to the runtime locale's decimal separator, same source as `Intl` formatting). The left one uses the locale default; the right one explicitly uses a comma: display, typed parsing, and committed value stay consistent — typing `2,5` commits `2.5` and re-renders as `2,5` on blur. Listen to `oas-change` to read the committed number.

## Variants

<DemoBlock title="variant (outlined / filled / borderless)">
  <oas-input-number id="num-variant-outlined" value="5" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-variant-filled" value="5" variant="filled" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-variant-borderless" value="5" variant="borderless" style="width: 160px"></oas-input-number>
</DemoBlock>

`variant` supports `outlined` (default border) / `filled` (filled background, border only on focus) / `borderless` (no border, no background), with the same semantics as the `oas-input` variants; with `controls-position="both"` the −/+ buttons follow the variant too.

## Alignment (align)

<DemoBlock title="align (left / center / right)">
  <oas-input-number id="num-align-left" value="1234" align="left" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-align-center" value="1234" align="center" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-align-right" value="1234" align="right" style="width: 160px"></oas-input-number>
</DemoBlock>

`align` controls the number text alignment (`left` / `center` / `right`). For RTL safety it maps to logical `text-align: start/end`: `left` / `right` mirror automatically to the line start/end under `dir="rtl"`. When unset, the browser default applies (`start`, i.e. left-aligned in LTR).

## Autofocus

<DemoBlock title="autofocus (focus the inner input after mount)">
  <oas-button id="btn-num-autofocus" size="small">Create an autofocus input</oas-button>
  <span id="num-autofocus-host" style="display: inline-flex; gap: var(--oas-space-2); vertical-align: middle"></span>
  <span id="num-autofocus-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

`autofocus` forwards focus to the inner input after mount (native autofocus does not pierce the shadow DOM), so a page/form can be typed into immediately. To avoid stealing focus on page load, this demo creates a component with `autofocus` via a button.

## Events

<DemoBlock title="Change / clear / focus / blur / input events">
  <oas-input-number id="num-event" value="5" min="0" max="10" clearable style="width: 200px"></oas-input-number>
  <span id="num-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

- `oas-change`: fires on blur / Enter / step / wheel / clear, `detail: { value }` where `value` is a number or `null` (empty)
- `oas-clear`: clear button click
- `oas-focus` / `oas-blur`: dispatched when the inner input gains/loses focus, `detail: { value }` is the current committed value (number or `null`; blur fires after the commit and carries the new value)
- `oas-input`: dispatched on every keystroke, `detail: { value }` is the current display text (string, uncommitted semantics; includes format decorations in formatted scenarios)

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // function formatter/parser demo: fully custom format (function channel)
  const fnEl = document.getElementById('num-fn-format')
  if (fnEl) {
    fnEl.formatter = (v) => `≈ ${v.toLocaleString()} pcs`
    fnEl.parser = (s) => Number(s.replace(/[^0-9.\-]/g, ''))
  }

  // scrub demo: show the committed value (oas-change)
  const scrubEl = document.getElementById('innum-scrub')
  const scrubOut = document.getElementById('innum-scrub-out')
  if (scrubEl && scrubOut) {
    scrubEl.addEventListener('oas-change', (e) => (scrubOut.textContent = `committed: ${e.detail.value}`))
  }

  const el = document.getElementById('num-event')
  const out = document.getElementById('num-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = e.detail.value === null ? 'oas-change: null (empty)' : `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-clear', () => {
    out.textContent = 'oas-clear'
  })
  el?.addEventListener('oas-focus', (e) => {
    out.textContent = e.detail.value === null ? 'oas-focus: null (empty)' : `oas-focus: ${e.detail.value}`
  })
  el?.addEventListener('oas-blur', (e) => {
    out.textContent = e.detail.value === null ? 'oas-blur: null (empty)' : `oas-blur: ${e.detail.value} (committed)`
  })
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: "${e.detail.value}" (uncommitted)`
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

  // decimal-separator demo: read back the committed number (display uses the configured separator)
  const sepEl = document.getElementById('num-sep-comma')
  const sepOut = document.getElementById('num-sep-output')
  sepEl?.addEventListener('oas-change', (e) => {
    const shown = sepEl.shadowRoot?.querySelector('input')?.value ?? ''
    sepOut.textContent = `display "${shown}" → commit ${e.detail.value === null ? 'null' : e.detail.value}`
  })

  // autofocus demo: create a component with autofocus and verify the inner input is focused
  const afHost = document.getElementById('num-autofocus-host')
  const afOut = document.getElementById('num-autofocus-output')
  document.getElementById('btn-num-autofocus')?.addEventListener('click', () => {
    if (!afHost) return
    const el = document.createElement('oas-input-number')
    el.setAttribute('autofocus', '')
    el.setAttribute('placeholder', 'Auto-focused')
    el.style.width = '140px'
    afHost.replaceChildren(el)
    setTimeout(() => {
      const inner = el.shadowRoot?.querySelector('input')
      const focused = el.shadowRoot?.activeElement === inner
      afOut.textContent = focused ? 'inner input focused' : 'not focused'
    }, 60)
  })
})
</script>

## required

<DemoBlock title="required (native validation chain)">
  <oas-input-number required name="qty" placeholder="Quantity"></oas-input-number>
</DemoBlock>

`required` drives the native validation chain (form-associated): when unfilled, `checkValidity()` returns false (`valueMissing`) and native form submission is blocked; it recovers to `:valid` once filled.

Programmatic read/write of the current value goes through the public `value` property: `el.value` reads the FormData-equivalent value (the real-time parsed value while the inner input is present; empty string for empty/invalid typing); `el.value = x` writes the controlled `value` attribute and force-refreshes the inner control (ignoring focus protection) without dispatching events.

## API

### oas-input-number

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Number text alignment left/center/right (logical, RTL mirrored) | `string` | — |
| `autofocus` | Focus the inner input after mount | `boolean` | — |
| `clearable` | Clear button when a value is present (returns to the empty-value state) | `boolean` | — |
| `controls` | Stepper buttons visibility (shown by default; `controls="false"` hides them, keyboard ↑↓ still steps) | — | — |
| `controls-position` | Button layout: `right` (default, stacked up/down on the right) / `both` (−/+ on both sides, stepper-counter form) | — | — |
| `decimal-separator` | Decimal point character for display and typed parsing (locale-aware default; submitted value stays canonical) | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `format` | Intl-style declarative format: `percent` (0.15→15%) / `currency:USD` / `unit:GB`, following the host locale | `string` | — |
| `grouping` | Thousands grouping display (group separators stripped on parse) | `boolean` | — |
| `label` | Accessible name (`aria-label` source; falls back to built-in "数字输入框" when unset) | `string` | — |
| `max` | Range, out-of-range values are clamped automatically | `string` | — |
| `min` | Range, out-of-range values are clamped automatically | `string` | — |
| `placeholder` | Placeholder (participates in the aria-label fallback chain) | `string` | — |
| `precision` | Number of decimal places | `string` | — |
| `prefix-text` | Inline prefix text (slot="prefix" accepts any content; not part of value parsing) | `string` | — |
| `readonly` | Read-only: focusable, copyable, submittable; buttons disabled + aria-readonly, keyboard/wheel cannot change the value | `boolean` | — |
| `required` | Required marker (drives the native valueMissing validation chain; not passed through to the inner input) | `boolean` | — |
| `scrub` | Numeric pointer scrubbing (on by default): press and drag the input horizontally — 4px per step (step size = step); Shift for fine (×0.2), Alt for ultra-fine (×0.04); drag back to the press point to restore the original value; movement under one step counts as a plain click (typing/text selection preserved); commits on release (oas-change); scrub="false" disables; not enabled on coarse pointers | `string` | `true` |
| `size` | Size preset `sm` / `md` (default) / `lg`: control height and font scale | — | — |
| `status` | Validation status: `error` / `warning` / `success` semantic border colors | — | — |
| `step` | Step | `string` | `1` |
| `step-strictly` | Strict stepping: committed value snaps to the nearest step multiple | `boolean` | — |
| `suffix-text` | Inline suffix text (slot="suffix" likewise) | `string` | — |
| `value` | Current value (controlled) | `string` | — |
| `variant` | Visual variant outlined/filled/borderless (aligned with input) | `string` | — |
| `wheel` | Wheel stepping while focused (up increments, down decrements; off by default to prevent accidental changes) | `boolean` | — |

#### Property (JS property only, not reflected as attribute)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Current value: the live-parsed numeric string (empty / invalid input yields an empty string) | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-blur` | Dispatched on blur after the commit, `detail: { value }` carries the committed value |
| `oas-change` | Change on step or blur, `detail: { value }` (number) |
| `oas-clear` | Fires when the clear button is clicked (value returns to the empty state), `detail: {}` |
| `oas-focus` | Dispatched on focus, `detail: { value }` (current committed value) |
| `oas-input` | Dispatched on every keystroke, `detail: { value }` is the current display text (uncommitted) |

#### Slots

| Name | Description |
| --- | --- |
| `prefix` | Prefix content slot (not part of value parsing) |
| `suffix` | Suffix content slot (not part of value parsing) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-button-group-radius` | `var(--oas-radius-md)` |
| `--oas-input-number-controls-pad` | `28px` |
| `--oas-input-number-font` | `var(--oas-font-size-md)` |
| `--oas-input-number-height` | `var(--oas-control-height-md)` |
