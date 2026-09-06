# Slider

A slider built on an enhanced native `<input type="range">`.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-slider style="width: 320px"></oas-slider>
</DemoBlock>

## Range & Step

<DemoBlock title="min / max / step">
  <oas-slider min="0" max="100" step="10" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## Disabled

<DemoBlock title="Disabled">
  <oas-slider disabled value="50" style="width: 320px"></oas-slider>
</DemoBlock>

## Readonly

<DemoBlock title="readonly (focusable, not dimmed, not draggable)">
  <oas-slider readonly value="40" style="width: 320px"></oas-slider>
</DemoBlock>

`readonly` is independent of `disabled`: a readonly slider stays focusable and its value still participates in form collection, but dragging and keyboard edits are intercepted; visually it is not dimmed (unlike the disabled state) — suitable for configuration summaries.

## Marks (object)

<DemoBlock title="Marks object: value → label map">
  <oas-slider marks='{"0":"0°C","26":"26°C","60":"60°C"}' min="0" max="100" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## Marks (array)

<DemoBlock title="Marks array: values only, labels fall back to the numeric text">
  <oas-slider marks="[0,25,50,75,100]" min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

While dragging, tick marks and labels reached by the current value are highlighted with the theme color. `marks` supports both a JSON object `{"value":"label"}` and a JSON array `[value, value]` (array elements may also be `{"value": 26, "label": "26°C"}`).

## Marks-only values (step="mark")

<DemoBlock title="step=mark: values snap to marks (XS/S/M/XL discrete choice)">
  <oas-slider step="mark" marks='{"0":"XS","30":"S","60":"M","100":"XL"}' min="0" max="100" value="30" style="width: 360px"></oas-slider>
</DemoBlock>

The special value `step="mark"` restricts selectable values to the `marks` value set: dragging and the keyboard (arrows jump between marks, Shift/PageUp jump 3 marks at a time, Home/End go to the first/last mark) all snap to the nearest mark; continuous values outside marks are not selectable. Requires `marks`; without marks it falls back to a plain step of 1.

## Tick stops (show-stops)

<DemoBlock title="show-stops: tick dots by step (no label data needed)">
  <oas-slider show-stops step="10" min="0" max="100" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

`show-stops` renders tick dots along the track by `step` (no labels), highlighted where passed; independent of `marks` — when both exist, marks take precedence (no stacking). Dots are not rendered when they exceed 100 (DOM explosion guard).

## With Input

<DemoBlock title="show-input numeric input linkage">
  <oas-slider show-input min="0" max="100" value="40" style="width: 360px"></oas-slider>
</DemoBlock>

The numeric input on the right stays in sync with the slider in both directions: dragging updates the input live; typing takes effect after a 300ms debounce and is automatically clamped to the `min`/`max` range, Enter/blur commits immediately.

## Range Mode

<DemoBlock title="range dual-thumb interval + dual inputs">
  <oas-slider id="slider-range" range show-input min="0" max="100" value="[20, 80]" style="width: 360px"></oas-slider>
</DemoBlock>

`range` enables dual-thumb interval selection. `value` is a JSON array `[lo, hi]` or a comma-separated string `"lo,hi"`; combined with `show-input` you can edit the min/max inputs separately. Out-of-range inputs follow the "push along" rule: typing a min beyond max pushes max along, and vice versa. After interaction the `value` attribute is written back as a JSON array string, ready for `JSON.parse` in form collection.

## Custom Thumb

<DemoBlock title="custom-thumb icon thumb + value bubble">
  <oas-slider show-tooltip min="0" max="100" value="60" style="width: 320px">
    <template slot="custom-thumb">🎯</template>
  </oas-slider>
</DemoBlock>

<DemoBlock title="Value bubble only (no custom content)">
  <oas-slider show-tooltip min="0" max="100" value="40" style="width: 320px"></oas-slider>
</DemoBlock>

