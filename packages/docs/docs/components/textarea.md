# Textarea 文本域

原生 `<textarea>` 增强，支持高度自适应。

## 基础用法

<div class="demo">
  <oas-textarea placeholder="请输入内容" style="width: 320px"></oas-textarea>
</div>

## 行数与调整

<div class="demo">
  <oas-textarea rows="2" style="width: 320px"></oas-textarea>
  <oas-textarea resize="both" placeholder="可调整大小" style="width: 320px"></oas-textarea>
</div>

## 高度自适应

<div class="demo">
  <oas-textarea auto-height placeholder="输入内容自动增高" style="width: 320px"></oas-textarea>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 值（受控） | — |
| `rows` | 行数 | `3` |
| `resize` | 调整方向 | `none` |
| `auto-height` | 高度自适应 | `false` |
| `placeholder` | 占位符 | — |
| `disabled` / `readonly` | 禁用 / 只读 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-input` | 输入中，`detail: { value }` |
