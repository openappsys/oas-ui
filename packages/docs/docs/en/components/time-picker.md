# TimePicker

A time picker with dropdown hour/minute/second columns (plus an AM/PM column in 12-hour mode); `↑`/`↓` adjusts, `Home`/`End` jumps to bounds, `Enter` confirms, `Esc` cancels. Stepping intervals, disabled times, ranges, and direct typing are supported.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-time-picker value="09:05:30"></oas-time-picker>
</DemoBlock>

## Manual Input

<DemoBlock title="Type a time (committed on blur / Enter)">
  <oas-time-picker placeholder="Try typing 14:30"></oas-time-picker>
</DemoBlock>

Input is parsed as `H:mm[:ss]` (single digits tolerated, e.g. `9:5`); in 12-hour mode an AM/PM word may be appended. Invalid input reverts on blur without touching the value.

## Custom Format

<DemoBlock title="format column selection">
  <oas-time-picker value="09:05:30" format="HH:mm"></oas-time-picker>
  <oas-time-picker value="09:05:30" format="HH:mm:ss"></oas-time-picker>
</DemoBlock>

A column appears only when `format` contains the corresponding token.

## 12-Hour Mode

<DemoBlock title="use12-hours (value stays 24-hour)">
  <oas-time-picker value="15:30:00" use12-hours></oas-time-picker>
</DemoBlock>

Display and columns switch to 12-hour (AM/PM words follow the locale); the fourth column toggles AM/PM. The `value` contract stays `HH:mm:ss` 24-hour.

## Stepping

<DemoBlock title="step minute interval (single number, back-compat)">
  <oas-time-picker value="09:15:00" step="15"></oas-time-picker>
</DemoBlock>

<DemoBlock title="step JSON triple (hour/minute/second)">
  <oas-time-picker value="09:00:00" step='{"h":2,"m":10}'></oas-time-picker>
</DemoBlock>

`step` accepts `{"h":2,"m":5,"s":1}` for per-unit stepping; a single number remains the minute step. Values outside the step set snap to the nearest option visually without changing the value.

## Disabled Times

<DemoBlock title="disabledTime (grayed, not hidden)">
  <oas-time-picker id="time-picker-disabled-time" value="12:00:00"></oas-time-picker>
</DemoBlock>

`disabledTime` (property, `(parts) => { hours?, minutes?, seconds? }`) returns disabled lists per current-time context; disabled options are grayed out (clicks and keyboard skip them).

## Now & Presets

<DemoBlock title="Now button (footer)">
  <oas-time-picker placeholder="Open the panel and click Now"></oas-time-picker>
</DemoBlock>

The panel footer has a built-in Now button that fills the current time and confirms.

<DemoBlock title="presets quick times (property)">
  <oas-time-picker id="time-picker-presets" value="10:00:00"></oas-time-picker>
</DemoBlock>

`presets` (property, an array of `{ label, value: 'HH:mm:ss' }`) renders a button row atop the panel.

## Time Range

<DemoBlock title="is-range (dual column groups, auto order)">
  <oas-time-picker is-range value='["09:00:00","11:00:00"]'></oas-time-picker>
</DemoBlock>

With `is-range` the value is a JSON array; start/end are picked independently and auto-ordered on confirm.

## Form States

<DemoBlock title="Sizes">
  <oas-time-picker size="small" value="09:05:30"></oas-time-picker>
  <oas-time-picker size="medium" value="09:05:30"></oas-time-picker>
  <oas-time-picker size="large" value="09:05:30"></oas-time-picker>
</DemoBlock>

<DemoBlock title="Status & clearable">
  <oas-time-picker status="error" clearable value="09:05:30" placeholder="error, clearable"></oas-time-picker>
  <oas-time-picker status="warning" value="09:05:30" placeholder="warning"></oas-time-picker>
</DemoBlock>

<DemoBlock title="Readonly">
  <oas-time-picker readonly value="09:05:30" placeholder="Readonly echo"></oas-time-picker>
</DemoBlock>

## Controlled Open & Events

