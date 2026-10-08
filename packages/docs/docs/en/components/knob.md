# Knob

A rotary input control that encodes a continuous/discrete value as an angle around a circle — built for parameter-dense panels (audio/industrial/3D): compact circular form, relative dragging (no jumps), and bipolar zero-point.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-knob value="40"></oas-knob>
</DemoBlock>

The knob is a compact circular input: drag or use the keyboard to change the value; the range maps linearly onto the sweep (by default 225° → 495°, a 270° sweep with a gap at the bottom, like the stop of a physical panel knob). The pointer gesture is **relative**: pressing writes nothing and the value follows the hand (no jumping to the click point, unlike a linear slider).

## Range & Step

<DemoBlock title="min / max / step (step=0 means continuous)">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob min="0" max="100" step="10" value="30" show-value></oas-knob>
    <oas-knob min="-50" max="50" step="0" value="12" show-value></oas-knob>
  </div>
</DemoBlock>

`min`/`max` define the range (invalid values or `min > max` are swapped as a fallback); `step` snaps the value, `0` or a negative value means continuous (no snapping). Out-of-range values are clamped.

## Sweep angles (start-angle / end-angle)

<DemoBlock title="Custom sweeps: 300° near-full circle / half-dial">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob start-angle="210" end-angle="510" include-arc value="60" show-value></oas-knob>
    <oas-knob start-angle="180" end-angle="360" include-arc value="60" show-value></oas-knob>
  </div>
</DemoBlock>

