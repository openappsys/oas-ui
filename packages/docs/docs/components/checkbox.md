# Checkbox 复选框

原生 `<input type="checkbox">` 增强。

## 基础用法

<div class="demo">
  <oas-checkbox checked>已勾选</oas-checkbox>
  <oas-checkbox>未勾选</oas-checkbox>
</div>

## 半选

<div class="demo">
  <oas-checkbox indeterminate>半选状态</oas-checkbox>
</div>

## 禁用

<div class="demo">
  <oas-checkbox disabled checked>禁用</oas-checkbox>
</div>

## 复选框组

<div class="demo">
  <oas-checkbox-group value='["a"]'>
    <oas-checkbox value="a">苹果</oas-checkbox>
    <oas-checkbox value="b">香蕉</oas-checkbox>
    <oas-checkbox value="c">橙子</oas-checkbox>
  </oas-checkbox-group>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `checked` | 是否选中 | `false` |
| `indeterminate` | 半选 | `false` |
| `disabled` | 禁用 | `false` |
| `value` | 组内值标识 | — |

Group 属性：`value`（JSON 数组）。

| 事件 | 说明 |
|---|---|
| `oas-change` | 变化，`detail: { checked, value }` |
