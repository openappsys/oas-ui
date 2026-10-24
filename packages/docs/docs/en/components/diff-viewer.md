# DiffViewer Text Diff

A read-only text diff viewer: line-level differences with word-level highlights, unified and split views, collapsed unchanged regions, fixed-row-height virtual scrolling, and full keyboard/screen-reader support. Suited to config version comparison, prompt review, and formatted JSON before/after checks. It does not edit, merge, accept/reject changes, or compute structural JSON diffs.

## Basic usage

Pass the two texts through `old-text` / `new-text`. The default unified view marks deleted lines with `−` and added lines with `+`, showing both line-number columns. Unchanged runs longer than `context` (default 3) collapse into an expandable row.

<DemoBlock title="Config file versions">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-basic"
    height="280"
    context="2"
    aria-label="Build config diff"
    old-text='{
  "name": "oas-ui",
  "version": "2.6.3",
  "debug": false,
  "targets": ["es2020", "es2022"],
  "plugins": ["a", "b"]
}'
    new-text='{
  "name": "oas-ui",
  "version": "2.7.0",
  "debug": true,
  "targets": ["es2022", "es2023"],
  "plugins": ["a", "b"]
}'
  ></oas-diff-viewer>
</DemoBlock>

Word-level highlighting only marks the truly changed fragments of paired replacement lines; replacement blocks with unequal line counts stay line-level to avoid misleading matches.

## Empty and identical

Empty inputs show a placeholder; identical inputs keep every row and show “Both sides are identical”. Both states downgrade ARIA semantics so no empty grid structure is exposed.

<DemoBlock title="Empty and identical">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-empty"
    height="120"
    aria-label="Empty example"
  ></oas-diff-viewer>
  <oas-diff-viewer
    style="width: 100%"
    id="dv-same"
    height="160"
    old-text='alpha
beta'
    new-text='alpha
beta'
  ></oas-diff-viewer>
</DemoBlock>

## Split view

`mode="split"` renders two columns: old text on the start side, new text on the end side (mirrored automatically in RTL), aligned by change block. `old-label` / `new-label` override the column headers.

<DemoBlock title="Side-by-side review">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-split"
    mode="split"
    height="240"
    old-label="v2.6.3"
    new-label="v2.7.0"
    split-min-width="480"
    old-text='server.host = "127.0.0.1"
server.port = 5175
cache.enabled = false
log.level = "warn"'
    new-text='server.host = "0.0.0.0"
server.port = 5175
cache.enabled = true
log.level = "info"'
  ></oas-diff-viewer>
</DemoBlock>

When the container is narrower than `split-min-width`, the viewer degrades to unified (the `mode` attribute keeps its value) so neither side becomes unreadable. Split rows use `data-op="replace"`; the real insert/delete op lives on each `before-code` / `after-code` cell — read the cell when styling via `::part()`.

## Folding and bulk actions

Fold rows are clickable, focusable with Tab, and expandable with `Enter`. `expandAll()` / `collapseAll()` switch all regions at once; fold state resets when the data changes so old positions cannot point at new content.

<DemoBlock title="Expand all / collapse unchanged">
  <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-3)">
    <oas-button id="dv-expand" size="small">Expand all</oas-button>
    <oas-button id="dv-collapse" size="small">Collapse unchanged</oas-button>
    <oas-button id="dv-update" size="small" type="primary">Simulate update</oas-button>
  </div>
  <oas-diff-viewer
    style="width: 100%"
    id="dv-fold"
    height="260"
    context="1"
    old-text='1. install dependencies
2. copy config
3. build packages
4. run tests
5. publish artifacts
6. notify team'
    new-text='1. install dependencies
2. copy config
3. build packages
4. run unit tests
5. run e2e tests
6. publish artifacts
7. notify team'
  ></oas-diff-viewer>
  <p id="dv-fold-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">Last event: —</p>
</DemoBlock>

## Long files and virtual scrolling

When aligned rows exceed `virtual-threshold` (default 2000), fixed-row-height virtual scrolling keeps only viewport-near rows in the DOM. `virtual="true"` forces it on, `virtual="false"` turns it off. `height` and `row-height` control the viewport and row height.

<DemoBlock title="3000 lines, viewport only">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-large"
    height="260"
    row-height="20"
    virtual="true"
    virtual-threshold="100"
    context="2500"
    aria-label="Long text diff"
  ></oas-diff-viewer>
  <p id="dv-large-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">Generating data…</p>
