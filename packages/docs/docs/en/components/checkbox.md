# Checkbox

An enhanced native `<input type="checkbox">` supporting indeterminate state and checkbox groups.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-checkbox checked>Checked</oas-checkbox>
    <oas-checkbox>Unchecked</oas-checkbox>
  </oas-space>
</DemoBlock>

## Indeterminate State

<DemoBlock title="Indeterminate">
  <oas-checkbox indeterminate>Indeterminate</oas-checkbox>
</DemoBlock>

Use it with select-all linkage scenarios (see the example below) to express "partially selected".

## Disabled

<DemoBlock title="Disabled">
  <oas-space>
    <oas-checkbox disabled checked>Checked & disabled</oas-checkbox>
    <oas-checkbox disabled>Unchecked & disabled</oas-checkbox>
  </oas-space>
</DemoBlock>

## Checkbox Group

<DemoBlock title="Checkbox group">
  <oas-checkbox-group value='["a"]'>
    <span slot="label">Fruits (multiple selectable)</span>
    <oas-checkbox value="a">Apple</oas-checkbox>
    <oas-checkbox value="b">Banana</oas-checkbox>
    <oas-checkbox value="c">Orange</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

The group is controlled via `value` (a JSON array); each item's `value` acts as the option identifier.

## Select All / Indeterminate Linkage

<DemoBlock title="Select-all & indeterminate linkage">
  <div id="cb-wrap">
    <oas-space>
      <oas-checkbox id="cb-all">Select all</oas-checkbox>
      <oas-checkbox value="a">Apple</oas-checkbox>
      <oas-checkbox value="b">Banana</oas-checkbox>
      <oas-checkbox value="c">Orange</oas-checkbox>
    </oas-space>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Selection events">
  <oas-checkbox-group id="cbg-event" value='["a"]'>
    <oas-checkbox value="a">Apple</oas-checkbox>
    <oas-checkbox value="b">Banana</oas-checkbox>
    <oas-checkbox value="c">Orange</oas-checkbox>
  </oas-checkbox-group>
  <span id="cbg-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

Listen to `oas-change`: a single item dispatches `detail: { checked, value }`, the group dispatches `detail: { value: string[] }`.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const wrap = document.getElementById('cb-wrap')
  const all = document.getElementById('cb-all')
  if (wrap && all) {
    const cbs = [...wrap.querySelectorAll('oas-checkbox')].filter((c) => c !== all)
    const syncHeader = () => {
      const checkedCount = cbs.filter((c) => c.hasAttribute('checked')).length
      if (checkedCount === 0) {
        all.removeAttribute('checked')
        all.removeAttribute('indeterminate')
      } else if (checkedCount === cbs.length) {
        all.setAttribute('checked', '')
        all.removeAttribute('indeterminate')
      } else {
        all.removeAttribute('checked')
        all.setAttribute('indeterminate', '')
      }
    }
    all.addEventListener('oas-change', (e) => {
      for (const c of cbs) c.toggleAttribute('checked', e.detail.checked)
      syncHeader()
    })
    for (const c of cbs) c.addEventListener('oas-change', syncHeader)
    syncHeader()
  }

  const group = document.getElementById('cbg-event')
  const out = document.getElementById('cbg-output')
  group?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })
})
</script>

## API

### Attributes

| Attribute       | Description         | Type      | Default |
| --------------- | ------------------- | --------- | ------- |
| `checked`       | Whether checked     | `boolean` | —       |
| `disabled`      | Disabled            | `boolean` | —       |
| `indeterminate` | Indeterminate state | `boolean` | —       |
| `value`         | Option identifier   | `string`  | —       |

### Events

| Event        | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `oas-change` | Change, `detail: { checked, value }`; group: `detail: { value }` (array) |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

`oas-checkbox-group`: `value` (JSON array), `disabled`, supports `slot="label"` to set the group title.
