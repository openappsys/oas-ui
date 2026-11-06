# JSONViewer

A read-only JSON tree viewer with collapse/expand, search, JSONPath copy, fixed-row virtual scrolling, keyboard support and screen-reader semantics. Use it as an embeddable block for API responses, configuration review or log inspection; two instances can sit side by side for comparison.

## Basic usage

Pass raw JSON through the `text` attribute. The root is expanded by default (`default-expand-depth="1"`). String values keep their full text in the DOM; long values are visually ellipsized on one line with the full text in `title`.

<DemoBlock title="API response">
  <oas-json-viewer id="jv-basic" height="300" text='{"code":0,"message":"ok","data":{"user":{"id":1024,"name":"Ada","roles":["admin","editor"]},"stats":{"requests":1280,"latency":23.6,"healthy":true},"note":null}}'></oas-json-viewer>
</DemoBlock>

You can also pass an object or array through the `data` property; whichever of `data` or `text` is written last wins. Writing `data` removes the `text` attribute, and writing `text` clears the cached data.

<DemoBlock title="data property channel">
  <oas-json-viewer id="jv-data" height="260"></oas-json-viewer>
</DemoBlock>

## Custom expand/collapse icons

Provide `template[slot="toggle-collapsed"]` and `template[slot="toggle-expanded"]` for the collapsed and expanded states. Templates can contain text, SVG or boxed elements; a missing template falls back to the default triangle, and leaf rows never render an icon. Use `part="toggle-icon"` inside a template for `::part(toggle-icon)` styling, or use inline styles.

<DemoBlock title="Boxed + / − icons (click the root row)">
  <oas-json-viewer id="jv-custom-toggle" height="220" default-expand-depth="0" text='{"code":0,"message":"ok","data":{"name":"Ada","admin":true}}'>
    <template slot="toggle-collapsed">
      <span part="toggle-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid currentColor;border-radius:3px">+</span>
    </template>
    <template slot="toggle-expanded">
      <span part="toggle-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid currentColor;border-radius:3px">−</span>
    </template>
  </oas-json-viewer>
</DemoBlock>

## Controlled expansion

When the `expanded` attribute is present the component is controlled: it only emits `oas-toggle` / `oas-expanded-change` and never writes the attribute back. Updating `expanded` from the host re-renders the tree. Paths use single-quoted JSONPath, for example `$['data']['users'][0]`.

<DemoBlock title="expanded controlled by external buttons">
  <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-3)">
    <oas-button id="jv-expand-all" size="small">Expand all</oas-button>
    <oas-button id="jv-collapse-all" size="small">Collapse all</oas-button>
    <oas-button id="jv-expand-root" size="small">Root only</oas-button>
  </div>
  <oas-json-viewer id="jv-controlled" height="280" default-expand-depth="0" expanded='["$"]' text='{"service":"billing","replicas":3,"env":{"region":"cn-east-1","debug":false},"ports":[80,443]}'></oas-json-viewer>
  <p id="jv-controlled-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">Controlled expanded: $</p>
</DemoBlock>

## Search

Search is case-insensitive and matches object keys and primitive values. Matching automatically expands ancestors without hiding other nodes. The toolbar shows the count and cycles through previous/next matches. `Ctrl/Cmd+F` focuses search when focus is inside the component; set `search-shortcut="false"` to disable it.

<DemoBlock title="Search count and auto-expansion">
  <oas-json-viewer id="jv-search" height="300" search="a" text='{"name":"Ada","tags":["alpha","beta"],"profile":{"city":"Shanghai","active":true},"items":[{"label":"apple"},{"label":"pear"}]}'></oas-json-viewer>
  <p id="jv-search-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">Search state: —</p>
</DemoBlock>

## Copy path / value / subtree

The toolbar copies the active node's JSONPath, raw value or subtree JSON. You can also call `copyPath()`, `copyValue()` or `copyJson()`. A cancelable `oas-copy` fires before copying, `oas-copied` on success and `oas-copy-error` on failure. `copyable="false"` hides the buttons but keeps the methods available.

<DemoBlock title="Copy event feedback">
  <oas-json-viewer id="jv-copy" height="260" text='{"a.b":[{"c":"hello"}],"nested":{"ok":true}}'></oas-json-viewer>
  <p id="jv-copy-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">Click a toolbar copy button or call an instance method.</p>
