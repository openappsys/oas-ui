# Transfer

Dual left/right panels with shuttle buttons in the middle, supporting search filtering, keyboard operation, target-side drag sorting and the select-to-move mode.

## Basic Usage

<DemoBlock title="Basic">
  <oas-transfer id="transfer-basic"></oas-transfer>
</DemoBlock>

The panel header shows a "selected/visible" count (e.g. `1/3`), updating live with selection and filtering.

## Preset Values & Titles

<DemoBlock title="Preset value + titles">
  <oas-transfer id="transfer-preset" value='["b"]' titles='["Available fruits", "Selected fruits"]'></oas-transfer>
</DemoBlock>

## Searchable

<DemoBlock title="searchable">
  <oas-transfer id="transfer-search" searchable></oas-transfer>
</DemoBlock>

## Case-sensitive Search

<DemoBlock title="searchable + case-sensitive">
  <oas-transfer id="transfer-casesensitive" searchable case-sensitive></oas-transfer>
</DemoBlock>

## One-way Mode

Move left to right only; the right panel is read-only. The left panel shows all data, already transferred items are disabled and shown as selected.

<DemoBlock title="one-way">
  <oas-transfer id="transfer-oneway" one-way></oas-transfer>
</DemoBlock>

## Target Order & Drag Sorting

`target-sort` controls the right panel ordering strategy:

- `original` (default): keep the data source order (consistent with `data`)
- `push`: append newly transferred items to the end
- `unshift`: insert newly transferred items at the head, one by one

`target-draggable` enables drag sorting on the right panel (the "selected list" scenario where order carries business meaning). Keyboard alternative: click a right row first, then `Alt + ↑/↓` to move it (drag interactions must have an accessible alternative). With `original` the order is decided by the data source, so dragging does not apply — pair `push` / `unshift` when manual sorting is needed.

<DemoBlock title="target-sort=push + target-draggable">
  <oas-transfer id="transfer-sort" target-sort="push" target-draggable value='["a"]'></oas-transfer>
</DemoBlock>

<DemoBlock title="target-sort=unshift (new items on top)">
  <oas-transfer id="transfer-unshift" target-sort="unshift"></oas-transfer>
</DemoBlock>

## Select to Move (simple)

With `simple`, clicking a row shuttles it immediately (no central button; touch friendly); the central buttons are hidden. Off by default, keeping "select then press the button" as the primary form.

<DemoBlock title="simple">
  <oas-transfer id="transfer-simple" simple></oas-transfer>
</DemoBlock>

## Row Customization (item slot)

`template[slot="item"]` is cloned into every row (static and virtual panels alike); `[data-item-label]` binds the item text automatically:

<DemoBlock title="item slot (role icon + rich rows)">
  <oas-transfer id="transfer-item">
    <template slot="item">
      <oas-icon name="user" size="16"></oas-icon>
      <span data-item-label></span>
    </template>
  </oas-transfer>
</DemoBlock>

## Empty Customization (empty slot)

`template[slot="empty"]` customizes the empty state (shared by the true empty and the no-match states, both panels):

<DemoBlock title="empty slot">
  <oas-transfer id="transfer-empty">
    <template slot="empty">
      <div style="padding: var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">No data yet, select from the left</div>
    </template>
  </oas-transfer>
</DemoBlock>

## Virtual Scroll

Windowed rendering for tens of thousands of items with smooth scrolling; selection, select-all and keyboard navigation keep working.

<DemoBlock title="virtual (10000 items, item-height 32)">
  <oas-transfer id="transfer-virtual" virtual searchable item-height="32"></oas-transfer>
</DemoBlock>

## Disabled

`disabled` disables the whole group (rows / select-all / search / shuttle buttons / keyboard) and mirrors `data-disabled` on the host for styling; `disabled-skip` exempts it from global disabled injection.

<DemoBlock title="disabled (view-only echo)">
  <oas-transfer id="transfer-disabled" disabled value='["a"]'></oas-transfer>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-transfer id="transfer-event"></oas-transfer>
  <span id="transfer-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

