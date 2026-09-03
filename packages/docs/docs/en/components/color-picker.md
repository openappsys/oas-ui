# ColorPicker

Click the trigger swatch to open a color panel with a 2D saturation-brightness field + vertical hue rail, preset colors, RGB and hex input, an alpha channel, a gradient mode (multi-stop editing), tolerant value parsing, clearing and a controlled open state; it can also render inline without a popup. The popup panel is positioned with a fixed viewport anchor and auto-flips / clamps at viewport edges.

## Basic Usage

<DemoBlock title="Basic">
  <oas-color-picker id="cp-basic" value="#0b6cff"></oas-color-picker>
</DemoBlock>

Click the trigger to toggle the panel; pick saturation and brightness on the 2D color field, pick hue on the vertical hue rail, or edit the RGB numbers / pick a preset color for an instant update. With the trigger focused, press `Esc` or click outside to close.

## Custom Preset Colors

<DemoBlock title="Custom preset (any CSS color + labeled items + rows/columns)">
  <oas-color-picker id="cp-presets" preset-columns="5" preset-rows="2"
    preset='[{"color":"#0b6cff","label":"Brand blue"},{"color":"#16a34a","label":"Success green"},{"color":"red","label":"Red"},{"color":"hsl(35,100%,50%)","label":"Brand orange"},{"color":"#9333ea","label":"Brand purple"},{"color":"#18181b","label":"Ink black"},{"color":"transparent","label":"Transparent"},{"color":"rgba(255,0,0,0.4)","label":"Semi-transparent red"},{"color":"#0ea5e9","label":"Sky blue"},{"color":"#e4e4e7","label":"Light gray"}]'></oas-color-picker>
</DemoBlock>

`preset` takes a JSON array: items may be any CSS color string (color names, `rgb()`, `hsl()`, hex — parsed tolerantly), or `{ color, label }` objects where `label` becomes the swatch's accessible name for screen readers. `preset-columns` / `preset-rows` set the number of columns and visible rows (extra items are truncated).

## Disabled and Readonly

<DemoBlock title="disabled / readonly">
  <oas-color-picker value="#dc2626" disabled></oas-color-picker>
  <oas-color-picker id="cp-readonly" value="#0b6cff" readonly></oas-color-picker>
</DemoBlock>

`disabled` fully disables the picker (grayed-out trigger, not clickable); `readonly` shows the current color without allowing changes — the trigger cannot open the panel and no open events are emitted.

## Sizes

<DemoBlock title="size levels">
  <oas-color-picker value="#16a34a" size="small"></oas-color-picker>
  <oas-color-picker value="#16a34a"></oas-color-picker>
  <oas-color-picker value="#16a34a" size="large"></oas-color-picker>
</DemoBlock>

`size="large"` / default / `size="small"` reuse the `--oas-control-height-*` control height tokens.

## Alpha Channel

<DemoBlock title="Alpha (show-alpha / disabled-alpha)">
  <oas-color-picker id="cp-alpha" show-alpha value="#0b6cff80"></oas-color-picker>
  <oas-color-picker id="cp-alpha-lock" show-alpha disabled-alpha value="#9333ea99"></oas-color-picker>
  <span id="cp-alpha-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

`show-alpha` reveals the alpha slider and a checkerboard backdrop — translucent swatches show the checker pattern and values serialize as 8-digit hex (`#rrggbbaa`), or `rgba()` when combined with `color-format="rgb"`. `disabled-alpha` keeps the channel visible but disables the slider (existing transparency is preserved).

## Format and Tolerant Parsing

<DemoBlock title="Tolerant parsing + color-format + uppercase">
  <oas-color-picker id="cp-format" value="red" color-format="rgb"></oas-color-picker>
  <oas-color-picker id="cp-upper" value="#0b6cff" uppercase></oas-color-picker>
  <oas-color-picker value="hsl(200, 90%, 55%)"></oas-color-picker>
</DemoBlock>

