# Combobox

A filterable single-select combobox whose input is the control: **an always-visible editable input** shows the selected label, typing filters options in real time, and `value` takes `option.value` on selection.

> **Positioning vs. Select and AutoComplete**
>
> - **Select**: button-triggered dropdown, the value is limited to options, no always-visible input;
> - **AutoComplete**: free-text suggestion, the value can be any typed content (not necessarily from options);
> - **Combobox**: the input is the control, typing is only for filtering, the value must come from an option (`option.value`).

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-combobox placeholder="Type or select" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"}]'></oas-combobox>
</DemoBlock>

Click/focus to open the dropdown; typing filters in real time (`filterable` is enabled by default, substring-matching the label); `↑`/`↓` move the highlight, `Enter` selects, `Esc` closes.

## Preset Value (controlled)

<DemoBlock title="Preset value (controlled)">
  <oas-combobox value="banana" placeholder="Selected value" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-combobox>
</DemoBlock>

`value` is a controlled property: it is written back after selection; externally changing the property also immediately reflects in the input's label.

## Externally Controlled Value

<DemoBlock title="External controlled value">
  <oas-combobox id="cb-controlled" placeholder="Set value externally via button" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-combobox>
  <oas-button id="cb-set-apple" size="small">Set to Apple</oas-button>
  <oas-button id="cb-clear-value" size="small">Clear value</oas-button>
</DemoBlock>

In controlled mode, the host can drive the component display via the `value` attribute at any time:

## Filtering & Blur Boundaries

<DemoBlock title="Input filtering + blur fallback">
  <oas-combobox value="apple" placeholder="Falls back automatically on blur after typing" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"}]'></oas-combobox>
</DemoBlock>

If you type without selecting and then blur/press `Esc`, the input falls back to the currently selected label (non-destructive by default — the selected value is not lost).

## Not Filterable

<DemoBlock title='Filtering disabled (filterable="false")'>
  <oas-combobox filterable="false" placeholder="No filtering on typing, select via keyboard only" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-combobox>
</DemoBlock>

With `filterable="false"`, typing no longer filters options; select only via keyboard `↑`/`↓` + `Enter` or mouse.

## Clearable

<DemoBlock title="Clearable">
  <oas-combobox clearable value="apple" placeholder="Clearable" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-combobox>
</DemoBlock>

When a value is selected, a clear button appears; clicking clears `value` and dispatches `oas-clear` and `oas-change`.

## Loading

<DemoBlock title="Loading">
  <oas-combobox loading placeholder="Focus to see the loading placeholder" options='[]'></oas-combobox>
</DemoBlock>

While `loading`, the dropdown shows a "加载中…" placeholder (the host sets it during remote data requests).

## Empty State

<DemoBlock title="No options (empty)">
  <oas-combobox placeholder="No options" options='[]'></oas-combobox>
</DemoBlock>

When options are empty, the dropdown shows "暂无选项"; when filtering yields no match, "无匹配选项" is shown.

## Disabled

<DemoBlock title="Disabled">
  <oas-combobox disabled value="apple" placeholder="Disabled" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'></oas-combobox>
</DemoBlock>

## Events

<DemoBlock title="Event output">
  <oas-combobox id="cb-event" clearable placeholder="Type or select" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-combobox>
  <span id="cb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Listen to `oas-input` (filter keyword), `oas-change` (selection), `oas-clear` (clear):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('cb-event')
  const out = document.getElementById('cb-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  el?.addEventListener('oas-input', (e) => set('oas-input', e))
  el?.addEventListener('oas-change', (e) => set('oas-change', e))
  el?.addEventListener('oas-clear', (e) => set('oas-clear', e))

  // controlled value demo: the host drives the value attribute externally
  const controlled = document.getElementById('cb-controlled')
  document.getElementById('cb-set-apple')?.addEventListener('click', () => {
    controlled?.setAttribute('value', 'apple')
  })
  document.getElementById('cb-clear-value')?.addEventListener('click', () => {
    controlled?.removeAttribute('value')
  })
})
</script>

## API

| Property         | Description                                                           | Default  |
| ---------------- | --------------------------------------------------------------------- | -------- |
| `value`          | Current value (controlled, the selected option's `option.value`)      | —        |
| `options`        | Options, JSON array `[{ label, value, disabled? }]`                  | `[]`     |
| `placeholder`    | Placeholder text                                                      | `请选择` |
| `disabled`       | Disabled (no input, no dropdown)                                      | `false`  |
| `clearable`      | Clearable (shows a clear button when a value exists; clearing dispatches `oas-clear`) | `false` |
| `loading`        | Loading placeholder (dropdown shows "加载中…")                         | `false`  |
| `filterable`     | Filter labels in real time while typing (`filterable="false"` disables local filtering) | `true` |

Keyboard: `Enter` / focus to open, `↑`/`↓` to move the highlight, `Enter` to select, `Esc` to close and revert.

| Event         | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `oas-change`  | Selection/clear change, `detail: { value }`                |
| `oas-input`   | Filter keyword typed, `detail: { value }`                  |
| `oas-clear`   | Clear button clicked, `detail: { value }` (value before clearing) |
