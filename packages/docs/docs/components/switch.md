# Switch 开关

基于 `role="switch"` 的可切换按钮。

## 基础用法

<div class="demo">
  <oas-switch></oas-switch>
  <oas-switch checked></oas-switch>
</div>

## 禁用与加载

<div class="demo">
  <oas-switch disabled checked></oas-switch>
  <oas-switch loading checked></oas-switch>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `checked` | 是否开启 | `false` |
| `disabled` | 禁用 | `false` |
| `loading` | 加载态（禁止切换） | `false` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 变化，`detail: { checked }` |