<DemoBlock title="Select & search events">
  <oas-transfer id="transfer-events" searchable></oas-transfer>
  <span id="transfer-events-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

- `oas-change`: value change after shuttling, `detail: { value }`
- `oas-select-change`: panel selection change (row click / select-all / keyboard selection), `detail: { side: 'left' | 'right', selected: string[] }`
- `oas-search`: search input, `detail: { side, query }`

## Keyboard

| Key | Action |
| --- | --- |
| `↑` / `↓` | Move the selection (single-select navigation) |
| `Enter` | Shuttle the currently selected item |
| `Space` | Toggle the current item's selection |
| `Ctrl/⌘ + A` | Select all / clear all selectable visible items of the panel |
| `Alt + ↑/↓` | Sort the right panel (keyboard alternative to `target-draggable`; select a row first) |

## Tree Data Transfer (oas-tree composition)

Tree/table transfers are not part of the component data protocol; compose them with `oas-tree` (checking) + `transfer` (value linkage):

<DemoBlock title="Department tree member picking (oas-tree + transfer linkage)">
  <div style="display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap">
    <oas-tree id="transfer-tree" checkable style="min-width: 200px"></oas-tree>
    <oas-transfer id="transfer-tree-panel" style="flex: 1; min-width: 360px"></oas-transfer>
  </div>
</DemoBlock>

