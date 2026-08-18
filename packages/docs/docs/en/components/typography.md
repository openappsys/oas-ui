# Typography

Typography components for text, titles, and paragraphs.

## Text

<DemoBlock title="Text types">
  <oas-text>Default text</oas-text>
  <oas-text type="secondary">Secondary text</oas-text>
  <oas-text type="success">Success text</oas-text>
  <oas-text type="warning">Warning text</oas-text>
  <oas-text type="danger">Danger text</oas-text>
  <oas-text type="disabled" data-a11y-exempt>Disabled text</oas-text>
</DemoBlock>

<DemoBlock title="Decorations">
  <oas-text strong>Strong</oas-text>
  <oas-text mark>Mark</oas-text>
  <oas-text code>Code</oas-text>
  <oas-text underline>Underline</oas-text>
  <oas-text delete>Delete</oas-text>
  <oas-text italic>Italic</oas-text>
</DemoBlock>

<DemoBlock title="Text depth">
  <oas-text depth="1">Depth 1 (secondary)</oas-text>
  <oas-text depth="2" data-a11y-exempt>Depth 2 (tertiary)</oas-text>
  <oas-text depth="3" data-a11y-exempt>Depth 3 (weakest)</oas-text>
</DemoBlock>

<DemoBlock title="Custom tag">
  <div style="display: flex; gap: 8px; align-items: baseline;">
    <oas-text tag="sub">sub</oas-text>
    <oas-text tag="sup">sup</oas-text>
    <oas-text tag="ins">ins</oas-text>
    <oas-text tag="mark">mark</oas-text>
    <oas-text tag="b">b</oas-text>
  </div>
</DemoBlock>

## Ellipsis

<DemoBlock title="Text ellipsis">
  <div style="max-width: 320px">
    <oas-text ellipsis>This is a long piece of text that will be truncated with an ellipsis once it exceeds the container width, without wrapping.</oas-text>
  </div>
</DemoBlock>

<DemoBlock title="Multiline ellipsis (line-clamp)">
  <div style="max-width: 320px">
    <oas-text line-clamp="2">This is a much longer piece of text. The line-clamp attribute limits it to at most two lines, truncating the rest with an ellipsis. Multiline ellipsis needs no measurement — pure CSS, ideal for card summaries and list intros.</oas-text>
  </div>
</DemoBlock>

<DemoBlock title="Ellipsis with suffix (ellipsis-suffix)">
  <div style="max-width: 320px">
    <oas-text ellipsis ellipsis-suffix="--William Shakespeare">To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune</oas-text>
  </div>
</DemoBlock>

## Copyable

<DemoBlock title="Copyable text">
  <oas-text copyable>Copyable text content</oas-text>
</DemoBlock>

<DemoBlock title="Custom copy text (copy-text)">
  <oas-text copyable copy-text="npm i @oas-ui/ui">Install command: click copy to copy `npm i @oas-ui/ui`</oas-text>
</DemoBlock>

## Actions

<DemoBlock title="Actions position">
  <oas-text copyable actions-position="end">Copy button after text (default)</oas-text>
  <br />
  <oas-text copyable actions-position="start">Copy button before text</oas-text>
  <br />
  <oas-text>
    Custom action content
    <button slot="actions" onclick="alert('custom action')">Custom</button>
  </oas-text>
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

| Component | Tag | Props |
| --- | --- | --- |
| Text | `oas-text` | `type`, `ellipsis`, `copyable` |
| Title | `oas-title` | `level` (1-5), `type`, `ellipsis` |
| Paragraph | `oas-paragraph` | `type`, `ellipsis` |

`type` values: `default` / `secondary` / `success` / `warning` / `danger` / `disabled`.

### oas-text

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions-position` | — | `string` | `end` |
| `code` | — | `boolean` | — |
| `copy-text` | — | `string` | — |
| `copyable` | Show a copy button that copies the text content on click | `boolean` | — |
| `delete` | — | `boolean` | — |
| `depth` | — | `string` | — |
| `ellipsis` | Single-line ellipsis when the text overflows its container | `boolean` | — |
| `ellipsis-suffix` | — | `string` | — |
| `italic` | — | — | — |
| `level` | Heading level (1-5) | `string` | `3` |
| `line-clamp` | — | `string` | — |
| `mark` | — | — | — |
| `strong` | — | — | — |
| `tag` | — | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | — | — | — |

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

| Name | Description |
| --- | --- |
| default | — |
| `actions` | — |

### oas-title

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions-position` | — | `string` | `end` |
| `code` | — | `boolean` | — |
| `copy-text` | — | `string` | — |
| `copyable` | Show a copy button that copies the text content on click | `boolean` | — |
| `delete` | — | `boolean` | — |
| `depth` | — | `string` | — |
| `ellipsis` | Single-line ellipsis when the text overflows its container | `boolean` | — |
| `ellipsis-suffix` | — | `string` | — |
| `italic` | — | — | — |
| `level` | Heading level (1-5) | `string` | `3` |
| `line-clamp` | — | `string` | — |
| `mark` | — | — | — |
| `strong` | — | — | — |
| `tag` | — | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | — | — | — |

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

| Name | Description |
| --- | --- |
| default | — |
| `actions` | — |

### oas-paragraph

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions-position` | — | `string` | `end` |
| `code` | — | `boolean` | — |
| `copy-text` | — | `string` | — |
| `copyable` | Show a copy button that copies the text content on click | `boolean` | — |
| `delete` | — | `boolean` | — |
| `depth` | — | `string` | — |
| `ellipsis` | Single-line ellipsis when the text overflows its container | `boolean` | — |
| `ellipsis-suffix` | — | `string` | — |
| `italic` | — | — | — |
| `level` | Heading level (1-5) | `string` | `3` |
| `line-clamp` | — | `string` | — |
| `mark` | — | — | — |
| `strong` | — | — | — |
| `tag` | — | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | — | — | — |

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

| Name | Description |
| --- | --- |
| default | — |
| `actions` | — |