</DemoBlock>

```js
const viewer = document.querySelector('#jv-copy')
viewer.scrollToPath("$['a.b'][0]['c']")
await viewer.copyPath()   // $['a.b'][0]['c']
await viewer.copyValue()  // hello
await viewer.copyJson()   // "hello"
```

## Large JSON and virtual scrolling

Fixed-row virtualization turns on automatically above 200 visible rows, keeping only the rows around the viewport in the DOM. Set `virtual="false"` to disable it, and use `height` / `row-height` to control the viewport and row height. A 10k-node instance still supports search, keyboard navigation and `scrollToPath()`.

<DemoBlock title="10k nodes, viewport-only rendering">
  <oas-json-viewer id="jv-large" height="320" row-height="22"></oas-json-viewer>
  <p id="jv-large-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">Generating data…</p>
</DemoBlock>

## Error state and recovery

Invalid `text` shows an error panel and emits `oas-parse-error` with `message` plus locatable `line` / `column`. Writing valid `data` or `text` recovers automatically. Extremely deep nesting that overflows the build/walk stack also enters this recoverable error state (localized message) instead of throwing `RangeError` at the host; copy failures on over-deep subtrees emit `oas-copy-error` and show the failure notice.

<DemoBlock title="Parse failure → recover with valid data">
  <div style="display:flex;gap:var(--oas-space-2);margin-bottom:var(--oas-space-3)">
    <oas-button id="jv-recover" size="small" type="primary">Write valid data</oas-button>
  </div>
  <oas-json-viewer id="jv-error" height="180" text='{"broken": }'></oas-json-viewer>
  <p id="jv-error-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">Waiting for a parse error…</p>
</DemoBlock>

## Display options

Use `compact` for tighter spacing (20px rows and 11px type by default), `toolbar="false"` to hide the toolbar, `copyable="false"` to hide copy buttons, `search-shortcut="false"` to disable the shortcut, `indent` for copied JSON indentation and `aria-label` to name the tree. The example below also sets `height`, `row-height`, `default-expand-depth="2"` and `virtual="false"`.

<DemoBlock title="Compact read-only panel">
  <oas-json-viewer id="jv-compact" style="width: 100%" compact toolbar="false" copyable="false" search-shortcut="false" indent="4" default-expand-depth="2" height="220" row-height="22" virtual="false" aria-label="Build configuration" text='{"build":{"target":"es2022","minify":true,"sourcemap":false},"plugins":["a","b"]}'></oas-json-viewer>
</DemoBlock>

## Keyboard and accessibility

