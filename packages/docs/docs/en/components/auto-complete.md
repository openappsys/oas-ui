# AutoComplete

Type to get suggestions, with keyboard up/down selection, Enter to confirm, and Esc to close.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-auto-complete placeholder="输入「苹」试试" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-auto-complete>
</DemoBlock>

Typing keywords auto-filters matching items in the dropdown; `↑`/`↓` move the highlight, `Enter` selects, `Esc` closes.

## Preset Value

<DemoBlock title="Preset value">
  <oas-auto-complete value="苹果" placeholder="已选中的值" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## Disabled

<DemoBlock title="Disabled">
  <oas-auto-complete disabled placeholder="不可输入" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
</DemoBlock>

## No Match

<DemoBlock title="Empty state">
  <oas-auto-complete placeholder="输入「梨」试试（无匹配）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## Events

<DemoBlock title="Input & selection events">
  <oas-auto-complete id="ac-event" placeholder="输入或选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
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
