# InputNumber 数字输入框

原生 `<input type="number">` 增强，带步进按钮并支持范围约束。

## 基础用法

<DemoBlock title="基础用法">
  <oas-input-number value="5" style="width: 160px"></oas-input-number>
</DemoBlock>

## 范围与步长

<DemoBlock title="min / max / step">
  <oas-input-number value="50" min="0" max="100" step="5" style="width: 160px"></oas-input-number>
</DemoBlock>

超出 `min` / `max` 会被钳制；到达边界时对应步进按钮自动禁用。

## 精度

<DemoBlock title="precision">
  <oas-input-number value="1.5" step="0.1" precision="2" style="width: 160px"></oas-input-number>
</DemoBlock>

`precision` 控制步进与钳制时的小数位数。

## 禁用

<DemoBlock title="禁用">
  <oas-input-number value="3" disabled style="width: 160px"></oas-input-number>
</DemoBlock>

## 无障碍名称（label）

<DemoBlock title="label（可访问名称）">
  <oas-input-number id="num-label" label="商品数量" value="3" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-label-default" value="5" style="width: 160px"></oas-input-number>
  <span id="num-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 280px"></span>
</DemoBlock>

`label` 作为输入框的可访问名称（`aria-label`）：设置后读屏朗读该名称；未设置时回退内置文案「数字输入框」（数字输入框没有 `placeholder` 回退链）。步进按钮「增加 / 减少」的可访问名称同样走内置文案。

## 事件

<DemoBlock title="变化事件">
  <oas-input-number id="num-event" value="5" min="0" max="10" style="width: 160px"></oas-input-number>
  <span id="num-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

监听 `oas-change`（步进或失焦时触发，`detail: { value }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('num-event')
  const out = document.getElementById('num-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  // label（可访问名称）demo：等组件升级后读取内层 input 的 aria-label
  const numLabelSet = document.getElementById('num-label')
  const numLabelFallback = document.getElementById('num-label-default')
  const numLabelOut = document.getElementById('num-label-output')
  const readNumLabel = () => {
    const a = numLabelSet?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    const b = numLabelFallback?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    if (a !== undefined && b !== undefined) {
      numLabelOut.textContent = `aria-label：设置「${a}」 / 回退「${b}」`
    } else {
      setTimeout(readNumLabel, 60)
    }
  }
  readNumLabel()
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `label` | 可访问名称（`aria-label` 来源，未设时回退内置文案「数字输入框」） | — | — |
| `max` | 范围，越界自动钳制 | `string` | — |
| `min` | 范围，越界自动钳制 | `string` | — |
| `precision` | 小数位数 | `string` | — |
| `step` | 步长 | `string` | `1` |
| `value` | 当前值（受控） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 步进或失焦变化，`detail: { value }`（数字） |
