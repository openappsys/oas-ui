# InputNumber

An enhanced native `<input type="number">` with stepper buttons and range constraints.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-input-number value="5" style="width: 160px"></oas-input-number>
</DemoBlock>

## Range & Step

<DemoBlock title="min / max / step">
  <oas-input-number value="50" min="0" max="100" step="5" style="width: 160px"></oas-input-number>
</DemoBlock>

Values beyond `min` / `max` are clamped; the corresponding stepper button is automatically disabled when a boundary is reached.

## Precision

<DemoBlock title="precision">
  <oas-input-number value="1.5" step="0.1" precision="2" style="width: 160px"></oas-input-number>
</DemoBlock>

`precision` controls the number of decimal places for stepping and clamping.

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

`label` serves as the accessible name (`aria-label`) for the input: once set, screen readers announce it; when unset, it falls back to the built-in text "数字输入框" (InputNumber has no `placeholder` fallback chain). The stepper buttons "增加 / 减少" also use built-in text for their accessible names.

## Events

<DemoBlock title="Change events">
  <oas-input-number id="num-event" value="5" min="0" max="10" style="width: 160px"></oas-input-number>
  <span id="num-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

Listen to `oas-change` (fires on stepping or blur, `detail: { value }`):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('num-event')
  const out = document.getElementById('num-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
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
| `disabled` | Disabled | — | — |
| `label` | Accessible name (`aria-label` source; falls back to built-in "数字输入框" when unset) | — | — |
| `max` | Range, out-of-range values are clamped automatically | — | — |
| `min` | Range, out-of-range values are clamped automatically | — | — |
| `precision` | Number of decimal places | — | — |
| `step` | Step | — | `1` |
| `value` | Current value (controlled) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Change on step or blur, `detail: { value }` (number) |
