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

## Font Size (size)

`size` offers three font-size presets: `small` (helper text) / `medium` (baseline — the default falls back to the inherited font size) / `large` (emphasis), mapped to the `--oas-font-size-*` tokens; `sm`/`lg` aliases are equivalent and invalid values fall back to `medium`. Only `oas-text` exposes it (heading sizes are driven by `level`, avoiding two competing mechanisms).

<DemoBlock title="size presets">
  <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--oas-space-2)">
    <oas-text size="small">small helper text</oas-text>
    <oas-text>medium baseline (inherited by default)</oas-text>
    <oas-text size="large">large emphasis</oas-text>
  </div>
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
    <oas-paragraph>Paragraph one</oas-paragraph>
    <oas-paragraph type="secondary">Paragraph two</oas-paragraph>
  </div>
</DemoBlock>

## Content Blocks (blockquote / list / table)

The `tag` whitelist covers block-level content forms, shared by all three components (text/title/paragraph) — no separate long-form prose container is introduced; this extends the existing `tag` system directly:

- `tag="blockquote"`: quote block (token border on the inline-start side + logical indent, RTL mirrors with the writing direction);
- `tag="ul"` / `tag="ol"`: list blocks (normalized indent, built-in li spacing; li items go in the default slot);
- `tag="table"`: content table (full width + collapsed borders; for th/td cell details prefer host styles or the `oas-table` feature component);
- Table parts (`thead`/`tbody`/`tr`/`th`/`td`/`caption`) and description lists (`dl`/`dt`/`dd`) are in the whitelist as well.

List/table blocks use unwrapped projection: the default slot is attached directly to the root element (`ul` accepts only `li` children and `table` only table parts — the content span wrapper would be invalid inside these tags).

<DemoBlock title="Quote block (tag=blockquote)">
  <div style="width: 100%">
    <oas-paragraph tag="blockquote">Design is not about adding things, but about nothing left to take away.</oas-paragraph>
    <oas-paragraph tag="blockquote" type="secondary">Simplicity is the ultimate sophistication. — For quotes in help docs and prose.</oas-paragraph>
  </div>
</DemoBlock>

<DemoBlock title="List blocks (tag=ul / tag=ol)">
  <div style="display: flex; gap: 32px; flex-wrap: wrap">
    <oas-text tag="ul" style="min-width: 200px">
      <li>Install the core package and icons</li>
      <li>Register component families at the entry</li>
      <li>Import single components on demand</li>
    </oas-text>
    <oas-text tag="ol" style="min-width: 200px">
      <li>Read the design spec</li>
      <li>Compose pages from components</li>
      <li>Wire up theme tokens</li>
    </oas-text>
  </div>
</DemoBlock>

<DemoBlock title="Content table (tag=table)">
  <div style="width: 100%">
    <oas-text tag="table">
      <thead>
        <tr><th>Component</th><th>Category</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>oas-collapse</td><td>Data display</td><td>Stable</td></tr>
        <tr><td>oas-list</td><td>Data display</td><td>Stable</td></tr>
        <tr><td>oas-typography</td><td>Basic</td><td>Stable</td></tr>
      </tbody>
    </oas-text>
  </div>
</DemoBlock>

Cell details for `th` bolding and `td` borders/padding are left to the host (shadow styles cannot reach deep into slotted subtrees); for sorting/filtering/pagination content tables use `oas-table` directly.

## API

| Component | Tag | Props |
| --- | --- | --- |
| Text | `oas-text` | `type`, `ellipsis`, `copyable` |
| Title | `oas-title` | `level` (1-5), `type`, `ellipsis` |
| Paragraph | `oas-paragraph` | `type`, `ellipsis` |

`type` values: `default` / `secondary` / `success` / `warning` / `danger` / `disabled`.

### oas-text

#### Attributes

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
| `size` | Three font-size presets mapped to font-size tokens (medium falls back to inherited size) | `string` | — |
| `strong` | Bold (font-weight 600, `<strong>` semantics) | — | — |
| `tag` | Render tag: replaces the default element — inline semantics (sub/sup/ins/em/strong etc.) and content-block forms (blockquote quote / ul·ol list / table content table / dl description list plus table parts) are all whitelisted; list and table blocks use unwrapped projection (the default slot attaches directly to the root) | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | Underline | — | — |
| `weight` | Font weight: `regular`/`medium`/`semibold`/`bold` (compatible with the strong boolean) | `WeightType` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

#### Slots

| Name | Description |
| --- | --- |
| default | Text content |
| `actions` | Action slot (copy/edit buttons etc.); position determined by `actions-position` |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-line-clamp` | `2` |
| `--oas-text-mark-bg` | `var(--oas-color-warning)` |

### oas-title

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions-position` | Action bar position: `start` (before the text) / `end` (default, after the text); pair with `slot="actions"` | `string` | `end` |
| `align` | Text alignment: `start` (default) / `center` / `end` / `justify` (start/end are logical values, RTL-safe); invalid values fall back to default | `AlignType` | — |
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
| `numeric` | Tabular numerals (`font-variant-numeric: tabular-nums`) so number columns line up in tables/stats | — | — |
| `strong` | Bold (font-weight 600, `<strong>` semantics) | — | — |
| `tag` | Render tag: replaces the default element — inline semantics (sub/sup/ins/em/strong etc.) and content-block forms (blockquote quote / ul·ol list / table content table / dl description list plus table parts) are all whitelisted; list and table blocks use unwrapped projection (the default slot attaches directly to the root) | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | Underline | — | — |
| `weight` | Font weight tier: `regular` (400) / `medium` (500) / `semibold` (600) / `bold` (700); an explicit tier wins over the `strong` boolean; invalid values fall back | `WeightType` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

#### Slots

| Name | Description |
| --- | --- |
| default | Title content |
| `actions` | Action slot (copy/edit buttons etc.); position determined by `actions-position` |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-line-clamp` | `2` |
| `--oas-text-mark-bg` | `var(--oas-color-warning)` |

### oas-paragraph

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions-position` | Action bar position: `start` (before the text) / `end` (default, after the text); pair with `slot="actions"` | `string` | `end` |
| `align` | Text alignment: `start` (default) / `center` / `end` / `justify` (start/end are logical values, RTL-safe); invalid values fall back to default | `AlignType` | — |
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
| `numeric` | Tabular numerals (`font-variant-numeric: tabular-nums`) so number columns line up in tables/stats | — | — |
| `strong` | Bold (font-weight 600, `<strong>` semantics) | — | — |
| `tag` | Render tag: replaces the default element — inline semantics (sub/sup/ins/em/strong etc.) and content-block forms (blockquote quote / ul·ol list / table content table / dl description list plus table parts) are all whitelisted; list and table blocks use unwrapped projection (the default slot attaches directly to the root) | `string` | — |
| `type` | Text type: `default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | Underline | — | — |
| `weight` | Font weight tier: `regular` (400) / `medium` (500) / `semibold` (600) / `bold` (700); an explicit tier wins over the `strong` boolean; invalid values fall back | `WeightType` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

#### Slots

| Name | Description |
| --- | --- |
| default | Paragraph content |
| `actions` | Action slot (copy/edit buttons etc.); position determined by `actions-position` |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-line-clamp` | `2` |
| `--oas-text-mark-bg` | `var(--oas-color-warning)` |