`start-angle`/`end-angle` customize the sweep (0° = 12 o'clock, clockwise; defaults 225 → 495, a 270° sweep with a bottom gap). `end-angle` may exceed 360 (e.g. 510 = start at 210°, sweep 300° clockwise); `end-angle <= start-angle` is normalized to a minimal 1° sweep (divide-by-zero guard).

## Three gesture models (interaction)

<DemoBlock title="cursor circular bearing / axis linear drag / auto resolving (default)">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob interaction="cursor" value="40" label="Circular"></oas-knob>
    <oas-knob interaction="axis" value="40" label="Linear"></oas-knob>
    <oas-knob interaction="auto" value="40" label="Auto"></oas-knob>
    <oas-knob interaction="axis" axis="horizontal" value="40" label="Horizontal"></oas-knob>
  </div>
</DemoBlock>

- `cursor`: the pointer's **bearing angle** around the shaft drives the value incrementally (clockwise increases) — the signature knob gesture;
- `axis`: **linear drag** (default `axis="vertical"`, up increases, 150px covers the full range; `axis="horizontal"` switches to rightward increase) — the common convention of pro-audio plugins;
- `auto` (default): resolves within the first few pixels — dominant direction along the preferred axis goes linear, perpendicular goes circular; **resolved once and locked** for the rest of the gesture (switching mid-drag would jump the value).

All gestures are relative: pressing writes nothing, a tap without movement is a no-op; the primary pointer is exclusive; holding Shift drags at 0.2× for fine adjustment.

## Reset (double-click / Ctrl+click / default-value)

<DemoBlock title="Double-click or Ctrl+click resets to default-value (falls back to min)">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob default-value="70" value="20" show-value label="Gain"></oas-knob>
    <oas-knob value="80" min="10" show-value label="Resets to min"></oas-knob>
  </div>
</DemoBlock>

**Double-click** or **Ctrl/Cmd + click** resets to `default-value`; without it the knob falls back to `min`. Resetting emits `oas-reset` (`detail: { value, defaultValue }`) and does not emit `oas-change` (a reset is not a value confirmation); `readonly`/`disabled` block all reset gestures. For programmatic reset use the `el.reset()` method.

## Value arc & bipolar zero (include-arc + start-point)

<DemoBlock title="include-arc value arc; start-point at center = bipolar (pan/gain)">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob include-arc value="70" show-value label="Level"></oas-knob>
    <oas-knob include-arc start-point="50" value="80" min="0" max="100" show-value label="Pan R"></oas-knob>
    <oas-knob include-arc start-point="50" value="20" min="0" max="100" show-value label="Pan L"></oas-knob>
  </div>
</DemoBlock>

`include-arc` shows the value arc (filled from `start-point`, falling back to `min`, up to the current value); setting `start-point` to the center value makes the arc **bipolar** — values above the origin extend to one side, below to the other (pan/gain centered at 12 o'clock). The arc hides when the value equals the origin.

## Indicator (indicator)

<DemoBlock title="line pointer (default) / dot">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob indicator="line" include-arc value="60"></oas-knob>
    <oas-knob indicator="dot" include-arc value="60"></oas-knob>
  </div>
</DemoBlock>

`indicator="line"` draws a radial pointer line (default); `indicator="dot"` draws a dot near the rim.

## Value display (show-value / unit / format)

<DemoBlock title="show-value text + unit suffix / format template">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob show-value unit="Hz" min="20" max="20000" step="10" value="440" label="Frequency"></oas-knob>
    <oas-knob show-value format="${value} dB" value="-6" label="Gain"></oas-knob>
  </div>
</DemoBlock>

`show-value` displays the current value below the knob; `unit` appends a suffix (`Hz`/`%`/`dB`); `format` is a template string (`${value}` placeholder). The formatted output also feeds `aria-valuetext` (screen readers announce what is visible); for richer formatting assign the `el.formatValue = (value) => string` function property (highest priority, set `null` to clear).

## Size

<DemoBlock title="size tiers (sm / md / lg), custom diameter via CSS variable">
  <div style="display: flex; gap: 32px; align-items: flex-start;">
    <oas-knob size="sm" value="30" include-arc></oas-knob>
    <oas-knob value="50" include-arc></oas-knob>
    <oas-knob size="lg" value="70" include-arc></oas-knob>
    <oas-knob value="60" style="--oas-knob-size: 88px"></oas-knob>
  </div>
</DemoBlock>

`size` maps to diameters sm=40px / md=56px (default) / lg=72px (also accepts the `small`/`medium`/`large` vocabulary with config-provider injection); invalid values fall back to md. Custom diameters override the CSS variable `--oas-knob-size`. On coarse-pointer devices the sm tier is raised to the 44px touch-target minimum.

## Mouse wheel (wheel)

<DemoBlock title="wheel adjusts on hover (off by default), Shift+wheel for fine steps">
  <oas-knob wheel value="40" show-value label="Volume"></oas-knob>
</DemoBlock>

With `wheel` enabled, scrolling over the knob adjusts the value (scroll up increases; one notch = `step`, or 1/50 of the range when continuous); Shift+wheel runs at 0.2× for fine steps. Off by default (page scrolling stays untouched).

## Reverse (reverse)

<DemoBlock title="reverse mirrors the value sweep and the circular gesture (min starts at end-angle)">
  <oas-knob reverse include-arc value="30" show-value></oas-knob>
</DemoBlock>

`reverse` flips the sweep direction (min → end-angle, max → start-angle) and mirrors the circular gesture and the left/right arrow keys; RTL writing direction (`dir="rtl"`) mirrors automatically and XORs with `reverse`.

## Keyboard

<DemoBlock title="Keyboard large steps (large-step)">
  <oas-knob large-step="25" include-arc show-value value="50" label="Large step"></oas-knob>
</DemoBlock>

With the knob focused: arrow keys step by `step` (up/down always increase/decrease; left/right follow the mirror), Shift + arrows and PageUp/PageDown step by `large-step` (default 10 × step), Home/End jump to the extremes. Every keypress is a full commit (emits `oas-input` + `oas-change`); keys at the extremes stay silent (no events).

## Readonly & disabled

<DemoBlock title="readonly (not dimmed) / disabled (dimmed, unfocusable)">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob readonly value="40" include-arc></oas-knob>
    <oas-knob disabled value="60" include-arc></oas-knob>
  </div>
</DemoBlock>

`readonly` and `disabled` are independent (same contract as slider): a readonly knob stays focusable and its value still participates in host collection, but dragging/keyboard/wheel/reset are all intercepted and it is not visually dimmed; a disabled knob is unfocusable (tabindex removed), sets `aria-disabled="true"` and is dimmed.

## Accessible name (label)

<DemoBlock title="label accessible name (no visible label; visible labels belong to oas-form-item)">
  <div style="display: flex; flex-direction: column; gap: 12px; width: 320px;">
    <oas-form-item label="Gain">
      <oas-knob id="knob-label-demo" label="Gain" value="-6" show-value unit="dB"></oas-knob>
    </oas-form-item>
    <oas-button onclick="document.getElementById('knob-label-out').textContent = 'aria-label = ' + document.getElementById('knob-label-demo').getAttribute('aria-label')">Show aria-label</oas-button>
    <span id="knob-label-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

`label` becomes the knob's `aria-label` (falls back to the built-in "Knob" copy). The knob renders no visible label of its own — use `oas-form-item`'s `label` for a visible label (clicking it focuses the knob).

## Events

<DemoBlock title="Drag / keyboard / reset events (oas-input live, oas-change commit, oas-drag-* boundaries, oas-reset)">
  <div style="display: flex; gap: 24px; align-items: center;">
    <oas-knob id="knob-event" include-arc show-value value="40"></oas-knob>
    <oas-knob id="knob-event-reset" default-value="70" include-arc show-value value="20" label="Double-click me"></oas-knob>
  </div>
  <span id="knob-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-height: 20px"></span>
</DemoBlock>

Event contract (every `detail` carries `value`):

- `oas-input`: each value change while dragging / wheel / keyboard (live);
- `oas-change`: commit on release / each full keyboard or wheel confirmation (not emitted for cancels or zero-change releases);
- `oas-drag-start`: the pointer pressed and moved effectively (no event for a tap without movement);
- `oas-drag-end`: release (`cancelled: false`) or cancel (`cancelled: true`; no `oas-change` follows);
- `oas-reset`: after double-click / Ctrl+click / `reset()` (`detail: { value, defaultValue }`).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-knob').then(() => {
    const el = document.getElementById('knob-event')
    const resetEl = document.getElementById('knob-event-reset')
    const out = document.getElementById('knob-output')
    const show = (label, detail) => {
      if (out) out.textContent = `${label}: ${JSON.stringify(detail)}`
    }
    el?.addEventListener('oas-input', (e) => show('oas-input', e.detail))
    el?.addEventListener('oas-change', (e) => show('oas-change', e.detail))
    el?.addEventListener('oas-drag-start', (e) => show('oas-drag-start', e.detail))
    el?.addEventListener('oas-drag-end', (e) => show('oas-drag-end', e.detail))
    resetEl?.addEventListener('oas-reset', (e) => show('oas-reset', e.detail))
  })
})
</script>