</DemoBlock>

## Comparison strategy

`ignore-whitespace` normalizes whitespace before comparing (runs collapsed, line edges trimmed) while displaying the original text. `max-edits` (default 1000) caps the line-level edit distance; beyond it the viewer degrades to block replacement and shows a notice, so huge diffs cannot block the main thread.

<DemoBlock title="Ignore whitespace">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-loose"
    height="180"
    ignore-whitespace
    max-edits="100"
    old-text='const a = 1
const b   = 2
const c = 3'
    new-text='const a = 1
const b = 2
const c = 4'
  ></oas-diff-viewer>
</DemoBlock>

## Plain-text review

`toolbar="false"` hides stats and bulk actions, `show-line-numbers="false"` hides line numbers, and `wrap` allows long lines to wrap (wrapping disables virtual scrolling and lets row height follow content).

<DemoBlock title="No toolbar, wrapped">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-text"
    toolbar="false"
    wrap
    show-line-numbers="false"
    height="200"
    old-text='The quick brown fox jumps over the lazy dog. This sentence is intentionally long so that the wrap behaviour can be inspected in a narrow container.'
    new-text='The quick brown fox leaps over the lazy dog. This sentence is intentionally long so that the wrap behaviour can be inspected in a narrow container.'
  ></oas-diff-viewer>
</DemoBlock>

## Stats and events

The read-only `stats` property returns `{ added, removed, unchanged, hunks }`; `oas-diff-change` is dispatched on mount and after data updates with the same shape. Expanding a fold dispatches `oas-hunk-toggle`; `expandAll()` / `collapseAll()` dispatch one event per changed fold region (`expanded` true / false) with `{ index, expanded, start, count }`.

```js
const viewer = document.querySelector('#dv-basic')
viewer.stats // { added: 3, removed: 3, unchanged: 3, hunks: 1 }
viewer.scrollToChange(0) // scroll to the first change block
viewer.expandAll()
viewer.addEventListener('oas-hunk-toggle', (event) => {
  console.log(event.detail) // { index, expanded, start, count }
})
```

## Keyboard and accessibility

The viewport is a single Tab stop; `aria-activedescendant` points at the active row. Semantics are `role="grid"` + `row` + `gridcell`; line numbers are hidden from screen readers and changed rows carry "Added line N / Removed line M" accessible names. Additions and deletions are conveyed by the `+` / `−` prefix, background color, and accessible name together — never color alone.

| Key | Behavior |
| --- | --- |
| `↑` / `↓` | Previous / next row |
| `Home` / `End` | First / last row |
| `PageUp` / `PageDown` | Page up / down |
| `Enter` / `Space` | Expand / collapse the current fold |

## Theme and parts

Add/remove backgrounds and word highlights use dedicated opaque tokens (`--oas-color-diff-add-bg` / `--oas-color-diff-del-bg` plus their `-word-` variants, switched automatically in dark mode); line numbers use `--oas-color-diff-gutter-text`. Style with `::part()`: `viewer`, `toolbar`, `status`, `added`, `removed`, `summary`, `split-head`, `row`, `code`, `before-no`, `after-no`, `fold`, `fold-toggle`, `placeholder`. RTL mirrors logical properties and keeps old text on the start side in split view.

## API

Pure model helpers are also available from `@oas-ui/ui/data/diff-viewer` (or `@oas-ui/ui`) for host-side preprocessing or custom rendering: `diffLines`, `layoutRows`, `buildDiffRows`, `layoutSplitRows`, `buildSplitRows`, `inlineSegments`, `splitLines`. They do not depend on the DOM.

