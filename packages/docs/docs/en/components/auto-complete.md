# AutoComplete

Type to get suggestions, with keyboard up/down selection, Enter to confirm, and Esc to close.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-auto-complete placeholder='Type "app" to try' options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"}]'></oas-auto-complete>
</DemoBlock>

Typing keywords auto-filters matching items in the dropdown; `↑`/`↓` move the highlight, `Enter` selects, `Esc` closes.

## Preset Value

<DemoBlock title="Preset value">
  <oas-auto-complete value="Apple" placeholder="Selected value" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## Disabled

<DemoBlock title="Disabled">
  <oas-auto-complete disabled placeholder="Not editable" options='[{"label":"Apple","value":"apple"}]'></oas-auto-complete>
</DemoBlock>

## No Match

<DemoBlock title="Empty state">
  <oas-auto-complete placeholder='Type "pear" to try (no match)' options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## Events

<DemoBlock title="Input & selection events">
  <oas-auto-complete id="ac-event" placeholder="Type or select" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-auto-complete>
  <span id="ac-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

Listen to `oas-input` (while typing) and `oas-change` (on selection):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ac-event')
  const out = document.getElementById('ac-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.label}`
  })
})
</script>

## API

| Property       | Description                                      | Default |
| -------------- | ------------------------------------------------ | ------- |
| `value`        | Preset value                                     | —       |
| `options`      | Options, JSON array `[{ label, value, disabled }]`| `[]`    |
| `placeholder`  | Placeholder text                                 | —       |
| `disabled`     | Disabled                                         | `false` |

Keyboard: `↑`/`↓` to move, `Enter` to select, `Esc` to close.

| Event         | Description                         |
| ------------- | ----------------------------------- |
| `oas-input`   | While typing, `detail: { value }`   |
| `oas-change`  | Selected, `detail: { value, label }`|
