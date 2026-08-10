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

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `code` | Raw source code | — | — |
| `copyable` | Show the copy button | — | `true` |
| `language` | Language: `js`/`ts`/`html`/`css`/`json`; unknown falls back to plain text | — | — |
| `show-line-number` | Show the line number column | — | — |

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
