# InputNumber 数字输入框

基于原生 `<input type="number">` 增强，带步进按钮。

## 基础用法

<div class="demo">
  <oas-input-number value="5" style="width: 160px"></oas-input-number>
</div>

## 范围与步长

<div class="demo">
  <oas-input-number value="50" min="0" max="100" step="5" style="width: 160px"></oas-input-number>
</div>

## 精度

<div class="demo">
  <oas-input-number value="1.5" step="0.1" precision="2" style="width: 160px"></oas-input-number>
</div>

## 禁用

<div class="demo">
  <oas-input-number value="3" disabled style="width: 160px"></oas-input-number>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 当前值（受控） | — |
| `min` / `max` | 范围（越界夹逼） | — |
| `step` | 步长 | `1` |
| `precision` | 小数精度 | — |
| `disabled` | 禁用 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 变化，`detail: { value }` |
