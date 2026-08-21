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

<DemoBlock title="Decorations">
  <oas-text strong>Strong</oas-text>
  <oas-text mark>Mark</oas-text>
  <oas-text code>Code</oas-text>
  <oas-text underline>Underline</oas-text>
  <oas-text delete>Delete</oas-text>
  <oas-text italic>Italic</oas-text>
</DemoBlock>

<DemoBlock title="Custom mark color (mark + CSS variable)">
  <oas-text mark>Default mark color</oas-text>
  <br />
  <oas-text mark style="--oas-text-mark-bg: #7c3aed">Custom mark color (--oas-text-mark-bg)</oas-text>
</DemoBlock>

<DemoBlock title="Font weight (weight)">
  <oas-text weight="regular">regular</oas-text>
  <oas-text weight="medium">medium</oas-text>
  <oas-text weight="semibold">semibold</oas-text>
  <oas-text weight="bold">bold</oas-text>
  <br />
  <oas-text strong>strong (equivalent to semibold weight)</oas-text>
</DemoBlock>

<DemoBlock title="Numeric (tabular-nums)">
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <oas-text>Default digits: 1 2 3 4 5 6 7 8 9 0</oas-text>
    <oas-text numeric>tabular-nums: 1 2 3 4 5 6 7 8 9 0</oas-text>
  </div>
  <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
    <oas-text>Default: 12,345.67</oas-text>
    <oas-text numeric>Tabular: 12,345.67</oas-text>
    <oas-text numeric>Tabular: 1,234.56</oas-text>
  </div>
</DemoBlock>

<DemoBlock title="Text alignment (align)">
  <div style="max-width: 360px; display: flex; flex-direction: column; gap: 4px;">
    <oas-text align="start">start: left-aligned (default start)</oas-text>
    <oas-text align="center">center: centered (common for headings)</oas-text>
    <oas-text align="end">end: right-aligned</oas-text>
    <oas-paragraph align="justify">justify: justified for paragraphs, stretching word spacing so both edges align.</oas-paragraph>
  </div>
</DemoBlock>

<DemoBlock title="Text depth">
  <oas-text depth="1">Depth 1 (secondary)</oas-text>
  <oas-text depth="2">Depth 2 (tertiary)</oas-text>
  <oas-text depth="3">Depth 3 (weakest)</oas-text>
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
| `actions-position` | Action bar position: `start` (before the text) / `end` (default, after the text); pair with `slot="actions"` | `string` | `end` |
| `align` | Text alignment: `start`/`center`/`end`/`justify` | `AlignType` | — |
| `code` | Inline code style (monospace + light background) | `boolean` | — |
| `copy-text` | Custom content to copy (defaults to the current text) | `string` | — |
| `copyable` | Show a copy button that copies the text content on click | `boolean` | — |
| `delete` | Strikethrough (`<del>` semantics) | `boolean` | — |
| `depth` | Text softening tier: `1` / `2` / `3` (progressively lighter); only effective with `type="default"` | `string` | — |
| `ellipsis` | Single-line ellipsis when the text overflows its container | `boolean` | — |
| `ellipsis-suffix` | Suffix preserved when ellipsized (e.g. an expand link); works with `ellipsis` / `line-clamp` | `string` | — |
| `italic` | Italic (`<em>` semantics) | — | — |
| `level` | Heading level (1-5) | `string` | `3` |
| `line-clamp` | Number of lines before multi-line ellipsis (positive integer); combinable with `ellipsis-suffix` | `string` | — |
| `mark` | Highlighted mark (light yellow background, `<mark>` semantics) | — | — |
| `numeric` | Tabular figures (font-variant-numeric: tabular-nums) for aligned numeric columns in tables/stats | — | — |
| `strong` | Bold (font-weight 600, `<strong>` semantics) | — | — |
| `tag` | Render tag: replaces the default element (e.g. `sub` / `sup` / `ins` / `em` / `strong`) | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | Underline | — | — |
| `weight` | Font weight: `regular`/`medium`/`semibold`/`bold` (compatible with the strong boolean) | `WeightType` | — |

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

| Name | Description |
| --- | --- |
| default | — |
| `actions` | Action slot (copy/edit buttons etc.); position determined by `actions-position` |

### oas-title

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions-position` | Action bar position: `start` (before the text) / `end` (default, after the text); pair with `slot="actions"` | `string` | `end` |
| `align` | — | `AlignType` | — |
| `code` | Inline code style (monospace + light background) | `boolean` | — |
| `copy-text` | Custom content to copy (defaults to the current text) | `string` | — |
| `copyable` | Show a copy button that copies the text content on click | `boolean` | — |
| `delete` | Strikethrough (`<del>` semantics) | `boolean` | — |
| `depth` | Text softening tier: `1` / `2` / `3` (progressively lighter); only effective with `type="default"` | `string` | — |
| `ellipsis` | Single-line ellipsis when the text overflows its container | `boolean` | — |
| `ellipsis-suffix` | Suffix preserved when ellipsized (e.g. an expand link); works with `ellipsis` / `line-clamp` | `string` | — |
| `italic` | Italic (`<em>` semantics) | — | — |
| `level` | Heading level (1-5) | `string` | `3` |
| `line-clamp` | Number of lines before multi-line ellipsis (positive integer); combinable with `ellipsis-suffix` | `string` | — |
| `mark` | Highlighted mark (light yellow background, `<mark>` semantics) | — | — |
| `numeric` | — | — | — |
| `strong` | Bold (font-weight 600, `<strong>` semantics) | — | — |
| `tag` | Render tag: replaces the default element (e.g. `sub` / `sup` / `ins` / `em` / `strong`) | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | Underline | — | — |
| `weight` | — | `WeightType` | — |

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

| Name | Description |
| --- | --- |
| default | — |
| `actions` | Action slot (copy/edit buttons etc.); position determined by `actions-position` |

### oas-paragraph

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions-position` | Action bar position: `start` (before the text) / `end` (default, after the text); pair with `slot="actions"` | `string` | `end` |
| `align` | — | `AlignType` | — |
| `code` | Inline code style (monospace + light background) | `boolean` | — |
| `copy-text` | Custom content to copy (defaults to the current text) | `string` | — |
| `copyable` | Show a copy button that copies the text content on click | `boolean` | — |
| `delete` | Strikethrough (`<del>` semantics) | `boolean` | — |
| `depth` | Text softening tier: `1` / `2` / `3` (progressively lighter); only effective with `type="default"` | `string` | — |
| `ellipsis` | Single-line ellipsis when the text overflows its container | `boolean` | — |
| `ellipsis-suffix` | Suffix preserved when ellipsized (e.g. an expand link); works with `ellipsis` / `line-clamp` | `string` | — |
| `italic` | Italic (`<em>` semantics) | — | — |
| `level` | Heading level (1-5) | `string` | `3` |
| `line-clamp` | Number of lines before multi-line ellipsis (positive integer); combinable with `ellipsis-suffix` | `string` | — |
| `mark` | Highlighted mark (light yellow background, `<mark>` semantics) | — | — |
| `numeric` | — | — | — |
| `strong` | Bold (font-weight 600, `<strong>` semantics) | — | — |
| `tag` | Render tag: replaces the default element (e.g. `sub` / `sup` / `ins` / `em` / `strong`) | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | Underline | — | — |
| `weight` | — | `WeightType` | — |

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

| Name | Description |
| --- | --- |
| default | — |
| `actions` | Action slot (copy/edit buttons etc.); position determined by `actions-position` |
