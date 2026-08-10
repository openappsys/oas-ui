# Typography

Typography components for text, titles, and paragraphs.

## Text

<DemoBlock title="Text types">
  <oas-text>默认文本</oas-text>
  <oas-text type="secondary">次要文本</oas-text>
  <oas-text type="success">成功文本</oas-text>
  <oas-text type="warning">警告文本</oas-text>
  <oas-text type="danger">危险文本</oas-text>
  <oas-text type="disabled">禁用文本</oas-text>
</DemoBlock>

## Ellipsis

<DemoBlock title="Text ellipsis">
  <div style="max-width: 320px">
    <oas-text ellipsis>这是一段很长的文本，超出宽度后将以省略号截断显示，不再换行。</oas-text>
  </div>
</DemoBlock>

## Copyable

<DemoBlock title="Copyable text">
  <oas-text copyable>可复制的文本内容</oas-text>
</DemoBlock>

## Title

<DemoBlock title="Heading levels">
  <div style="flex-direction: column; align-items: flex-start; display: flex">
    <oas-title level="1">标题一</oas-title>
    <oas-title level="2">标题二</oas-title>
    <oas-title level="3">标题三</oas-title>
  </div>
</DemoBlock>

## Paragraph

<DemoBlock title="Paragraphs">
  <div style="flex-direction: column; align-items: flex-start; display: flex">
    <oas-paragraph>段落文本一</oas-paragraph>
    <oas-paragraph type="secondary">段落文本二</oas-paragraph>
  </div>
</DemoBlock>

## API

| Component | Tag | Props |
| --- | --- | --- |
| Text | `oas-text` | `type`, `ellipsis`, `copyable` |
| Title | `oas-title` | `level` (1-5), `type`, `ellipsis` |
| Paragraph | `oas-paragraph` | `type`, `ellipsis` |

`type` values: `default` / `secondary` / `success` / `warning` / `danger` / `disabled`.

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
