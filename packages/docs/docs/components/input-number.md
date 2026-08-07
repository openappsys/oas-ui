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
})
</script>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 当前值（受控） | 无 |
| `min` / `max` | 范围，越界自动钳制 | 无 |
| `step` | 步长 | `1` |
| `precision` | 小数位数 | 无 |
| `disabled` | 禁用 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 步进或失焦变化，`detail: { value }`（数字） |
