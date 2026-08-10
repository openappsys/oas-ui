# DynamicInput

Add/remove/edit for array fields; each row reuses the `oas-input` component, supporting both controlled and uncontrolled modes.

## Basic Usage

<DemoBlock title="Add/remove list">
  <oas-dynamic-input model-value='["vue","react"]'></oas-dynamic-input>
</DemoBlock>

`model-value` is a JSON array attribute (also assignable via property); each row has an input + remove button, with an "添加" button at the end.

## Default Value

<DemoBlock title="default-value">
  <oas-dynamic-input default-value="New row"></oas-dynamic-input>
</DemoBlock>

New rows start with `default-value` as their initial value.

## min / max Boundaries

<DemoBlock title="min=2 fills up rows">
  <oas-dynamic-input min="2" model-value='["a"]'></oas-dynamic-input>
</DemoBlock>

Under `min`, rows are auto-filled; when `min` is reached, remove buttons are disabled.

<DemoBlock title="max=3 disables adding">
  <oas-dynamic-input max="3" model-value='["a","b","c"]'></oas-dynamic-input>
</DemoBlock>

When `max` is reached, the "添加" button is disabled; an over-long `model-value` is truncated automatically.

## Disabled

<DemoBlock title="disabled">
  <oas-dynamic-input disabled model-value='["vue"]'></oas-dynamic-input>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-dynamic-input id="dyn-event" model-value='["a"]'></oas-dynamic-input>
  <span id="dyn-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

Listen to `oas-change` (`detail: { value: string[] }`):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('dyn-event')
  const out = document.getElementById('dyn-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${JSON.stringify(e.detail.value)}`
  })
})
</script>

## API

| Property         | Description                             | Default |
| ---------------- | --------------------------------------- | ------- |
| `model-value`    | String array (property or JSON)         | `[]`    |
| `min`            | Minimum rows; auto-fills when below     | `0`     |
| `max`            | Maximum rows; truncates when over       | `∞`     |
| `default-value`  | Default value for new rows              | `''`    |
| `disabled`       | Disabled (row inputs + buttons)         | `false` |

| Event         | Description                              |
| ------------- | ---------------------------------------- |
| `oas-change`  | Dispatched after add/remove/edit, `detail: { value }` |

Controlled: listen to `oas-change` and set the `modelValue` property (or the `model-value` attribute) to write back.
