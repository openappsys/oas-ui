# Slider 滑块

基于原生 `<input type="range">` 的滑块，支持键盘方向键调节。

## 基础用法

<div class="demo">
  <oas-slider style="width: 320px"></oas-slider>
</div>

## 范围与步长

<div class="demo">
  <oas-slider min="0" max="100" step="10" value="30" style="width: 320px"></oas-slider>
</div>

## 禁用

<div class="demo">
  <oas-slider disabled value="50" style="width: 320px"></oas-slider>
</div>

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
| `oas-change` | 松开结束，`detail: { value }` |