<DemoBlock title="oas-change / oas-confirm events">
  <oas-time-picker id="time-picker-event" value="10:00:00"></oas-time-picker>
  <span id="time-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<DemoBlock title="Controlled open (open + oas-open-change)">
  <oas-time-picker id="time-picker-open" value="10:00:00"></oas-time-picker>
  <button id="time-picker-open-toggle" type="button">Toggle open</button>
</DemoBlock>

Confirm actions (Enter, outside click, Now) emit `oas-confirm` alongside `oas-change`.

## Disabled

<DemoBlock title="Disabled">
  <oas-time-picker disabled value="09:05:30"></oas-time-picker>
</DemoBlock>

## Floating Positioning (placement)

<DemoBlock title="Explicit placement (top-end)">
  <oas-time-picker placement="top-end" value="09:05:30" placeholder="placement=top-end"></oas-time-picker>
</DemoBlock>

Same positioning contract as date-picker: `fixed` + collision flipping + viewport clamping; the panel width matches the trigger. 12 directions (default `bottom-start`).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clearable` | Clearable: shows a clear button when a value exists; emits `oas-clear` + `oas-change` (empty value) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `format` | Display format tokens; a column appears only when the corresponding token exists | `string` | `HH:mm:ss` |
| `is-range` | Time range: value is a JSON array `["HH:mm:ss","HH:mm:ss"]`, auto-ordered on confirm; the typing channel is read-only in this mode | `boolean` | — |
| `open` | Controlled open: present = open, removed = closed; gestures only emit `oas-open-change` for the host to write back | — | — |
| `placeholder` | Placeholder text | — | — |
| `placement` | Popup placement, 12 directions (default `bottom-start`), `fixed` + collision flipping + viewport clamping (same contract as date-picker) | `string` | `bottom-start` |
| `readonly` | Readonly: the panel can be opened and browsed, but no interaction commits | `boolean` | — |
| `size` | Size: `small` / `medium` / `large` (reads the nearest config-provider injection) | `string` | `medium` |
| `status` | Validation status: `success` / `warning` / `error` (`error` also sets `aria-invalid`) | `string` | — |
| `step` | Stepping: a JSON triple `{"h":2,"m":5,"s":1}` per unit; a single number remains the minute step | `string` | — |
| `use12-hours` | 12-hour mode: display and columns switch to 12-hour (with an AM/PM column following the locale); the value stays 24-hour | `boolean` | — |
| `value` | Current value (`HH:mm:ss`; a JSON array when `is-range`) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-blur` | The component as a whole loses focus (internal moves do not fire) |
| `oas-change` | Confirmed value change, `detail: { value }` (string array for `is-range`) |
| `oas-clear` | Clear, `detail: { value }` is the previous value |
| `oas-confirm` | Emitted on confirm actions (Enter / outside click / Now, alongside `oas-change`), `detail: { value: detail }` |
| `oas-focus` | The component as a whole gains focus |
| `oas-open-change` | Open state change, `detail: { open }` (both controlled and uncontrolled) |

Keyboard: `Enter` / `↓` to open, `↑`/`↓` to adjust the current column, `Home`/`End` to jump to bounds, `←`/`→` to switch columns, `Enter` to confirm, `Esc` to cancel.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('time-picker-event')
  const out = document.getElementById('time-picker-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-confirm', (e) => {
    out.textContent = `oas-confirm: ${e.detail.value}`
  })

  const openEl = document.getElementById('time-picker-open')
  document.getElementById('time-picker-open-toggle')?.addEventListener('click', () => {
    if (openEl?.hasAttribute('open')) openEl.removeAttribute('open')
    else openEl?.setAttribute('open', '')
  })

  const dt = document.getElementById('time-picker-disabled-time')
  dt.disabledTime = (p) => (p.h >= 14 && p.h < 17 ? { hours: [14, 15, 16] } : null)

  const pr = document.getElementById('time-picker-presets')
  pr.presets = [
    { label: '9 AM', value: '09:00:00' },
    { label: '2 PM', value: '14:00:00' },
    { label: 'Noon', value: '12:00:00' },
  ]
})
</script>