`value` parses CSS color names, `rgb()/hsl()` and 3/4/6/8-digit hex and normalizes them for display. `color-format="rgb"` switches display and commit to `rgb()/rgba()`; `uppercase` serializes hex in capitals.

## Empty Value and Clearing

<DemoBlock title="clearable + value-on-clear">
  <oas-color-picker id="cp-clear" value="#16a34a" clearable></oas-color-picker>
  <span id="cp-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-color-picker value="#16a34a" clearable value-on-clear="#000000"></oas-color-picker>
</DemoBlock>

With `clearable`, an open panel shows a clear button: clearing empties `value` and renders the "not selected" placeholder, emitting `oas-clear` (detail carries the previous value) and `oas-change` (empty detail). `value-on-clear` sets the value to fall back to after clearing (e.g. `#000000`).

## Custom Trigger

<DemoBlock title="Custom trigger slot + show-text">
  <oas-color-picker id="cp-slot" show-text value="#0b6cff">
    <span slot="trigger" style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      Theme color
    </span>
  </oas-color-picker>
  <oas-color-picker value="#0b6cff" show-text="false"></oas-color-picker>
</DemoBlock>

`slot="trigger"` fully customizes the trigger content (the value text can still be shown next to it); `show-text="false"` hides the value text (default is `true`).

## Controlled Open

<DemoBlock title="Controlled open + oas-open-change">
  <oas-color-picker id="cp-ctrl" value="#d97706"></oas-color-picker>
  <button id="cp-open-btn" type="button" style="height: var(--oas-control-height-md); padding: 0 var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-sm); background: var(--oas-color-bg); color: var(--oas-color-text-primary); cursor: pointer">Open</button>
  <button id="cp-close-btn" type="button" style="height: var(--oas-control-height-md); padding: 0 var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-sm); background: var(--oas-color-bg); color: var(--oas-color-text-primary); cursor: pointer">Close</button>
  <span id="cp-ctrl-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

The `open` attribute is the single source of truth (controlled both ways): external `setAttribute/removeAttribute('open')` and internal clicks / outside clicks / `Esc` converge on it, and every change emits `oas-open-change` (detail `{ open }`). Setting `open` initially does not emit.

## Eyedropper

<DemoBlock title="Eyedropper (EyeDropper)">
  <oas-color-picker id="cp-eye" value="#dc2626"></oas-color-picker>
  <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Chromium only: open the panel and click the eyedropper icon, then pick a color anywhere on screen. On unsupported browsers the button is hidden.</span>
</DemoBlock>

## Edge Avoidance (right-edge trigger reproduction)

<DemoBlock title="Right-edge trigger no longer overflows or clips (fix verification)">
  <div style="box-sizing: border-box; width: 240px; margin-left: auto; overflow: hidden; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3); background: var(--oas-color-bg-hover); display: flex; justify-content: flex-end">
    <oas-color-picker id="cp-edge" placement="bottom-end" value="#0b6cff"></oas-color-picker>
  </div>
  <span id="cp-edge-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2)">Appearance-tab style right-aligned scenario: a narrow right-aligned container with `overflow: hidden`. The panel uses fixed viewport anchoring (12-way `placement`, default `bottom`), so it always stays inside the viewport instead of widening the page or being clipped by ancestors — it clamps or flips when space runs out.</p>
</DemoBlock>

## 2D Color Field

The three H/S/V tracks were refactored into a more standard two-dimensional picker: an SV field (saturation horizontally, brightness vertically) plus a vertical hue rail. Both support pointer dragging and arrow-key stepping, with `role="slider"` + `aria-valuetext` semantics exposing both dimensions.

<DemoBlock title="2D color field + hue rail">
  <oas-color-picker id="cp-2d" value="#0b6cff"></oas-color-picker>
  <span id="cp-2d-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 130px"></span>
</DemoBlock>

## Gradient Mode