Customize the thumb content (icon/text) via `template[slot="custom-thumb"]` (or a plain `[slot="custom-thumb"]` element); the content is cloned into every visible thumb. `show-tooltip` shows a value bubble above the thumb, and both coexist. In range mode the template is cloned into both the min and max thumbs.

## Value bubble formatting & always-on

<DemoBlock title="format template string: ${value} placeholder (bubble and screen reader share the source)">
  <oas-slider show-tooltip format="${value}%" min="0" max="100" value="40" style="width: 320px"></oas-slider>
</DemoBlock>

<DemoBlock title="formatTooltip function channel + tooltip-always (currency format)">
  <oas-slider id="slider-fn-format" tooltip-always min="0" max="500" step="10" value="120" style="width: 360px"></oas-slider>
</DemoBlock>

<DemoBlock title="tooltip-position bubble direction (bottom)">
  <oas-slider show-tooltip tooltip-position="bottom" min="0" max="100" value="40" style="width: 320px"></oas-slider>
</DemoBlock>

Bubble content supports dual-channel formatting; the output feeds both the bubble and `aria-valuetext` (screen reader matches the visual):

- `format` attribute: a template string where `${value}` is replaced with the current value (e.g. `"${value}%"`, `"¥${value}"`); shown as-is when no placeholder is present;
- `el.formatTooltip` function property: assign in JS as `el.formatTooltip = (value) => string`, suited to Intl currency/unit closures; takes precedence over `format`, clear with `null`.

Visibility: shown while dragging or when keyboard-focused by default; `tooltip-always` keeps it visible; `tooltip-position` switches the direction (top/bottom/left/right; top by default horizontally, right by default vertically).

## Fill start point (start-point)

<DemoBlock title="start-point: fill extends from the midpoint (thermometer)">
  <oas-slider start-point="0" min="-50" max="50" value="12" show-input style="width: 360px"></oas-slider>
</DemoBlock>

`start-point` sets the fill origin for single-value mode (default `min`): the fill extends right when the value is above the start, left when below — ideal for ± intervals (temperature/gain). The start is clamped to `[min, max]`; ignored in `range` mode (the interval fill is determined by both thumbs).

## Sizes

<DemoBlock title="size sm / md / lg">
  <div style="display: flex; flex-direction: column; gap: 16px; width: 360px;">
    <oas-slider size="sm" value="30"></oas-slider>
    <oas-slider value="50"></oas-slider>
    <oas-slider size="lg" value="70"></oas-slider>
  </div>
</DemoBlock>

`size` switches three track/thumb sizes (also accepts `small`/`medium`/`large`, supports config-provider injection); invalid values fall back to md.

## Colors

<DemoBlock title="color / track-color">
  <div style="display: flex; flex-direction: column; gap: 16px; width: 360px;">
    <oas-slider color="success" value="60"></oas-slider>
    <oas-slider color="danger" track-color="var(--oas-color-bg-hover)" value="40"></oas-slider>
  </div>
</DemoBlock>

`color` controls the fill/thumb/passed-tick color and `track-color` the track base color: preset semantic names (`primary`/`success`/`warning`/`danger`, following dark theme automatically) map to theme tokens; any other value (e.g. `#ff5500`, `var(--x)`) is passed through as a CSS color.

## Vertical

<DemoBlock title="vertical sliders (volume/brightness panel)">
  <div style="display: flex; gap: 56px; align-items: flex-start;">
    <oas-slider vertical value="40"></oas-slider>
    <oas-slider vertical show-tooltip value="65" style="--oas-slider-height: 220px"></oas-slider>
    <oas-slider vertical marks='{"0":"Mute","50":"Mid","100":"Max"}' value="30"></oas-slider>
    <oas-slider vertical range value="[20, 80]"></oas-slider>
    <oas-slider vertical show-input value="40"></oas-slider>
  </div>
</DemoBlock>

