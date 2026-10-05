# Picker 滚轮选择器

移动式滚轮列选择器：原生滚动 + 吸附提供惯性手感，滚动/键盘选中落停后回写 `value` 并派发 `oas-change`。支持独立多列（`columns`）与级联树（`options`）两种数据形态，form-associated 可直接进原生表单。适合移动端的日期式分栏、地区级联、规格多选等场景。

## 基础用法

`columns` 传 JSON 数组（每列 `{ key?, label?, items: [{ label, value?, disabled? }] }`），`value` 为各列选中值数组（`value` 缺省回退 `label`）：

<DemoBlock title="独立两列 + 事件反馈">
  <div style="width: 100%">
    <oas-picker id="pk-basic" columns='[{"key":"fruit","label":"水果","items":[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"葡萄","value":"grape"},{"label":"西瓜","value":"melon"}]},{"key":"num","label":"数量","items":[{"label":"一份"},{"label":"两份"},{"label":"三份"}]}]'></oas-picker>
    <p id="pk-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      滚动或方向键选择，这里显示 oas-change 反馈。
    </p>
  </div>
</DemoBlock>

## 级联（options 树）

`options` 传树形 JSON（`children` 嵌套）：列数随选中路径自动派生，父列变更时子列重建并复位到首可用项。`columns` 与 `options` 互斥（`columns` 优先）：

<DemoBlock title="省/市级联">
  <div style="width: 100%">
    <oas-picker id="pk-cascade" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"},{"label":"温州","value":"wz"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"},{"label":"苏州","value":"sz"}]},{"label":"广东","value":"gd","children":[{"label":"广州","value":"gz"},{"label":"深圳","value":"sz2"}]}]' value='["zj","hz"]'></oas-picker>
    <p id="pk-cascade-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      切换省份列，城市列自动重建。
    </p>
  </div>
</DemoBlock>

## 禁用项与整件禁用

列内单项 `disabled: true`：落停到禁用项时自动吸附到最近可用项；整件 `disabled` 时滚轮不响应：

<DemoBlock title="禁用项吸附 + 整件禁用">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-picker columns='[{"label":"时段","items":[{"label":"上午"},{"label":"中午","disabled":true},{"label":"下午"},{"label":"晚上"}]}]'></oas-picker>
    <oas-picker disabled columns='[{"label":"锁定","items":[{"label":"不可选"},{"label":"也不可"}]}]'></oas-picker>
  </div>
</DemoBlock>

## 档位定制

`item-height`（行高 px，默认 36）× `visible-count`（可见行数，默认 5，偶数自动归奇）决定滚轮高度；中心指示带锚定选中行：

<DemoBlock title="行高 44 + 可见 3 行">
  <div style="width: 100%">
    <oas-picker item-height="44" visible-count="3" columns='[{"label":"尺寸","items":[{"label":"XS"},{"label":"S"},{"label":"M"},{"label":"L"},{"label":"XL"}]}]'></oas-picker>
  </div>
</DemoBlock>

## 原生表单

form-associated：有 `name` 时 FormData 提交 JSON 数组字符串；`form.reset()` 回初始值：

<DemoBlock title="oas-form 提交">
  <div style="width: 100%">
    <oas-form id="pk-form">
      <oas-picker name="spec" columns='[{"label":"颜色","items":[{"label":"黑"},{"label":"白"},{"label":"蓝"}]}]' value='["黑"]'></oas-picker>
      <oas-button type="primary" native-type="submit">提交</oas-button>
    </oas-form>
    <p id="pk-form-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      提交后这里显示表单数据。
    </p>
  </div>
</DemoBlock>

## 触屏与键盘

- 触屏/鼠标：滚轮列原生惯性滚动 + 吸附居中，滚动中实时高亮最近项，落停提交；
- 键盘：列可聚焦（`role="listbox"`），↑/↓ 逐项移动、Home/End 跳首/末可用项（跳过禁用项）；
- `prefers-reduced-motion` 下滚动定位瞬时完成。

## API

### oas-picker

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `columns` | 独立多列数据（JSON 数组 [{ key?, label?, items: [{ label, value?, disabled? }] }]；与 options 互斥且优先） | — | — |
| `disabled` | 整件禁用（滚轮不响应、值不变） | `boolean` | — |
| `item-height` | 行高 px（正整数，非法回落默认） | — | — |
| `name` | 原生表单字段名（form-associated：FormData 提交的键，值为 JSON 数组字符串） | — | — |
| `options` | 级联树数据（JSON [{ label, value?, children: [...] }]）；列数随选中路径派生，父列变更重建子列并复位首可用项 | — | — |
| `required` | 必填标记（驱动原生校验链 valueMissing：未选 = 未填） | — | — |
| `value` | 各列选中值（JSON 数组，项 value 缺省回退 label）；落停回写反射，程序性写入只滚动不派发事件 | `string[] \| string` | — |
| `visible-count` | 可见行数（≥3，偶数自动归奇） | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 滚动/键盘选中落停后派发（程序性 value 写入不派发）。detail { value, labels, columnIndex }——value/labels 为全列当前口径，columnIndex 为本次变更列 |

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-picker').then(() => {
    const basic = document.querySelector('#pk-basic')
    const basicOut = document.querySelector('#pk-basic-out')
    basic?.addEventListener('oas-change', (e) => {
      const { value, labels } = e.detail
      if (basicOut) basicOut.textContent = `已选：${labels.join(' / ')}（value=[${value.join(', ')}]）`
    })

    const cascade = document.querySelector('#pk-cascade')
    const cascadeOut = document.querySelector('#pk-cascade-out')
    cascade?.addEventListener('oas-change', (e) => {
      const { value, labels, columnIndex } = e.detail
      if (cascadeOut) cascadeOut.textContent = `路径：${labels.join(' / ')}（变更列 ${columnIndex + 1}，value=[${value.join(', ')}]）`
    })

    const form = document.querySelector('#pk-form')
    const formOut = document.querySelector('#pk-form-out')
    form?.addEventListener('oas-submit', (e) => {
      if (formOut) formOut.textContent = `表单数据：${JSON.stringify(e.detail.values ?? e.detail)}`
    })
  })
})
</script>
