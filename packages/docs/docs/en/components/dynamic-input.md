# DynamicInput

Add/remove/edit for array fields; each row reuses the `oas-input` component, supporting controlled/uncontrolled modes, key-value pair rows, custom row content, and button sorting.

## Basic Usage

<DemoBlock title="Add/remove list">
  <oas-dynamic-input model-value='["vue","react"]' placeholder="Type content"></oas-dynamic-input>
</DemoBlock>

`model-value` is a JSON array attribute (also assignable via property); each row has an input + remove button, with an "Add" button at the end. `placeholder` is passed through to every row input.

## Default Value

<DemoBlock title="default-value">
  <oas-dynamic-input default-value="New row"></oas-dynamic-input>
</DemoBlock>

New rows start with `default-value` as their initial value.

## Key-Value Pair Mode

<DemoBlock title="preset=pair (env vars / params)">
  <oas-dynamic-input preset="pair" key-placeholder="Name" value-placeholder="Value" model-value='[{"key":"HOST","value":"localhost"},{"key":"PORT","value":"8080"}]'></oas-dynamic-input>
</DemoBlock>

With `preset="pair"` each row renders key/value inputs and the value channel becomes an object array `[{ key, value }]`:

- `key-placeholder` / `value-placeholder` set the two placeholders
- A new row starts as `{ key: "", value: "" }`; write `model-value` directly for non-empty initial values
- Switching `preset` maps values losslessly: string → `{ key: value, value: "" }`; object → `key` (falls back to `value` when key is empty)

## Custom Row Content

<DemoBlock title="template[slot=row]">
  <oas-dynamic-input id="dyn-row-slot" model-value='["apple","banana"]'>
    <template slot="row">
      <span>🏷️</span>
      <oas-input part="row-input" style="flex:1"></oas-input>
    </template>
  </oas-dynamic-input>
</DemoBlock>

`template[slot="row"]` is cloned into every row (remove/sort buttons stay component-side):

- `[data-row-value]` nodes bind the row value automatically (under the pair preset, `data-row-value` binds the value part and `data-row-key` the key part)
- An `oas-input` inside the template syncs through the value channel automatically (composed delegation)
- For arbitrary controls (select / input-number, etc.), listen to `oas-row-render` (`detail: { index, value, element }`) and take over read/write yourself

## Sorting

<DemoBlock title="sortable move up/down buttons">
  <oas-dynamic-input sortable model-value='["First","Second","Third"]'></oas-dynamic-input>
</DemoBlock>

The `sortable` attribute adds move-up/move-down buttons at the end of each row: up is disabled on the first row, down on the last; sorting never changes the row count and is not limited by `min`; a reorder dispatches `oas-change`.

## min / max Boundaries

<DemoBlock title="min=2 fills up rows">
  <oas-dynamic-input min="2" model-value='["a"]'></oas-dynamic-input>
</DemoBlock>

Under `min`, rows are auto-filled; when `min` is reached, remove buttons are disabled.

<DemoBlock title="max=3 disables adding">
  <oas-dynamic-input max="3" model-value='["a","b","c"]'></oas-dynamic-input>
</DemoBlock>

When `max` is reached, the "Add" button is disabled; an over-long `model-value` is truncated automatically.

## Size & Status

<DemoBlock title="size variants">
  <oas-dynamic-input size="small" model-value='["small row"]'></oas-dynamic-input>
  <oas-dynamic-input model-value='["medium row (default)"]'></oas-dynamic-input>
  <oas-dynamic-input size="large" model-value='["large row"]'></oas-dynamic-input>
</DemoBlock>

<DemoBlock title="status">
  <oas-dynamic-input status="error" model-value='["missing required"]'></oas-dynamic-input>
</DemoBlock>

`size` (`small | medium | large`) controls control height and font (it also reads the config-provider density injection); `status` (`success | warning | error`) is passed through to row inputs.

## Disabled & Readonly

<DemoBlock title="disabled">
  <oas-dynamic-input disabled model-value='["vue"]'></oas-dynamic-input>
</DemoBlock>

<DemoBlock title="readonly">
  <oas-dynamic-input readonly model-value='["readonly row"]'></oas-dynamic-input>
</DemoBlock>

`disabled` disables everything; `readonly` makes row inputs read-only and disables add/remove/sort buttons (values stay copyable; form semantics differ from disabled).

## Events

<DemoBlock title="Add/remove/change events">
  <oas-dynamic-input id="dyn-event" model-value='["a"]'></oas-dynamic-input>
  <span id="dyn-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

Listen to `oas-add` (`detail: { index }`) / `oas-remove` (`detail: { index, value }`) / `oas-change` (`detail: { value }`); focusing/blurring any row input dispatches `oas-focus` / `oas-blur` (`detail: { index }`):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('dyn-event')
  const out = document.getElementById('dyn-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${JSON.stringify(e.detail.value)}`
  })
  el?.addEventListener('oas-add', (e) => {
    out.textContent = `oas-add: ${JSON.stringify(e.detail)}`
  })
  el?.addEventListener('oas-remove', (e) => {
    out.textContent = `oas-remove: ${JSON.stringify(e.detail)}`
  })
})
</script>

## Capability Overview (page notes)

- `preset`: `input | pair`; the pair preset uses a `[{ key, value }]` value channel
- `placeholder` / `key-placeholder` / `value-placeholder`: placeholder passthrough
- `sortable`: button-style move-up/move-down sorting (no drag-and-drop)
- `size` / `status` / `readonly`: three sizes, validation status, readonly (all follow library contracts)
- Slots: `template[slot="row"]` custom row content (`data-row-value` / `data-row-key` bindings)
- Events: `oas-add` `{ index }`, `oas-remove` `{ index, value }`, `oas-focus` / `oas-blur` `{ index }`, `oas-row-render` `{ index, value, element }` (existing `oas-change` unchanged)

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `default-value` | Default value for new rows | `string` | — |
| `disabled` | Disabled (row inputs + buttons) | `boolean` | — |
| `key-placeholder` | Key placeholder in pair form | `string` | — |
| `max` | Maximum rows; truncates when over | `string` | — |
| `min` | Minimum rows; auto-fills when below | `string` | `0` |
| `model-value` | String array (property or JSON) | `DynamicInputRowValue[]` | `[]` |
| `placeholder` | Row input placeholder | `string` | — |
| `preset` | Row form: `input` (default, single input) / `pair` (key-value double input) | `string` | — |
| `readonly` | Read-only (rows not editable, add/remove/sort buttons hidden) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `sortable` | Row sorting (move up/down buttons, value swap with focus kept; keyboard accessible) | `boolean` | — |
| `status` | Validation status: `error` / `warning` / `success` (passed to the row inputs) | `string` | — |
| `value-placeholder` | Value placeholder in pair form | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-add` | Row added, `detail: { index }` |
| `oas-blur` | Row blurred, `detail: { index }` |
| `oas-change` | Dispatched after add/remove/edit, `detail: { value }` |
| `oas-focus` | Row focused, `detail: { index }` |
| `oas-remove` | Row removed, `detail: { index, value }` |
| `oas-row-render` | Fires on row render (custom row channel), `detail: { index, value, element }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="row"]` | Custom row content (`[data-row-value]`/`[data-row-key]` bindings; remove/sort buttons stay component-side) |

Controlled: listen to `oas-change` and set the `modelValue` property (or the `model-value` attribute) to write back.
