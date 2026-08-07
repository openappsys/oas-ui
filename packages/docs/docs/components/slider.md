# Slider 滑块

原生 `<input type="range">` 增强的滑动条。

## 基础用法

<DemoBlock title="基础用法">
  <oas-slider style="width: 320px"></oas-slider>
</DemoBlock>

## 范围与步长

<DemoBlock title="min / max / step">
  <oas-slider min="0" max="100" step="10" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## 禁用

<DemoBlock title="禁用">
  <oas-slider disabled value="50" style="width: 320px"></oas-slider>
</DemoBlock>

## 事件

<DemoBlock title="实时值与变化事件">
  <oas-slider id="slider-event" value="40" style="width: 320px"></oas-slider>
  <span id="slider-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
</DemoBlock>

拖动过程派发 `oas-input`，松手派发 `oas-change`，`detail.value` 均为数值：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('slider-event')
  const out = document.getElementById('slider-output')
  const show = (label, v) => {
    out.textContent = `${label}: ${v}`
  }
  el?.addEventListener('oas-input', (e) => show('oas-input', e.detail.value))
  el?.addEventListener('oas-change', (e) => show('oas-change', e.detail.value))
})
</script>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 当前值（受控） | `0` |
| `min` / `max` | 范围 | `0` / `100` |
| `step` | 步长 | `1` |
| `disabled` | 禁用 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-input` | 拖动中，`detail: { value }` |
| `oas-change` | 松手确定，`detail: { value }` |
