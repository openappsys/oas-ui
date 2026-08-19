# Code

A code block component (self-developed regex token highlighting, no third-party highlighting engine) supporting basic coloring for common languages, line numbers, and a copy button.

## JavaScript

<DemoBlock title="JavaScript highlighting">
  <div style="width: 100%">
    <oas-code language="js" code='const add = (a, b) => {
  return a + b // sum
}
console.log(add(1, 2))'></oas-code>
  </div>
</DemoBlock>

Basic coloring for keywords / strings / comments / numbers / functions / operators.

## TypeScript

<DemoBlock title="TypeScript highlighting">
  <div style="width: 100%">
    <oas-code language="ts" code='interface User {
  id: number
  name: string
}
const user: User = { id: 1, name: "Alice" }'></oas-code>
  </div>
</DemoBlock>

## HTML

<DemoBlock title="HTML highlighting">
  <div style="width: 100%">
    <oas-code language="html" code='<div class="card">
  <!-- Card title -->
  <h2>Hello</h2>
</div>'></oas-code>
  </div>
</DemoBlock>

Tag names and attribute names are colored separately.

## CSS

<DemoBlock title="CSS highlighting">
  <div style="width: 100%">
    <oas-code language="css" code='.card {
  /* Rounded card */
  border-radius: 8px;
  background: #fff;
}'></oas-code>
  </div>
</DemoBlock>

## JSON

<DemoBlock title="JSON highlighting">
  <div style="width: 100%">
    <oas-code language="json" code='{
  "name": "oas-ui",
  "version": 1.6,
  "zeroDep": true
}'></oas-code>
  </div>
</DemoBlock>

## Line Numbers + Copy

<DemoBlock title="Show line numbers">
  <div style="width: 100%">
    <oas-code language="js" show-line-number code='function fib(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
}'></oas-code>
  </div>
</DemoBlock>

`show-line-number` displays the line number column; the copy button in the top-right corner (disable with `copyable="false"`) copies the source on click and emits the `oas-copy` event.

## Copy Button Toggle

<DemoBlock title="copyable copy button">
  <div style="width: 100%">
    <oas-code language="js" code='console.log("Copy button shown by default")'></oas-code>
    <oas-code language="js" copyable="false" code='console.log("copyable=false hides the copy button")' style="margin-top: var(--oas-space-3)"></oas-code>
  </div>
</DemoBlock>

`copyable` controls the top-right copy button (default `true`): setting it to `false` hides the button; clicking the button writes the source to the clipboard and briefly shows "已复制".

## Unknown Language

<DemoBlock title="Unknown language rendered as plain text">
  <div style="width: 100%">
    <oas-code language="unknown-lang" code='This is plain text without any highlighting.'></oas-code>
  </div>
</DemoBlock>

When the language is unknown, the content is rendered as plain text (escaped) without errors.

## Inline Code (inline)

`inline` renders inline code (monospace with a light background box, non-block, no line breaks — for code snippets inside prose):

<DemoBlock title="Inline code">
  <p>Declare a constant with <oas-code inline language="js" code='const a = 1'></oas-code> and print it with <oas-code inline language="js" code='console.log(a)'></oas-code>.</p>
</DemoBlock>

## Word Wrap (word-wrap)

With `word-wrap`, long code wraps instead of scrolling horizontally:

<DemoBlock title="Long code wrapping">
  <div style="width: 100%; max-width: 400px;">
    <oas-code language="js" word-wrap code='const veryLongVariableName = someFunctionWithAVeryLongName(argumentOne, argumentTwo, argumentThree, argumentFour, argumentFive)'></oas-code>
  </div>
</DemoBlock>

## Trimming (trim)

`trim` defaults to true (strips leading/trailing whitespace); `trim="false"` preserves it:

<DemoBlock title="trim comparison">
  <oas-code language="js" code='\n  const a = 1\n  '></oas-code>
  <oas-code language="js" trim="false" code='\n  const a = 1\n  '></oas-code>
</DemoBlock>

## Inline Size (size)

`size` has four tiers (xs/small/medium/large — font-size tiers in inline context):

<DemoBlock title="Inline sizes">
  <oas-code inline size="xs" language="js" code='const a = 1'></oas-code>
  <oas-code inline size="small" language="js" code='const a = 1'></oas-code>
  <oas-code inline language="js" code='const a = 1'></oas-code>
  <oas-code inline size="large" language="js" code='const a = 1'></oas-code>
</DemoBlock>

## Inline Variant (variant)

`variant` has four styles (subtle light background by default / outline bordered / plain text only / solid filled):

<DemoBlock title="Inline variants">
  <oas-code inline language="js" code='const a = 1'></oas-code>
  <oas-code inline variant="outline" language="js" code='const a = 1'></oas-code>
  <oas-code inline variant="plain" language="js" code='const a = 1'></oas-code>
  <oas-code inline variant="solid" language="js" code='const a = 1'></oas-code>
</DemoBlock>

## Inline Color (color)

`color` accepts 11 preset color names (auto-adapting to light/dark themes) or any CSS color value (takes effect directly, overriding presets and the default). Controls the text color in inline context:

<DemoBlock title="Inline colors">
  <oas-code inline language="js" color="red" code='const a = 1'></oas-code>
  <oas-code inline language="js" color="green" code='const a = 1'></oas-code>
  <oas-code inline language="js" color="blue" code='const a = 1'></oas-code>
  <oas-code inline language="js" color="#0e7490" code='const a = 1'></oas-code>
</DemoBlock>

## Font Size

Font size defaults to 0.875× the outer context (`0.875em`); override with the CSS variable `--oas-code-font`.

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `code` | Raw source code | `string` | — |
| `color` | Inline text color: accepts 11 preset names (`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`, mapped to `--oas-preset-*-text` tokens) or any CSS color value | `string` | — |
| `copyable` | Show the copy button | `string` | `true` |
| `inline` | Inline code mode: renders as a monospace light-background box for code snippets inside prose | `boolean` | — |
| `language` | Language: `js`/`ts`/`html`/`css`/`json`; unknown falls back to plain text | `string` | — |
| `show-line-number` | Show the line number column | `boolean` | — |
| `size` | Inline font-size tier: `xs` / `small` / `medium` (default) / `large`; invalid values fall back to `medium` with a warning | — | — |
| `trim` | Strip leading/trailing whitespace (default true; `trim="false"` preserves it) | `string` | `true` |
| `variant` | Inline style: `subtle` (default light background) / `outline` (bordered) / `plain` (text only) / `solid` (filled); invalid values fall back to `subtle` with a warning | — | — |
| `word-wrap` | Wrap long code instead of horizontal scrolling | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-copy` | Copy succeeded, `detail: { text }` |
| `oas-copy-error` | Copy failed, `detail: { text }` |

### Engine Choice (Architecture Decision)

**Self-developed regex token highlighting, no third-party highlighting library**:

1. **Zero-dependency core selling point**: zero third-party runtime dependencies; self-developed regex highlighting introduces no dependencies.
2. **Covers basic coloring of mainstream languages**: keyword/string/comment/number/function/tag/attribute coloring for js/ts/html/css/json covers most documentation scenarios; precise syntax-level highlighting (multi-line state machines, context awareness) is a future enhancement to be re-evaluated.
3. **Safety**: HTML is escaped before highlighting to prevent injection; unknown languages render as plain text without errors.
4. Implemented as a single-pass combined regex (mutually exclusive capture groups) with one `replace`, avoiding a second pass that could break escaped entities.
