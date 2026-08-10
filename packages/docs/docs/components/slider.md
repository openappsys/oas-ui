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

## 刻度（marks 对象）

<DemoBlock title="marks 对象：值 → 标签映射">
  <oas-slider marks='{"0":"0°C","26":"26°C","60":"60°C"}' min="0" max="100" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## 刻度（marks 数组）

<DemoBlock title="marks 数组：仅数值，标签回退为数值文本">
  <oas-slider marks="[0,25,50,75,100]" min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

拖动滑块时，当前值已到达的刻度点与标签会以主题色高亮；`marks` 同时支持 JSON 对象 `{"值":"标签"}` 与 JSON 数组 `[值, 值]` 两种写法（数组元素也可用 `{"value": 26, "label": "26°C"}`）。

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

| 属性          | 说明                                                         | 默认值      |
| ------------- | ------------------------------------------------------------ | ----------- |
| `value`       | 当前值（受控）                                               | `0`         |
| `min` / `max` | 范围                                                         | `0` / `100` |
| `step`        | 步长                                                         | `1`         |
| `marks`       | 刻度：JSON 对象 `{"0":"0°C"}`（值→标签）或 JSON 数组 `[0,26,60]`（也可为 `{"value":26,"label":"26°C"}`）；刻度点与标签显示在轨道下方，值经过处高亮 | 无          |
| `disabled`    | 禁用                                                         | `false`     |

| 事件         | 说明                          |
| ------------ | ----------------------------- |
| `oas-input`  | 拖动中，`detail: { value }`   |
| `oas-change` | 松手确定，`detail: { value }` |
