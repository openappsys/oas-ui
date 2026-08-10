# Checkbox

An enhanced native `<input type="checkbox">` supporting indeterminate state and checkbox groups.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-checkbox checked>已勾选</oas-checkbox>
    <oas-checkbox>未勾选</oas-checkbox>
  </oas-space>
</DemoBlock>

## Indeterminate State

<DemoBlock title="Indeterminate">
  <oas-checkbox indeterminate>半选状态</oas-checkbox>
</DemoBlock>

Use it with select-all linkage scenarios (see the example below) to express "partially selected".

## Disabled

<DemoBlock title="Disabled">
  <oas-space>
    <oas-checkbox disabled checked>已选且禁用</oas-checkbox>
    <oas-checkbox disabled>未选且禁用</oas-checkbox>
  </oas-space>
</DemoBlock>

## Checkbox Group

<DemoBlock title="Checkbox group">
  <oas-checkbox-group value='["a"]'>
    <span slot="label">水果（可选多个）</span>
    <oas-checkbox value="a">苹果</oas-checkbox>
    <oas-checkbox value="b">香蕉</oas-checkbox>
    <oas-checkbox value="c">橙子</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

The group is controlled via `value` (a JSON array); each item's `value` acts as the option identifier.

## Select All / Indeterminate Linkage

<DemoBlock title="Select-all & indeterminate linkage">
  <div id="cb-wrap">
    <oas-space>
      <oas-checkbox id="cb-all">全选</oas-checkbox>
      <oas-checkbox value="a">苹果</oas-checkbox>
      <oas-checkbox value="b">香蕉</oas-checkbox>
      <oas-checkbox value="c">橙子</oas-checkbox>
    </oas-space>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Selection events">
  <oas-checkbox-group id="cbg-event" value='["a"]'>
    <oas-checkbox value="a">苹果</oas-checkbox>
    <oas-checkbox value="b">香蕉</oas-checkbox>
    <oas-checkbox value="c">橙子</oas-checkbox>
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

| Property         | Description            | Default |
| ---------------- | ---------------------- | ------- |
| `checked`        | Whether checked        | `false` |
| `indeterminate`  | Indeterminate state    | `false` |
| `disabled`       | Disabled               | `false` |
| `value`          | Option identifier      | —       |

`oas-checkbox-group`: `value` (JSON array), `disabled`, supports `slot="label"` to set the group title.

| Event         | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| `oas-change`  | Change, `detail: { checked, value }`; group: `detail: { value }` (array) |