## Touch & edge cases

- Pointer Events unify mouse/touch (`touch-action: none` claims the drag, primary pointer is exclusive, `pointercancel` cancels and rolls back);
- **Esc** during a drag cancels: rolls back to the start value with zero commits (no `oas-change`);
- Reset gestures during a drag (double-click / Ctrl+click) are ignored; losing pointer capture to another element (`lostpointercapture`) cancels and rolls back; a programmatic `reset()` during a drag first cancels the drag, then resets;
- `wheel` responds to vertical scrolling (`deltaY`) only; horizontal trackpad panning does not adjust the value;
- A throwing `formatValue` function degrades to the `format` template / `unit` suffix / plain number (rendering and gestures keep working);
- External `value` writes during a drag: the display keeps the dragging value; on release a committed drag wins, a zero-change release keeps the external value;
- Touch assist technologies may not fully support custom slider gestures (W3C ARIA APG note) — test with real AT before shipping on mobile.

## API

### oas-knob

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `axis` | Linear drag axis: `vertical` (default, up increases, 150px covers the full range) / `horizontal` (right increases); acts as the preferred axis for `interaction=auto` | `string` | — |
| `default-value` | Reset target: double-click / Ctrl+click / `reset()` resets to this value (snapped + clamped); falls back to `min`; resetting emits `oas-reset` (not `oas-change`) | `number \| null` | — |
| `disabled` | Disabled: unfocusable (tabindex removed), dragging/keyboard/wheel/reset all blocked, `aria-disabled="true"`, dimmed (opacity .6) | `boolean` | — |
| `end-angle` | Sweep end angle (default 495, a 270° sweep with a bottom gap); may exceed 360 (e.g. 510 = start at 210°, 300° clockwise); sweep is capped at 360 | — | — |
| `format` | Value format template: the `${value}` placeholder is replaced with the current value (e.g. `"${value} dB"`); output feeds both the value text and `aria-valuetext`; lower priority than the `formatValue` function | `string` | — |
| `include-arc` | Show the value arc: filled from `start-point` (falling back to min) to the current value; hidden when the value equals the origin (prevents a round linecap dot) | `boolean` | — |
| `indicator` | Indicator style: `line` (radial pointer line, default) / `dot` (dot near the rim); invalid values fall back to line | `string` | — |
| `interaction` | Gesture model: `cursor` (pointer bearing drives the value incrementally, clockwise increases) / `axis` (linear drag) / `auto` (default — resolved within the first few pixels: dominant direction along the preferred axis goes linear, perpendicular goes circular, resolved once and locked for the gesture); relative semantics: pressing writes nothing, a tap without movement is a no-op, primary pointer is exclusive | `string` | `auto` |
| `label` | Knob accessible name (`aria-label`; renders no visible label — visible labels belong to oas-form-item); falls back to the built-in "Knob" i18n copy | `string` | — |
| `large-step` | Keyboard large step (Shift+arrows / PageUp / PageDown); defaults to 10 × step (span / 10 when continuous) | `string` | — |
| `max` | Range upper bound (default 100) | `string` | `100` |
| `min` | Range lower bound (default 0); invalid values or `min > max` are swapped as a fallback | `string` | `0` |
| `readonly` | Readonly (independent of `disabled`): stays focusable and the value still participates in host collection, but dragging/keyboard/wheel/reset are all intercepted; not visually dimmed; sets `aria-readonly="true"` | `boolean` | — |
| `reverse` | Reverse: mirrors the value sweep (min → end-angle, max → start-angle) and mirrors the circular gesture and the left/right arrow keys; XORs with the RTL writing direction | `boolean` | — |
| `show-value` | Display the current value below the knob (formatted via the `formatValue` function / `format` template / `unit` suffix, same source as `aria-valuetext`) | `boolean` | — |
| `size` | Size tier: sm (40px) / md (56px, default) / lg (72px); also accepts the small / medium / large vocabulary (config-provider injectable); invalid values fall back to md; custom diameters override the CSS variable `--oas-knob-size`; on touch devices the sm tier is raised to the 44px touch-target minimum | `string` | `medium` |
| `start-angle` | Sweep start angle (0° = 12 o'clock, clockwise; default 225); `end-angle <= start-angle` is normalized to a minimal 1° sweep | — | — |
| `start-point` | Value arc origin (missing/invalid falls back to `min`, clamped to the range); setting it to the center value makes the arc bipolar — values above the origin extend to one side, below to the other (pan/gain zero point) | `string` | — |
| `step` | Snap step (default 1); `0` or negative means continuous (no snapping) | `string` | `1` |
| `unit` | Value suffix (e.g. `Hz`/`%`/`dB`): feeds the show-value text and `aria-valuetext`; lower priority than the `format` template and the `formatValue` function | `string` | — |
| `value` | Current value (controlled): out-of-range values are clamped to `[min, max]` and snapped by `step`; written back to the attribute after interaction (hosts can read the latest value directly from the attribute) | `number` | `0` |
| `wheel` | Wheel adjustment on hover (off by default): scroll up increases, down decreases, one notch = `step` (span/50 when continuous), Shift+wheel runs at 0.2×; preventDefault stops page scrolling while enabled | `boolean` | — |

#### Property (JS property only, not reflected as attribute)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `defaultValue` | Reset target: reads the `default-value` attribute (null when unset = falls back to min); assigning a number reflects to the attribute, assigning null clears it | `number \| null` | — |
| `formatValue` | Value formatter: `el.formatValue = (value) => string`, output feeds both the show-value text and `aria-valuetext`; higher priority than the `format` attribute and `unit` suffix; set null to clear | `((value: number) => string \| number \| null \| undefined) \| null` | — |
| `value` | Current value: reads back the clamped + snapped number (the live dragging value mid-drag); writing is controlled-assign-immediate (writes the attribute and force-syncs, no events) | `number` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted on release commit / each full keyboard or wheel confirmation, `detail: { value }`; not emitted for cancels (Esc/pointercancel) or zero-change releases |
| `oas-drag-end` | Emitted when the drag ends, `detail: { value, cancelled }`; `cancelled=true` marks the cancel path (rolled back to the start value, no `oas-change` follows) |
| `oas-drag-start` | Emitted after the pointer presses and moves effectively (≥ threshold), `detail: { value }` (start value); not emitted for a tap without movement |
| `oas-input` | Emitted live on each value change while dragging / wheel / keyboard, `detail: { value }` (snapped current value) |
| `oas-reset` | Emitted after a reset gesture (double-click / Ctrl+click / `reset()`), `detail: { value, defaultValue }` |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-knob-body` | Knob body color | `var(--oas-color-bg-elevated)` |
| `--oas-knob-fill` | Value arc color (when include-arc is on) | `var(--oas-color-primary)` |
| `--oas-knob-indicator` | Indicator (pointer line / dot) color | `var(--oas-color-text-secondary-strong)` |
| `--oas-knob-size` | Knob diameter (carrier of the size tiers sm=40px / md=56px / lg=72px; override for a custom diameter) | `56px` |
| `--oas-knob-track` | Track arc color (full-range sweep arc) | `var(--oas-color-border)` |
| `--oas-knob-value-color` | show-value text color | `var(--oas-color-text-secondary)` |
