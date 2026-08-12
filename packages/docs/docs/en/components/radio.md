# Radio

An enhanced native `<input type="radio">` supporting radio groups and controlled values.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-radio name="demo-basic" checked>Option 1</oas-radio>
  <oas-radio name="demo-basic">Option 2</oas-radio>
</DemoBlock>

Radios sharing the same `name` are mutually exclusive (the component syncs across Shadow DOM); without `name`, each is independent — use the same `name` or `oas-radio-group` for mutual exclusion.

## Radio Group

<DemoBlock title="Radio group">
  <oas-radio-group value="wechat">
    <span slot="label">Choose a payment method</span>
    <oas-radio value="wechat">WeChat Pay</oas-radio>
    <oas-radio value="alipay">Alipay</oas-radio>
    <oas-radio value="card">Bank card</oas-radio>
  </oas-radio-group>
</DemoBlock>

The group is controlled via `value`; each item's `value` acts as the option identifier. The group manages single-selection exclusivity.

## Single-item Disabled

<DemoBlock title="Single disabled">
  <oas-radio name="radio-item-disabled" checked>Selectable</oas-radio>
  <oas-radio name="radio-item-disabled" disabled>Disabled</oas-radio>
  <oas-radio name="radio-item-disabled" disabled checked>Disabled & selected</oas-radio>
</DemoBlock>

Item-level `disabled` only disables that item: not clickable, not focusable (native disabled semantics), other items in the group are unaffected; disable the whole group via `oas-radio-group`'s `disabled` (see below).

## Disabled

<DemoBlock title="Disabled">
  <oas-radio-group disabled value="a">
    <oas-radio value="a">Selected & disabled</oas-radio>
    <oas-radio value="b">Disabled</oas-radio>
    <oas-radio value="c">Disabled</oas-radio>
  </oas-radio-group>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-radio-group id="radio-event" value="a">
    <oas-radio value="a">Option A</oas-radio>
    <oas-radio value="b">Option B</oas-radio>
    <oas-radio value="c">Option C</oas-radio>
  </oas-radio-group>
  <span id="radio-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

Listen to `oas-change`: a single item dispatches `detail: { checked, value }`, the group dispatches `detail: { value }`.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const group = document.getElementById('radio-event')
  const out = document.getElementById('radio-output')
  group?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `checked` | Whether checked | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `name` | Native group name (managed inside the group) | `string` | — |
| `value` | Option identifier | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Change, `detail: { checked, value }`; group: `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

`oas-radio-group`: `value` (selected value), `disabled`, supports `slot="label"` to set the group title.
