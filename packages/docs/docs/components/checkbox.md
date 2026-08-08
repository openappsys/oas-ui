# Checkbox 复选框

原生 `<input type="checkbox">` 增强，支持半选与多选组。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space>
    <oas-checkbox checked>已勾选</oas-checkbox>
    <oas-checkbox>未勾选</oas-checkbox>
  </oas-space>
</DemoBlock>

## 半选状态

<DemoBlock title="半选（indeterminate）">
  <oas-checkbox indeterminate>半选状态</oas-checkbox>
</DemoBlock>

配合全选联动场景（见下方示例）使用，用于表达「部分选中」。

## 禁用

<DemoBlock title="禁用">
  <oas-space>
    <oas-checkbox disabled checked>已选且禁用</oas-checkbox>
    <oas-checkbox disabled>未选且禁用</oas-checkbox>
  </oas-space>
</DemoBlock>

## 多选组

<DemoBlock title="多选组（checkbox-group）">
  <oas-checkbox-group value='["a"]'>
    <span slot="label">水果（可选多个）</span>
    <oas-checkbox value="a">苹果</oas-checkbox>
    <oas-checkbox value="b">香蕉</oas-checkbox>
    <oas-checkbox value="c">橙子</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

组通过 `value`（JSON 数组）受控，子项 `value` 作为选项标识。

## 全选 / 半选联动

<DemoBlock title="全选与半选联动">
  <div id="cb-wrap">
    <oas-space>
      <oas-checkbox id="cb-all">全选</oas-checkbox>
      <oas-checkbox value="a">苹果</oas-checkbox>
      <oas-checkbox value="b">香蕉</oas-checkbox>
      <oas-checkbox value="c">橙子</oas-checkbox>
    </oas-space>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="选择事件">
  <oas-checkbox-group id="cbg-event" value='["a"]'>
    <oas-checkbox value="a">苹果</oas-checkbox>
    <oas-checkbox value="b">香蕉</oas-checkbox>
    <oas-checkbox value="c">橙子</oas-checkbox>
  </oas-checkbox-group>
  <span id="cbg-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

监听 `oas-change`：单项派发 `detail: { checked, value }`，组派发 `detail: { value: string[] }`。

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

| 属性            | 说明     | 默认值  |
| --------------- | -------- | ------- |
| `checked`       | 是否选中 | `false` |
| `indeterminate` | 半选状态 | `false` |
| `disabled`      | 禁用     | `false` |
| `value`         | 选项标识 | 无      |

`oas-checkbox-group`：`value`（JSON 数组）、`disabled`，支持 `slot="label"` 设置组标题。

| 事件         | 说明                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `oas-change` | 变化，`detail: { checked, value }`；组为 `detail: { value }`（数组） |
