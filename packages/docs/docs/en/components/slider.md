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

While dragging, tick marks and labels reached by the current value are highlighted with the theme color. `marks` supports both a JSON object `{"值":"标签"}` and a JSON array `[值, 值]` (array elements may also be `{"value": 26, "label": "26°C"}`).

## Events

<DemoBlock title="Live value & change events">
  <oas-slider id="slider-event" value="40" style="width: 320px"></oas-slider>
  <span id="slider-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
</DemoBlock>

`oas-input` fires while dragging, `oas-change` fires on release; both `detail.value` are numbers:

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
})
</script>

## API

### Attributes

| Attribute  | Description                                                                                                                                                                                        | Type                                                     | Default |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------- |
| `disabled` | Disabled                                                                                                                                                                                           | `boolean`                                                | —       |
| `marks`    | Ticks: JSON object `{"0":"0°C"}` (value→label) or JSON array `[0,26,60]` (also `{"value":26,"label":"26°C"}`); tick marks and labels are shown below the track, highlighted where the value passes | `string \| Record<string, string \| number> \| number[]` | —       |
| `max`      | Range                                                                                                                                                                                              | `string`                                                 | `100`   |
| `min`      | Range                                                                                                                                                                                              | `string`                                                 | `0`     |
| `step`     | Step                                                                                                                                                                                               | `string`                                                 | `1`     |
| `value`    | Current value (controlled)                                                                                                                                                                         | `string`                                                 | —       |

### Events

| Event        | Description                               |
| ------------ | ----------------------------------------- |
| `oas-change` | Committed on release, `detail: { value }` |
| `oas-input`  | While dragging, `detail: { value }`       |