`vertical` switches to a vertical slider (minimum at the bottom; `reverse` mirrors to the top): mark labels move to the right of the track, the value bubble faces right by default, and `show-input` inputs move below the track. Height defaults to 200px, adjustable via the `--oas-slider-height` CSS variable.

## Reverse

<DemoBlock title="reverse direction (min on the right)">
  <oas-slider reverse min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

`reverse` flips the value direction so the minimum sits on the right; the fill, ticks and custom thumb positions mirror accordingly. In vertical mode `reverse` puts the minimum at the top.

## Keyboard

<DemoBlock title="Keyboard large step (large-step)">
  <oas-slider large-step="25" show-tooltip value="50" min="0" max="100" style="width: 320px"></oas-slider>
</DemoBlock>

With the thumb focused: arrows / Home / End keep the native browser stepping; Shift + arrows and PageUp / PageDown step by the large amount = `large-step` (default 10 × step), unified across browsers (smoothing over Firefox's native PageUp differences). Each key press commits immediately (emits `oas-input` + `oas-change`).

## Slider with label

<DemoBlock title="oas-form-item composition (label + slider layout)">
  <div style="display: flex; flex-direction: column; gap: 12px; width: 420px;">
    <oas-form-item label="Volume">
      <oas-slider show-tooltip value="40"></oas-slider>
    </oas-form-item>
    <oas-form-item label="Brightness">
      <oas-slider value="65"></oas-slider>
    </oas-form-item>
    <oas-form-item label="Contrast">
      <oas-slider range value="[20, 80]"></oas-slider>
    </oas-form-item>
  </div>
</DemoBlock>

The slider has no built-in visible label (avoiding duplication with the form label system): use `oas-form-item`'s `label` for a visible label (clicking the label focuses the slider), or lay out a heading + slider yourself.

## Events

<DemoBlock title="Live value & change events">
  <oas-slider id="slider-event" value="40" style="width: 320px"></oas-slider>
  <span id="slider-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
</DemoBlock>

<DemoBlock title="Range mode events (detail.value is an array)">
  <oas-slider id="slider-range-event" range min="0" max="100" value="[20, 80]" style="width: 320px"></oas-slider>
  <span id="slider-range-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

`oas-input` fires while dragging, `oas-change` fires on release: `detail.value` is a number in single mode and a `[lo, hi]` array in range mode:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('slider-event')
  const out = document.getElementById('slider-output')
  const show = (label, v) => {
    out.textContent = `${label}: ${v}`
  }
  el?.addEventListener('oas-input', (e) => show('oas-input', e.detail.value))
  el?.addEventListener('oas-change', (e) => show('oas-change', e.detail.value))

  const rel = document.getElementById('slider-range-event')
  const rout = document.getElementById('slider-range-output')
  const showRange = (label, v) => {
    rout.textContent = `${label}: [${v[0]}, ${v[1]}]`
  }
  rel?.addEventListener('oas-input', (e) => showRange('oas-input', e.detail.value))
  rel?.addEventListener('oas-change', (e) => showRange('oas-change', e.detail.value))

  // formatTooltip function channel: Intl currency formatting (takes precedence over format)
  const fnEl = document.getElementById('slider-fn-format')
  if (fnEl) {
    fnEl.formatTooltip = (v) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | Fill/thumb/passed-tick color: preset semantic names (primary / success / warning / danger, following dark theme) map to theme tokens; any other value is passed through as a CSS color | — | — |
| `disabled` | Disabled | `boolean` | — |
| `format` | Value bubble template string: `${value}` is replaced with the current value (e.g. `"${value}%"`); shown as-is without a placeholder; the output feeds both the bubble and `aria-valuetext`; lower priority than the `formatTooltip` function | `string` | — |
| `large-step` | Keyboard large step amount (Shift+arrows / PageUp / PageDown); defaults to 10 × step; each key press emits `oas-input` + `oas-change` | `string` | — |
| `marks` | Ticks: JSON object `{"0":"0°C"}` (value→label) or JSON array `[0,26,60]` (also `{"value":26,"label":"26°C"}`); tick marks and labels are shown below the track, highlighted where the value passes; positions mirror under `reverse` | `string \| Record<string, string \| number> \| number[]` | — |
| `max` | Range | `string` | `100` |
| `min` | Range | `string` | `0` |
| `range` | Range mode: dual-thumb interval selection, `value` as JSON array `[lo, hi]` or comma-separated string `"lo,hi"`; thumbs constrain each other (lo ≤ hi), event `detail.value` is an array | `boolean` | — |
| `readonly` | Readonly (independent of `disabled`): stays focusable and the value still participates in form collection; dragging and keyboard edits are intercepted; not visually dimmed | `boolean` | — |
| `reverse` | Reversed direction: minimum on the right horizontally (track `dir="rtl"`), at the top vertically; fill/ticks/custom thumb positions mirror accordingly | `boolean` | — |
| `show-input` | Show a numeric input on the right, synced bidirectionally with the slider: dragging updates the input live; typing commits after a 300ms debounce and is clamped to `min`/`max`, Enter/blur commits immediately; range mode shows min/max inputs (min beyond max pushes max along) | `boolean` | — |
| `show-stops` | Render tick dots along the track by `step` (no labels), highlighted where passed; marks take precedence when both exist; dots are not rendered beyond 100 | `boolean` | — |
| `show-tooltip` | Show a value bubble above the thumb (temporarily shown while dragging; coexists with `custom-thumb`) | `boolean` | — |
| `size` | Three sizes: sm / md / lg (also accepts small / medium / large, supports config-provider injection); track height and thumb diameter scale together; invalid values fall back to md | `string` | `medium` |
| `start-point` | Fill origin for single-value mode (default `min`): the fill extends right above the start and left below it; clamped to `[min, max]`; ignored in `range` mode | `string` | — |
| `step` | Step; the special value `"mark"` restricts selectable values to the `marks` set (dragging/keyboard/controlled values snap to the nearest mark; requires `marks`, falls back to 1) | `string` | `1` |
| `tooltip-always` | Keep the value bubble always visible (by default shown while dragging or keyboard-focused) | `boolean` | — |
| `tooltip-position` | Value bubble direction: top / bottom / left / right; top by default horizontally, right by default vertically; invalid values fall back to the default | `string` | — |
| `track-color` | Track base color: preset semantic names map to theme tokens; any other value is passed through as a CSS color | — | — |
| `value` | Current value (controlled): numeric string for single mode; JSON array `[lo, hi]` or comma-separated string `"lo,hi"` in `range` mode, written back as a JSON array string after interaction (form collection can `JSON.parse` directly) | `string` | — |
| `vertical` | Vertical mode: the track runs vertically (minimum at the bottom, mirrored to the top by `reverse`); mark labels move to the right of the track, the value bubble faces right by default, show-input inputs move below the track; height defaults to 200px, adjustable via the `--oas-slider-height` CSS variable | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Committed on release, `detail: { value }` (single number; `[lo, hi]` array in `range` mode) |
| `oas-input` | While dragging / after debounced typing commit, `detail: { value }` (single number; `[lo, hi]` array in `range` mode) |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="custom-thumb"]` | Custom thumb content (icon/text): `template[slot="custom-thumb"]` (static template, cloned into every visible thumb — both thumbs in range mode) or a plain `[slot="custom-thumb"]` element |

`marks` also accepts a JS property channel (assign objects/arrays directly, reflected as a JSON attribute); `el.formatTooltip = (value) => string | number` is the value formatter function property (the output feeds both the value bubble and `aria-valuetext`, takes precedence over the `format` attribute, clear with `null`) — attributes cannot express function semantics, so the function channel is JS-property-only.
