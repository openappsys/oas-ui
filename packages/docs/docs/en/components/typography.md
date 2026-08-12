# Typography

Typography components for text, titles, and paragraphs.

## Text

<DemoBlock title="Text types">
  <oas-text>Default text</oas-text>
  <oas-text type="secondary">Secondary text</oas-text>
  <oas-text type="success">Success text</oas-text>
  <oas-text type="warning">Warning text</oas-text>
  <oas-text type="danger">Danger text</oas-text>
  <oas-text type="disabled">Disabled text</oas-text>
</DemoBlock>

## Ellipsis

<DemoBlock title="Text ellipsis">
  <div style="max-width: 320px">
    <oas-text ellipsis>This is a long piece of text that will be truncated with an ellipsis once it exceeds the container width, without wrapping.</oas-text>
  </div>
</DemoBlock>

## Copyable

<DemoBlock title="Copyable text">
  <oas-text copyable>Copyable text content</oas-text>
</DemoBlock>

## Title

<DemoBlock title="Heading levels">
  <div style="flex-direction: column; align-items: flex-start; display: flex">
    <oas-title level="1">Heading 1</oas-title>
    <oas-title level="2">Heading 2</oas-title>
    <oas-title level="3">Heading 3</oas-title>
  </div>
</DemoBlock>

## Paragraph

<DemoBlock title="Paragraphs">
  <div style="flex-direction: column; align-items: flex-start; display: flex">
    <oas-paragraph>Paragraph text 1</oas-paragraph>
    <oas-paragraph type="secondary">Paragraph text 2</oas-paragraph>
  </div>
</DemoBlock>

## API

| Component | Tag             | Props                             |
| --------- | --------------- | --------------------------------- |
| Text      | `oas-text`      | `type`, `ellipsis`, `copyable`    |
| Title     | `oas-title`     | `level` (1-5), `type`, `ellipsis` |
| Paragraph | `oas-paragraph` | `type`, `ellipsis`                |

`type` values: `default` / `secondary` / `success` / `warning` / `danger` / `disabled`.

### oas-text

| Attribute  | Description                                                                        | Type       | Default   |
| ---------- | ---------------------------------------------------------------------------------- | ---------- | --------- |
| `copyable` | Show a copy button that copies the text content on click                           | `boolean`  | —         |
| `ellipsis` | Single-line ellipsis when the text overflows its container                         | `boolean`  | —         |
| `level`    | Heading level (1-5)                                                                | `string`   | `3`       |
| `type`     | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |

| Event            | Description                        |
| ---------------- | ---------------------------------- |
| `oas-copy`       | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }`    |

| Name    | Description |
| ------- | ----------- |
| default | —           |

### oas-title

| Attribute  | Description                                                                        | Type       | Default   |
| ---------- | ---------------------------------------------------------------------------------- | ---------- | --------- |
| `copyable` | Show a copy button that copies the text content on click                           | `boolean`  | —         |
| `ellipsis` | Single-line ellipsis when the text overflows its container                         | `boolean`  | —         |
| `level`    | Heading level (1-5)                                                                | `string`   | `3`       |
| `type`     | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |

| Event            | Description                        |
| ---------------- | ---------------------------------- |
| `oas-copy`       | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }`    |

| Name    | Description |
| ------- | ----------- |
| default | —           |

### oas-paragraph

| Attribute  | Description                                                                        | Type       | Default   |
| ---------- | ---------------------------------------------------------------------------------- | ---------- | --------- |
| `copyable` | Show a copy button that copies the text content on click                           | `boolean`  | —         |
| `ellipsis` | Single-line ellipsis when the text overflows its container                         | `boolean`  | —         |
| `level`    | Heading level (1-5)                                                                | `string`   | `3`       |
| `type`     | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |

| Event            | Description                        |
| ---------------- | ---------------------------------- |
| `oas-copy`       | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }`    |

| Name    | Description |
| ------- | ----------- |
| default | —           |
