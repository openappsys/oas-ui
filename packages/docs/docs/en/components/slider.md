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

## Marks (object)

<DemoBlock title="Marks object: value → label map">
  <oas-slider marks='{"0":"0°C","26":"26°C","60":"60°C"}' min="0" max="100" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## Marks (array)

<DemoBlock title="Marks array: values only, labels fall back to the numeric text">
  <oas-slider marks="[0,25,50,75,100]" min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

While dragging, tick marks and labels reached by the current value are highlighted with the theme color. `marks` supports both a JSON object `{"value":"label"}` and a JSON array `[value, value]` (array elements may also be `{"value": 26, "label": "26°C"}`).

## With Input

<DemoBlock title="show-input numeric input linkage">
  <oas-slider show-input min="0" max="100" value="40" style="width: 360px"></oas-slider>
</DemoBlock>

The numeric input on the right stays in sync with the slider in both directions: dragging updates the input live; typing takes effect after a 300ms debounce and is automatically clamped to the `min`/`max` range, Enter/blur commits immediately.

## Range Mode

<DemoBlock title="range dual-thumb interval + dual inputs">
  <oas-slider range show-input min="0" max="100" value="[20, 80]" style="width: 360px"></oas-slider>
</DemoBlock>

`range` enables dual-thumb interval selection. `value` is a JSON array `[lo, hi]` or a comma-separated string `"lo,hi"`; combined with `show-input` you can edit the min/max inputs separately. Out-of-range inputs follow the "push along" rule: typing a min beyond max pushes max along, and vice versa.

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

## Reverse

<DemoBlock title="reverse direction (min on the right)">
  <oas-slider reverse min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

`reverse` flips the value direction so the minimum sits on the right; the fill, ticks and custom thumb positions mirror accordingly.

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
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | `boolean` | — |
| `marks` | Ticks: JSON object `{"0":"0°C"}` (value→label) or JSON array `[0,26,60]` (also `{"value":26,"label":"26°C"}`); tick marks and labels are shown below the track, highlighted where the value passes; positions mirror under `reverse` | `string \| Record<string, string \| number> \| number[]` | — |
| `max` | Range | `string` | `100` |
| `min` | Range | `string` | `0` |
| `range` | Range mode: dual-thumb interval selection, `value` as JSON array `[lo, hi]` or comma-separated string `"lo,hi"`; thumbs constrain each other (lo ≤ hi), event `detail.value` is an array | `boolean` | — |
| `reverse` | Reversed direction: minimum on the right (track `dir="rtl"`), fill/ticks/custom thumb positions mirror | `boolean` | — |
| `show-input` | Show a numeric input on the right, synced bidirectionally with the slider: dragging updates the input live; typing commits after a 300ms debounce and is clamped to `min`/`max`, Enter/blur commits immediately; range mode shows min/max inputs (min beyond max pushes max along) | `boolean` | — |
| `show-tooltip` | Show a value bubble above the thumb (temporarily shown while dragging; coexists with `custom-thumb`) | `boolean` | — |
| `step` | Step | `string` | `1` |
| `value` | Current value (controlled): numeric string for single mode; JSON array or comma-separated string for `range` mode | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Committed on release, `detail: { value }` (single number; `[lo, hi]` array in `range` mode) |
| `oas-input` | While dragging / after debounced typing commit, `detail: { value }` (single number; `[lo, hi]` array in `range` mode) |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="custom-thumb"]` | Custom thumb content (icon/text): `template[slot="custom-thumb"]` (static template, cloned into every visible thumb — both thumbs in range mode) or a plain `[slot="custom-thumb"]` element |