Table-style transfer (multi-column info) works the same way: render the left data with `oas-table` and sync the checked key set to the transfer `value`.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const basic = document.getElementById('transfer-basic')
  if (basic) basic.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
    { key: 'd', label: 'Grape', disabled: true },
  ]
  const preset = document.getElementById('transfer-preset')
  if (preset) preset.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
  ]
  const search = document.getElementById('transfer-search')
  if (search) search.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
    { key: 'd', label: 'Strawberry' },
    { key: 'e', label: 'Watermelon' },
  ]
  const cs = document.getElementById('transfer-casesensitive')
  if (cs) cs.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'apricot' },
    { key: 'c', label: 'Banana' },
  ]
  const oneway = document.getElementById('transfer-oneway')
  if (oneway) oneway.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
    { key: 'd', label: 'Strawberry' },
  ]
  const virtual = document.getElementById('transfer-virtual')
  if (virtual) virtual.data = Array.from({ length: 10000 }, (_, i) => ({ key: 'k' + i, label: 'Item ' + i }))
  const el = document.getElementById('transfer-event')
  if (el) {
    el.data = [
      { key: 'a', label: 'Apple' },
      { key: 'b', label: 'Banana' },
      { key: 'c', label: 'Orange' },
    ]
    const out = document.getElementById('transfer-output')
    el.addEventListener('oas-change', (e) => {
      out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
    })
  }

  // target-sort + drag sorting
  const sort = document.getElementById('transfer-sort')
  if (sort) {
    sort.data = [
      { key: 'a', label: 'Apple' },
      { key: 'b', label: 'Banana' },
      { key: 'c', label: 'Orange' },
      { key: 'd', label: 'Grape' },
    ]
    const out = document.getElementById('transfer-output')
    sort.addEventListener('oas-change', (e) => {
      out.textContent = `value after drag sort: [${e.detail.value.join(', ')}]`
    })
  }
  const unshift = document.getElementById('transfer-unshift')
  if (unshift) unshift.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
  ]

  // simple
  const simple = document.getElementById('transfer-simple')
  if (simple) simple.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
  ]

  // item slot
  const item = document.getElementById('transfer-item')
  if (item) item.data = [
    { key: 'a', label: 'Admin' },
    { key: 'b', label: 'Developer' },
    { key: 'c', label: 'Tester' },
    { key: 'd', label: 'Guest' },
  ]

  // empty slot (empty data shows the slot content)
  const emptyEl = document.getElementById('transfer-empty')
  if (emptyEl) emptyEl.data = []

  // disabled
  const dis = document.getElementById('transfer-disabled')
  if (dis) dis.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
  ]

  // select & search events
  const evts = document.getElementById('transfer-events')
  if (evts) {
    evts.data = [
      { key: 'a', label: 'Apple' },
      { key: 'b', label: 'Banana' },
      { key: 'c', label: 'Orange' },
      { key: 'd', label: 'Strawberry' },
    ]
    const out = document.getElementById('transfer-events-output')
    evts.addEventListener('oas-select-change', (e) => {
      out.textContent = `oas-select-change: ${e.detail.side} [${e.detail.selected.join(', ')}]`
    })
    evts.addEventListener('oas-search', (e) => {
      out.textContent = `oas-search: ${e.detail.side} "${e.detail.query}"`
    })
  }

  // Tree composition: tree checks → transfer value linkage (leaf items)
  const tree = document.getElementById('transfer-tree')
  const panel = document.getElementById('transfer-tree-panel')
  if (tree && panel) {
    const leaves = [
      { key: 'fe-1', label: 'Alice' },
      { key: 'fe-2', label: 'Bob' },
      { key: 'be-1', label: 'Carol' },
      { key: 'be-2', label: 'Dave' },
      { key: 'pm-1', label: 'Eve' },
    ]
    tree.data = [
      { key: 'fe', label: 'Frontend', children: [leaves[0], leaves[1]] },
      { key: 'be', label: 'Backend', children: [leaves[2], leaves[3]] },
      { key: 'pm', label: 'Product', children: [leaves[4]] },
    ]
    panel.data = leaves
    const leafKeys = new Set(leaves.map((i) => i.key))
    tree.addEventListener('oas-check', () => {
      const checked = (tree.getAttribute('checked') || '').split(',').filter(Boolean)
      panel.setAttribute('value', JSON.stringify(checked.filter((k) => leafKeys.has(k))))
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `case-sensitive` | Search filtering is case-sensitive (case-insensitive by default) | `boolean` | — |
| `data` | Data (JSON attribute channel; property assignment reflects to attribute, [{ key, label, disabled }]) | `TransferItem[] \| string` | `[]` |
| `disabled` | Disabled (row clicks/buttons/search all inert; host mirrors data-disabled) | `boolean` | — |
| `item-height` | Fixed row height for virtual scrolling (px), default 36 | `string` | `36` |
| `one-way` | One-way mode: move left to right only, right panel is read-only; left panel shows all data, already transferred items are disabled and shown as selected | `boolean` | — |
| `searchable` | Search filtering within panels (filtered independently per panel) | `boolean` | — |
| `simple` | Move on selection (skip the shuttle buttons, off by default) | `boolean` | — |
| `source-title` | Left panel title | — | — |
| `target-draggable` | Target-side drag sorting (pair with target-sort=push/unshift; original ordering is data-driven and not draggable) | `boolean` | — |
| `target-sort` | Target-side ordering: `original` (default, data-source order) / `push` (append) / `unshift` (prepend). Note the value-array ordering semantics: with original, a pre-set out-of-order value is normalized to data order | `string` | `original` |
| `target-title` | Right panel title | — | — |
| `titles` | Panel titles (JSON array) or `source-title`/`target-title` | `string` | — |
| `value` | Selected key array (JSON attribute) | `string` | `[]` |
| `virtual` | Windowed rendering for large data (virtual scroll, default row height 36px) | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Value change after shuttling, `detail: { value }` |
| `oas-search` | Panel search input, `detail: { side, query }` |
| `oas-select-change` | Selection set changed (row click/select-all/keyboard), `detail: { side, selected }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="empty"]` | Custom content shared by empty and no-match states |
| `template[slot="item"]` | Custom row (`[data-item-label]` binding, identical for static and virtual rows) |

Keyboard: after focusing a panel list, `↑`/`↓` moves the selection, `Enter` shuttles.
