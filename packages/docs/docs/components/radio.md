# Radio 单选框

原生 `<input type="radio">` 增强，支持单选组与受控 value。

## 基础用法

<DemoBlock title="基础用法">
  <oas-radio name="demo-basic" checked>选项一</oas-radio>
  <oas-radio name="demo-basic">选项二</oas-radio>
</DemoBlock>

同名 `name` 的 radio 互斥（组件跨 Shadow DOM 同步）；无 name 时各自独立，互斥请用同名或 `oas-radio-group`。

## 单选组

<DemoBlock title="单选组（radio-group）">
  <oas-radio-group value="wechat">
    <span slot="label">选择支付方式</span>
    <oas-radio value="wechat">微信支付</oas-radio>
    <oas-radio value="alipay">支付宝</oas-radio>
    <oas-radio value="card">银行卡</oas-radio>
  </oas-radio-group>
</DemoBlock>

组通过 `value` 受控，子项 `value` 作为选项标识；组会统一管理单选互斥。

## 单个禁用

<DemoBlock title="单个 disabled">
  <oas-radio name="radio-item-disabled" checked>可选</oas-radio>
  <oas-radio name="radio-item-disabled" disabled>已禁用</oas-radio>
  <oas-radio name="radio-item-disabled" disabled checked>禁用且选中</oas-radio>
</DemoBlock>

单项 `disabled` 只禁该项：不可点击、不可聚焦（原生 disabled 语义），组内其余项不受影响；整组禁用走 `oas-radio-group` 的 `disabled`（见下）。

## 禁用

<DemoBlock title="禁用">
  <oas-radio-group disabled value="a">
    <oas-radio value="a">已选且禁用</oas-radio>
    <oas-radio value="b">禁用</oas-radio>
    <oas-radio value="c">禁用</oas-radio>
  </oas-radio-group>
</DemoBlock>

## 事件

<DemoBlock title="切换事件">
  <oas-radio-group id="radio-event" value="a">
    <oas-radio value="a">选项 A</oas-radio>
    <oas-radio value="b">选项 B</oas-radio>
    <oas-radio value="c">选项 C</oas-radio>
  </oas-radio-group>
  <span id="radio-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

监听 `oas-change`：单项派发 `detail: { checked, value }`，组派发 `detail: { value }`。

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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `checked` | 是否选中 | — | — |
| `disabled` | 禁用 | — | — |
| `name` | 原生分组名（组内自动管理） | — | — |
| `value` | 选项标识 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 变化，`detail: { checked, value }`；组为 `detail: { value }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

`oas-radio-group`：`value`（选中值）、`disabled`，支持 `slot="label"` 设置组标题。
