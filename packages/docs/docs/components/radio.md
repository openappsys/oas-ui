# Radio 单选框

原生 `<input type="radio">` 增强。

## 基础用法

<div class="demo">
  <oas-radio checked>选项一</oas-radio>
  <oas-radio>选项二</oas-radio>
</div>

## 单选框组

<div class="demo">
  <oas-radio-group value="a">
    <oas-radio value="a">微信</oas-radio>
    <oas-radio value="b">支付宝</oas-radio>
    <oas-radio value="c">银联</oas-radio>
  </oas-radio-group>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `checked` | 是否选中 | `false` |
| `value` | 值标识 | — |
| `disabled` | 禁用 | `false` |

Group 属性：`value`（单值）。

| 事件 | 说明 |
|---|---|
| `oas-change` | 变化，`detail: { checked, value }` |