### oas-diff-viewer

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name of the diff table (defaults to “Diff”) | — | — |
| `context` | Unchanged lines kept on each side when folding (default 3; 0 keeps only the changed lines) | `string` | `3` |
| `height` | Viewport height in px (default 480) | `string` | `480` |
| `ignore-whitespace` | Normalize whitespace before comparing (collapse runs, trim line edges) while displaying the original text | `boolean` | — |
| `max-edits` | Line-level edit-distance cap (default 1000); beyond it the viewer degrades to block replacement and shows a notice | `string` | `1000` |
| `mode` | View mode: `unified` (default) / `split` | `string` | `unified` |
| `new-label` | Header text for the new-text split column (defaults to “After”) | `string` | — |
| `new-text` | New text (attribute channel; SSR/DSD friendly) | `string` | — |
| `old-label` | Header text for the old-text split column (defaults to “Before”) | `string` | — |
| `old-text` | Old text (attribute channel; SSR/DSD friendly) | `string` | — |
| `row-height` | Fixed row height in px (default 22, minimum 12) | `string` | `22` |
| `show-line-numbers` | Line-number toggle; `false` hides the line-number cells | `string` | — |
| `split-min-width` | Minimum container width in px for split view (default 640); narrower containers fall back to unified | `string` | `640` |
| `toolbar` | Toolbar toggle; `false` hides stats and bulk actions | `string` | — |
| `virtual` | Virtual scrolling: auto by default (enabled when aligned rows exceed virtual-threshold), `true` forces it on, `false` turns it off | `string` | — |
| `virtual-threshold` | Aligned-row threshold for enabling virtual scrolling (default 2000) | `string` | `2000` |
| `wrap` | Wrap long lines; wrapping disables virtual scrolling and lets row height follow content | `boolean` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `newText` | New-text property; writes reflect the `new-text` attribute | `string` | — |
| `oldText` | Old-text property; writes reflect the `old-text` attribute | `string` | — |
| `stats` | Diff statistics (read-only): `{ added, removed, unchanged, hunks }` | `DiffStats` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `expandAll` | `expandAll(): void` | Expand all unchanged regions |
| `collapseAll` | `collapseAll(): void` | Collapse all unchanged regions |
| `scrollToChange` | `scrollToChange(index: number): boolean` | Scroll to the given change block and focus its first row; returns false when out of range |

#### Events

| Event | Description |
| --- | --- |
| `oas-diff-change` | Dispatched after data updates, `detail: { added, removed, unchanged, hunks }` |
| `oas-hunk-toggle` | Dispatched after a fold expands/collapses, `detail: { index, expanded, start, count }` |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-diff-viewer-add-bg` | `var(--oas-color-diff-add-bg)` |
| `--oas-diff-viewer-add-word-bg` | `var(--oas-color-diff-add-word-bg)` |
| `--oas-diff-viewer-del-bg` | `var(--oas-color-diff-del-bg)` |
| `--oas-diff-viewer-del-word-bg` | `var(--oas-color-diff-del-word-bg)` |
| `--oas-diff-viewer-height` | `480px` |
| `--oas-diff-viewer-row-height` | `22px` |

<script>
if (typeof window !== 'undefined') {
  customElements.whenDefined('oas-diff-viewer').then(() => {
    const fold = document.querySelector('#dv-fold')
    const state = document.querySelector('#dv-fold-state')
    const log = (message) => {
      if (state) state.textContent = `Last event: ${message}`
    }
    document.querySelector('#dv-expand')?.addEventListener('click', () => fold?.expandAll())
    document.querySelector('#dv-collapse')?.addEventListener('click', () => fold?.collapseAll())
    document.querySelector('#dv-update')?.addEventListener('click', () => {
      if (!fold) return
      const next = fold.newText.includes('8. archive logs') ? '7. notify team' : '7. notify team\n8. archive logs'
      fold.newText = fold.newText.replace('7. notify team', next)
      log(`content updated, ${fold.stats.added} added / ${fold.stats.removed} removed`)
    })
    fold?.addEventListener('oas-hunk-toggle', (event) => {
      const detail = event.detail
      log(`fold ${detail.index + 1} ${detail.expanded ? 'expanded' : 'collapsed'} (${detail.count} lines)`)
    })
    fold?.addEventListener('oas-diff-change', (event) => {
      const detail = event.detail
      log(`diff updated: +${detail.added} / −${detail.removed} / ${detail.hunks} changes`)
    })

    const large = document.querySelector('#dv-large')
    const largeState = document.querySelector('#dv-large-state')
    if (large) {
      const lines = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}: config.value = ${i % 7 === 0 ? 'true' : 'false'}`)
      const changed = [...lines]
      changed[9] = 'line 10: config.value = CHANGED'
      changed[2399] = 'line 2400: config.value = ALSO_CHANGED'
      large.oldText = lines.join('\n')
      large.newText = changed.join('\n')
      if (largeState) {
        largeState.textContent = `3000 lines generated, ${large.stats.hunks} changes; scroll to inspect the virtual window.`
      }
    }
  })
}
</script>