Set `mode="gradient"` to enter gradient editing: every stop on the gradient axis is colored independently — add / remove / drag / nudge stops, and `value` serializes to a `linear-gradient(...)` string.

<DemoBlock title="Gradient (mode=gradient)">
  <oas-color-picker id="cp-grad" mode="gradient"
    value="linear-gradient(90deg, #0b6cff 0%, #16a34a 100%)"></oas-color-picker>
  <span id="cp-grad-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px; word-break: break-all"></span>
</DemoBlock>

<DemoBlock title="Gradient + alpha (show-alpha)">
  <oas-color-picker mode="gradient" show-alpha
    value="linear-gradient(90deg, #0b6cff 0%, #16a34a 100%)"></oas-color-picker>
</DemoBlock>

## Inline Standalone Panel

`inline` renders the panel in place (no trigger / popup), so hosts composing their own overlay reuse the same color controls directly.

<DemoBlock title="inline (panel only)">
  <oas-color-picker inline id="cp-inline" value="#9333ea"></oas-color-picker>
  <oas-color-picker inline mode="gradient" value="linear-gradient(90deg, #d97706 0%, #dc2626 100%)"></oas-color-picker>
  <span id="cp-inline-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-color-picker id="cp-event" value="#0b6cff"></oas-color-picker>
  <span id="cp-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
function on(id, type, fn) {
  document.getElementById(id)?.addEventListener(type, fn)
}
function out(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}
onMounted(() => {
  on('cp-event', 'oas-change', (e) => out('cp-output', `oas-change: ${e.detail.value}`))
  on('cp-alpha', 'oas-change', (e) => out('cp-alpha-output', `oas-change: ${e.detail.value}`))
  on('cp-clear', 'oas-clear', (e) => out('cp-clear-output', `oas-clear: removed ${e.detail.value}`))
  on('cp-ctrl', 'oas-open-change', (e) => out('cp-ctrl-output', `oas-open-change: ${e.detail.open}`))
  on('cp-open-btn', 'click', () => document.getElementById('cp-ctrl')?.setAttribute('open', ''))
  on('cp-close-btn', 'click', () => document.getElementById('cp-ctrl')?.removeAttribute('open'))
  on('cp-edge', 'oas-open-change', (e) =>
    out('cp-edge-output', `Open: panel placement ${e.target.shadowRoot?.querySelector('[part="panel"]')?.getAttribute('data-placement') ?? ''}, stays inside the viewport`),
  )
  on('cp-2d', 'oas-change', (e) => out('cp-2d-output', `oas-change: ${e.detail.value}`))
  on('cp-grad', 'oas-change', (e) => out('cp-grad-output', `oas-change: ${e.detail.value}`))
  on('cp-inline', 'oas-change', (e) => out('cp-inline-output', `oas-change: ${e.detail.value}`))
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clearable` | — | `boolean` | — |
| `color-format` | — | `string` | `hex` |
| `disabled` | Disabled | `boolean` | — |
| `disabled-alpha` | — | `boolean` | — |
| `inline` | — | `boolean` | — |
| `mode` | — | `string` | `single` |
| `open` | — | `boolean` | — |
| `placement` | — | `string` | `bottom` |
| `preset` | Preset color array (JSON) | `string` | — |
| `preset-columns` | — | `string` | — |
| `preset-rows` | — | `string` | — |
| `readonly` | — | `boolean` | — |
| `show-alpha` | — | `boolean` | — |
| `show-text` | — | `string` | `true` |
| `size` | — | — | — |
| `uppercase` | — | `boolean` | — |
| `value` | Current color (hex) | `string` | — |
| `value-on-clear` | — | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Color change, `detail: { value }` |
| `oas-clear` | — |
| `oas-open-change` | — |

### Slots

| Name | Description |
| --- | --- |
| `trigger` | — |

Keyboard: with the trigger button focused, `Enter`/`Space` toggles the panel and `Esc` closes it; `Esc` also closes from a focused panel input, and clicking outside closes.
