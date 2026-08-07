# Typography 排版

文本、标题、段落排版组件。

## Text 文本

<div class="demo">
  <oas-text>默认文本</oas-text>
  <oas-text type="secondary">次要文本</oas-text>
  <oas-text type="success">成功文本</oas-text>
  <oas-text type="warning">警告文本</oas-text>
  <oas-text type="danger">危险文本</oas-text>
  <oas-text type="disabled">禁用文本</oas-text>
</div>

## 省略

<div class="demo" style="max-width: 320px">
  <oas-text ellipsis>这是一段很长的文本，超出宽度后将以省略号截断显示，不再换行。</oas-text>
</div>

## 可复制

<div class="demo">
  <oas-text copyable>可复制的文本内容</oas-text>
</div>

## Title 标题

<div class="demo" style="flex-direction: column; align-items: flex-start">
  <oas-title level="1">标题一</oas-title>
  <oas-title level="2">标题二</oas-title>
  <oas-title level="3">标题三</oas-title>
</div>

## Paragraph 段落

<div class="demo" style="flex-direction: column; align-items: flex-start">
  <oas-paragraph>段落文本一</oas-paragraph>
  <oas-paragraph type="secondary">段落文本二</oas-paragraph>
</div>

## API

| 组件 | 标签 | 属性 |
|---|---|---|
| Text | `oas-text` | `type`、`ellipsis`、`copyable` |
| Title | `oas-title` | `level`（1-5）、`type`、`ellipsis` |
| Paragraph | `oas-paragraph` | `type`、`ellipsis` |

`type` 取值：`default` / `secondary` / `success` / `warning` / `danger` / `disabled`。

| 事件 | 说明 |
|---|---|
| `oas-copy` | 复制成功，`detail: { text }` |