The tree container is a single tab stop and uses `aria-activedescendant` for the active row. Rows expose `role="treeitem"`, `aria-level`, `aria-posinset`, `aria-setsize` and `aria-expanded`. The accessible name supports host `aria-label` (falling back to “JSON tree”) or `aria-labelledby` pointing to in-page elements (the referenced elements are resolved across the shadow boundary and written into the tree container: engines supporting `ariaLabelledByElements` get live references, others fall back to a reference-text snapshot on the container's aria-label — idref does not cross the shadow boundary, so a bare mirror cannot be resolved; missing references fall back to the host aria-label channel, and the snapshot text is not auto-tracked on reference changes).

| Key | Behavior |
| --- | --- |
| `↑` / `↓` | Previous / next visible row |
| `→` | Expand a container; when expanded, move into its first child |
| `←` | Collapse a container; when collapsed, move to its parent |
| `Home` / `End` | First / last row |
| `Enter` / `Space` | Toggle the focused container |
| `Ctrl/Cmd+F` | Focus search while focus is inside |

## Theme and parts

All colors use CSS variable tokens and follow dark mode automatically. Style `viewer`, `toolbar`, `viewport`, `row`, `key`, `value`, `twisty`, `error` and `copy-status` with `::part()`. With `toolbar="false"`, copy feedback appears in a bottom-end floating `part="copy-status"` notice. Indentation uses logical properties in RTL, while JSON text keeps bidi isolation.

<script>
if (typeof window !== 'undefined') {
  customElements.whenDefined('oas-json-viewer').then(() => {
  const dataEl = document.querySelector('#jv-data')
  if (dataEl) {
    dataEl.data = {
      project: 'OAS-UI',
      components: 163,
      stable: true,
      maintainers: [{ name: 'Ada', role: 'core' }, { name: 'Lin', role: 'docs' }],
      meta: { license: 'MIT', stars: 1280 },
    }
  }

  const controlled = document.querySelector('#jv-controlled')
  const controlledState = document.querySelector('#jv-controlled-state')
  if (controlled) {
    const setExpanded = (paths) => {
      controlled.setAttribute('expanded', JSON.stringify(paths))
      if (controlledState) controlledState.textContent = `Controlled expanded: ${paths.length ? paths.join(', ') : '(empty)'}`
    }
    controlled.addEventListener('oas-toggle', (event) => {
      const { path, expanded } = event.detail
      const set = new Set(controlled.expanded)
      if (expanded) set.add(path)
      else set.delete(path)
      setExpanded([...set])
    })
    controlled.addEventListener('oas-expanded-change', (event) => setExpanded(event.detail.paths))
    document.querySelector('#jv-expand-all')?.addEventListener('click', () => controlled.expandAll())
    document.querySelector('#jv-collapse-all')?.addEventListener('click', () => controlled.collapseAll())
    document.querySelector('#jv-expand-root')?.addEventListener('click', () => setExpanded(['$']))
  }

  const searchEl = document.querySelector('#jv-search')
  const searchState = document.querySelector('#jv-search-state')
  if (searchEl && searchState) {
    searchEl.addEventListener('oas-search-change', (event) => {
      const { query, matches, activeIndex } = event.detail
      searchState.textContent = `Search “${query}”: ${matches} matches, current ${activeIndex + 1}`
    })
    const count = searchEl.shadowRoot?.querySelector('[part="count"]')?.textContent
    if (count) searchState.textContent = `Search “${searchEl.getAttribute('search') ?? ''}”: ${count}`
  }

  const copyEl = document.querySelector('#jv-copy')
  const copyState = document.querySelector('#jv-copy-state')
  if (copyEl && copyState) {
    copyEl.scrollToPath("$['a.b'][0]['c']")
    copyEl.addEventListener('oas-copied', (event) => {
      copyState.textContent = `Copied ${event.detail.kind}: ${event.detail.text.slice(0, 80)}`
    })
    copyEl.addEventListener('oas-copy-error', () => {
      copyState.textContent = 'Copy failed: the browser did not grant clipboard permission'
    })
  }

  const largeEl = document.querySelector('#jv-large')
  const largeState = document.querySelector('#jv-large-state')
  if (largeEl && largeState) {
    largeEl.data = Array.from({ length: 10_000 }, (_, i) => i)
    const updateCount = () => {
      const rendered = largeEl.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0
      largeState.textContent = `10,000 nodes; current DOM rows ${rendered} (fixed-row virtual window)`
    }
    largeEl.shadowRoot?.querySelector('[part="viewport"]')?.addEventListener('scroll', updateCount, {
      passive: true,
    })
    requestAnimationFrame(updateCount)
  }

  const errorEl = document.querySelector('#jv-error')
  const errorState = document.querySelector('#jv-error-state')
  if (errorEl && errorState) {
    errorEl.addEventListener('oas-parse-error', (event) => {
      const { message, line, column } = event.detail
      errorState.textContent = `Parse failed${line ? ` (${line}:${column})` : ''}: ${message}`
    })
    const panel = errorEl.shadowRoot?.querySelector('[part="error"]')?.textContent
    if (panel) errorState.textContent = panel
    document.querySelector('#jv-recover')?.addEventListener('click', () => {
      errorEl.data = { recovered: true, items: [1, 2, 3] }
      errorState.textContent = 'Valid data written; the error state recovered.'
    })
  }
  })
}
</script>

## Utility functions

The pure model helpers are also exported from `@oas-ui/ui/data/json-viewer` (or `@oas-ui/ui`) for host-side custom rendering or preprocessing: `buildJsonTree`, `flattenVisible`, `searchJson`, `encodeJsonPath`, `parseJsonPath`, `collectAncestorPaths`, `serializeValue`, `serializeJson`. They do not depend on the DOM.

## API

### oas-json-viewer

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name of the tree (defaults to “JSON tree”) | — | — |
| `aria-labelledby` | Accessible name mirror (second channel): the host idref list is mirrored as-is to the tree container (removed state cleans up; when both aria-label and aria-labelledby are set, native accessible-name computation gives aria-labelledby precedence) | — | — |
| `compact` | Compact mode (20px rows, 11px type and tighter toolbar padding by default) | — | — |
| `copyable` | Copy button switch; `false` hides buttons while copy methods remain available | `string` | — |
| `default-expand-depth` | Initial expand depth: 0 keeps only the root, 1 expands the root (default), and so on | `string` | `1` |
| `expanded` | Controlled expanded path array (JSON string). When present the component only emits events and never writes back | `string[]` | — |
| `height` | Viewport height in px (default 360) | `string` | `360` |
| `indent` | Indent width for copied JSON (default 2) | `string` | `2` |
| `row-height` | Fixed row height in px (default 24, minimum 20) | `string` | — |
| `search` | Search query (case-insensitive substring over keys and primitive values) | `string` | — |
| `search-shortcut` | Intercept Ctrl/Cmd+F to focus search while focus is inside; `false` disables it | `string` | — |
| `text` | Raw JSON text (attribute channel; SSR/DSD friendly) | `string` | — |
| `toolbar` | Toolbar switch; `false` hides search, expand and copy buttons | `string` | — |
| `virtual` | Virtual scrolling switch; auto by default (enabled above 200 visible rows), `false` forces it off | `string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `data` | Object/array channel (property); whichever of data or text was written last wins | `JsonValue` | — |
| `expanded` | Controlled expanded path array property; writing it sets the expanded attribute | `string[]` | — |
| `search` | Search query property; writing it reflects the search attribute | `string` | — |
| `text` | Raw JSON property; writing it clears the data cache | `string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `expandAll` | `expandAll(): void` | Expand every container; controlled mode emits oas-expanded-change |
| `collapseAll` | `collapseAll(): void` | Collapse every container |
| `expandToDepth` | `expandToDepth(depth: number): void` | Expand to the given depth: 0 leaves only the root, 1 root plus children, and so on |
| `scrollToPath` | `scrollToPath(path: string): void` | Scroll to a JSONPath and transiently expand folded ancestors |
| `searchNext` | `searchNext(): void` | Jump to the next search match (cyclic) |
| `searchPrev` | `searchPrev(): void` | Jump to the previous search match (cyclic) |
| `copyPath` | `copyPath(path: string): Promise<boolean>` | Copy the JSONPath (active node by default) |
| `copyValue` | `copyValue(path: string): Promise<boolean>` | Copy the value: raw text for primitives, formatted JSON for containers |
| `copyJson` | `copyJson(path: string): Promise<boolean>` | Copy the subtree JSON (strings stay quoted) |

#### Events

| Event | Description |
| --- | --- |
| `oas-copied` | Fired after a successful copy, `detail: { path, kind, text }` |
| `oas-copy` | Cancelable event before copying, `detail: { path, kind, text }` |
| `oas-copy-error` | Clipboard write failed, `detail: { path, kind, text, error }` |
| `oas-expanded-change` | Bulk expand/collapse requested, `detail: { paths }`; controlled mode waits for the host to write back |
| `oas-parse-error` | Fired when text cannot be parsed, `detail: { message, line?, column?, source }` |
| `oas-search-change` | Search state changed, `detail: { query, matches, activeIndex }`; activeIndex is -1 when nothing matches |
| `oas-toggle` | Fired when a node expands/collapses, `detail: { path, expanded }`; controlled mode only emits |

#### Slots

| Name | Description |
| --- | --- |
| `template[slot="toggle-collapsed"]` | Collapsed icon template (text, SVG or boxed content; the default triangle is used when absent) |
| `template[slot="toggle-expanded"]` | Expanded icon template (the default triangle is used when absent; leaf rows render no icon) |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-json-viewer-font-size` | Code font size (default 12px) | `12px` |
| `--oas-json-viewer-height` | Viewport height (default 360px; used when the height attribute is absent) | `360px` |
| `--oas-json-viewer-row-height` | Row height (default 24px, accepts CSS lengths; used when row-height/compact is absent) | `24px` |
