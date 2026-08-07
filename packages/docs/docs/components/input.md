# Input 输入框

原生 `<input>` 增强的基础输入框。

## 基础用法

<div class="demo">
  <oas-input placeholder="请输入内容" style="width: 240px"></oas-input>
</div>

## 类型

<div class="demo">
  <oas-input type="password" placeholder="密码" style="width: 240px"></oas-input>
</div>

## 可清除

<div class="demo">
  <oas-input clearable placeholder="可清除" value="内容" style="width: 240px"></oas-input>
</div>

## 禁用与只读

<div class="demo">
  <oas-input disabled placeholder="禁用" style="width: 240px"></oas-input>
  <oas-input readonly value="只读" style="width: 240px"></oas-input>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 值（受控，外部变更同步） | — |
| `placeholder` | 占位符 | — |
| `type` | 原生 input 类型 | `text` |
| `clearable` | 可清除 | `false` |
| `disabled` / `readonly` | 禁用 / 只读 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-input` | 输入中，`detail: { value }` |
| `oas-clear` | 点击清除 |
