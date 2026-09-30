# Kanban

A board view of columns and cards: drag cards across columns or reorder them within a column, with column reordering, WIP limits, multi-select, and swimlanes on top; every settled move emits `oas-change` so the host can sync data. Fits staged workflows such as task boards, idea pools, and hiring pipelines.

## Basic usage

Both `columns` (column definitions) and `cards` are passed as JSON attributes (property arrays work the same). Cards are grouped by their `column` field and render `title` by default:

<DemoBlock title="Three-column board">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-basic"
      columns='[{"key":"todo","title":"To do"},{"key":"doing","title":"In progress"},{"key":"done","title":"Done"}]'
      cards='[{"id":"t1","column":"todo","title":"Map the billing flow"},{"id":"t2","column":"todo","title":"Dark-theme review for the board"},{"id":"t3","column":"todo","title":"Trash-can interaction review"},{"id":"t4","column":"doing","title":"Build the kanban component"},{"id":"t5","column":"doing","title":"Polish the drop indicator"},{"id":"t6","column":"done","title":"Freeze the data channel contract"}]'
    ></oas-kanban>
    <p id="kanban-basic-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Drag any card onto another column and drop it — the oas-change feedback shows up here.
    </p>
  </div>
</DemoBlock>

## Drag across columns and reorder

HTML5 DnD: drag a card onto a target column and the drop point shows a primary-color insertion indicator (top/bottom half of a hovered card selects before/after; empty columns highlight the tail). On drop the component writes the card data (new `column` plus new order) back to `cards` and emits `oas-change` with `detail` `{ id, from, to, index }` — `index` is the insertion position in the target column (measured after removing the dragged card itself; hosts can reproduce with `splice(index, 0, card)` on the target array). Dropping back at the original spot is a no-op (no event).

<DemoBlock title="Move and reorder (independently scrolling columns)">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-scroll"
      style="height: 320px"
      columns='[{"key":"backlog","title":"Backlog"},{"key":"sprint","title":"Sprint"},{"key":"verify","title":"Verifying"}]'
      cards='[{"id":"b1","column":"backlog","title":"Bulk form import"},{"id":"b2","column":"backlog","title":"Audit log export"},{"id":"b3","column":"backlog","title":"Mobile gesture tuning"},{"id":"b4","column":"backlog","title":"Theme editor presets"},{"id":"b5","column":"backlog","title":"Chart linked brushing"},{"id":"b6","column":"backlog","title":"Add Thai translations"},{"id":"s1","column":"sprint","title":"Finish the kanban component"},{"id":"s2","column":"sprint","title":"Pin qa-regression specs"},{"id":"s3","column":"sprint","title":"Recheck perf budgets"},{"id":"v1","column":"verify","title":"Verify the touch move menu"}]'
    ></oas-kanban>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Setting <code>height</code> on the component makes each column body scroll independently; drag a card up/down inside a column to reorder.
    </p>
  </div>
</DemoBlock>

## Column reordering

Use the drag handle on the left of each column header to move whole columns (or focus the handle and press ←/→); the drop point shows a primary-color insertion line between columns. On settle the component writes the new order back to `columns` and emits `oas-column-reorder` with `detail` `{ from, to, keys }` — `from` is the moved column's original position, `to` its new one, `keys` the full reordered list; card data is untouched. Dropping back at the original spot is a no-op. Touch devices (`pointer: coarse`) get move-left/move-right buttons inside the column header (boundary items disabled):

<DemoBlock title="Column reordering">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-reorder"
      columns='[{"key":"todo","title":"To do"},{"key":"doing","title":"In progress"},{"key":"done","title":"Done"}]'
      cards='[{"id":"o1","column":"todo","title":"Draft the release checklist"},{"id":"o2","column":"doing","title":"Regression testing"},{"id":"o3","column":"done","title":"Release notes"}]'
    ></oas-kanban>
    <p id="kanban-reorder-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Drag the handle on a column header (or focus it and press ←/→) — the oas-column-reorder feedback shows up here.
    </p>
  </div>
</DemoBlock>

## WIP limits

Add `limit` (a number) to a column definition: when the column's card count exceeds it, the header count turns warning-colored and the column gets a `data-over-limit` marker. The limit is advisory, not blocking — dropping into an over-limit column still lands; whether to warn is up to the host. Unset, 0, or negative means unlimited:

<DemoBlock title="WIP limit (In progress has limit=2, currently over)">
  <div style="width: 100%">
    <oas-kanban
      columns='[{"key":"todo","title":"To do"},{"key":"doing","title":"In progress","limit":2},{"key":"done","title":"Done"}]'
      cards='[{"id":"w1","column":"doing","title":"Integrate the data channel"},{"id":"w2","column":"doing","title":"Dark-theme walkthrough"},{"id":"w3","column":"doing","title":"Tidy the regression list"},{"id":"w4","column":"todo","title":"Draft the release checklist"}]'
    ></oas-kanban>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      The "In progress" column is 3/2 — over its limit: warning-colored count plus <code>data-over-limit</code>, yet cards can still be dropped in.
    </p>
  </div>
</DemoBlock>

## Multi-select

Ctrl/Cmd+click toggles cards into the selection; Shift+click selects a range within a column (from the anchor card to the clicked one); selected cards get a primary-color outline. Drag any selected card and all selected cards move together to the drop column, emitting a single `oas-change` whose `detail` gains an `ids` array (`id` stays the first). Click blank space or press Esc to clear the selection; a plain click falls back to single-select. Touch devices have no multi-select (the move menu acts on its own card only):

<DemoBlock title="Multi-select batch move">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-multi"
      columns='[{"key":"todo","title":"To do"},{"key":"doing","title":"In progress"},{"key":"done","title":"Done"}]'
      cards='[{"id":"m1","column":"todo","title":"Map the billing flow"},{"id":"m2","column":"todo","title":"Dark-theme review for the board"},{"id":"m3","column":"todo","title":"Trash-can interaction review"},{"id":"m4","column":"doing","title":"Build the kanban component"}]'
    ></oas-kanban>
    <p id="kanban-multi-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Ctrl/Cmd+click a couple of cards in "To do", then drag any of them to a target column — the batch-move feedback shows up here.
    </p>
  </div>
</DemoBlock>

## Swimlanes

`swimlane-by="fieldKey"` splits the board into horizontal bands by that field's value: each band has a header row (field value + count + fold arrow; click to fold/unfold, all expanded by default, fold state survives data changes) and its cards are grouped by column inside. Dropping a card into another band rewrites that field's value (`oas-change` detail gains `swimlane: { from, to }`); cards missing the value fall into the "(empty)" band and empty cells show a placeholder:

<DemoBlock title="Swimlanes (grouped by priority)">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-swim"
      swimlane-by="prio"
      columns='[{"key":"todo","title":"To do"},{"key":"doing","title":"In progress"},{"key":"done","title":"Done"}]'
      cards='[{"id":"p1","column":"todo","title":"Login page redesign","prio":"High"},{"id":"p2","column":"doing","title":"Polish card dragging","prio":"High"},{"id":"p3","column":"todo","title":"Proofread the docs","prio":"Low"},{"id":"p4","column":"done","title":"Freeze the data channel","prio":"Low"},{"id":"p5","column":"todo","title":"Unscheduled task"}]'
    ></oas-kanban>
    <p id="kanban-swim-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Drag a card into another band (e.g. pull "Unscheduled task" into High) — the swimlane feedback shows up here; click a band header to fold it.
    </p>
  </div>
</DemoBlock>

## Empty columns

Empty columns show a "Drag cards here" placeholder (translated via locale); the `empty-column-text` attribute overrides it:

<DemoBlock title="Empty column with custom placeholder">
  <div style="width: 100%">
    <oas-kanban
      columns='[{"key":"open","title":"Not started"},{"key":"ship","title":"Shipped"}]'
      cards='[{"id":"e1","column":"open","title":"Waiting for scheduling"}]'
      empty-column-text="No cards yet — drag one over"
    ></oas-kanban>
  </div>
</DemoBlock>

## Custom card rendering (renderCard)

Only `title` renders by default; for richer cards (tags, owners, progress) use the `renderCard` property function: `(card) => Node | string`. A returned Node is mounted directly; a returned string renders as plain text (injection-safe). While the function is present the data is not reflected back to the `cards` attribute (functions cannot be serialized — the host owns the data); dragging still emits `oas-change` and positions/groups keep updating.

<DemoBlock title="renderCard rich cards">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-render"
      columns='[{"key":"design","title":"Design"},{"key":"dev","title":"Development"}]'
      cards='[{"id":"r1","column":"design","title":"Redesign mockups","owner":"Lin Xiaoyu","state":"In review"},{"id":"r2","column":"design","title":"Icon pack tidy-up","owner":"Zhou Ke","state":"In progress"},{"id":"r3","column":"dev","title":"Board data channel","owner":"Chen Yining","state":"Integrating"}]'
    ></oas-kanban>
  </div>
</DemoBlock>

## Touch and keyboard

- Touch devices (`pointer: coarse`) cannot drive HTML5 drag: every card gets a move button in its top-right corner that opens a small menu — move up / move down / move to a column (move up is disabled on the first card, move down on the last); column headers get move-left/move-right buttons for reordering (boundary items disabled);
- Keyboard accessible: cards are focusable (`tabindex=0`), non-empty column bodies are `role="list"` (empty columns carry no list semantics), cards are `role="listitem"`, with readable names from column titles and card titles; column reordering also works by focusing the column handle and pressing ←/→;
- The move menu acts on its own card only (multi-select does not change menu behavior).

## API

### oas-kanban

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `cards` | Card data (JSON array [{ id, column, title, ...arbitrary fields }] where column is the owning column key). After a drop the component writes the new grouping/order back to this attribute (uncontrolled write-back + attribute reflection); skipped while a renderCard function is present (the host owns the data) | `KanbanCard[] \| string` | `[]` |
| `columns` | Column definitions (JSON array [{ key, title, limit? }]; the same-named property array channel works identically — the setter reflects back to the attribute). limit is a WIP limit: when the column's card count exceeds it, the header count turns warning-colored and the column gets a data-over-limit marker (advisory only — drops still land); unset/0/negative = unlimited | `KanbanColumn[] \| string` | `[]` |
| `empty-column-text` | Override for the empty-column / empty swimlane-cell placeholder text (defaults to the i18n kanban.emptyColumn key, translated with the locale) | `string` | — |
| `swimlane-by` | Swimlane field key: splits the board into horizontal bands by that field's value (band header = fold arrow + field value + count; all expanded by default, fold state survives data changes); missing/empty values fall into the "(empty)" band; dropping a card into another band rewrites the swimlane field value; omit for the plain column layout | `string` | — |

#### Property (JS property only, not reflected as attribute)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `renderCard` | Custom card renderer (card) => Node \| string (property channel; functions cannot be serialized and stay out of attributes/SSR). A returned Node mounts directly; a returned string renders as plain text (injection-safe). While present, card data is not reflected back to the cards attribute (the host owns the data) while drag and the touch move menu still emit oas-change. Set to null to restore the default title rendering | `KanbanCardRenderer \| null` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted after a drag cross-column move, an in-column reorder, or a touch move-menu action settles (dropping back at the original spot emits nothing). detail { id, from, to, index } — from/to are column keys, index is the insertion position in the target column (measured after removing the moved cards; hosts can reproduce with splice(index, 0, card) on the target array); multi-select drags move all selected cards and emit one event whose detail gains ids (all selected ids in data order, id is the first); cross-swimlane drops also gain swimlane { from, to } (the swimlane field value change) |
| `oas-column-reorder` | Emitted after a column reorder settles (column-head handle drag / keyboard ←/→ / touch move buttons; no-op at the original position emits nothing). detail { from, to, keys } — from is the moved column's original position, to its new position after the reorder, keys the full reordered list of column keys; the component also writes the new order back to the columns attribute (card data is untouched) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-kanban-column-min-height` | `60px` |
| `--oas-kanban-column-min-width` | `220px` |

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-kanban').then(() => {
    // Basic usage: oas-change feedback
    const basic = document.querySelector('#kanban-basic')
    if (basic) {
      const titles = {}
      for (const c of basic.cards) titles[c.id] = c.title
      const log = document.querySelector('#kanban-basic-log')
      basic.addEventListener('oas-change', (e) => {
        const { id, from, to, index } = e.detail
        if (log) log.textContent = `oas-change emitted: "${titles[id] ?? id}" moved from "${from}" to "${to}" at position ${index + 1}.`
      })
    }

    // Custom rendering: renderCard property channel (functions cannot be serialized — attach in onMounted)
    const render = document.querySelector('#kanban-render')
    if (render) {
      render.renderCard = (card) => {
        const box = document.createElement('div')
        box.style.cssText = 'display:flex;flex-direction:column;gap:var(--oas-space-1);padding-inline-end:var(--oas-space-4)'
        const title = document.createElement('span')
        title.textContent = card.title
        title.style.fontWeight = '500'
        const meta = document.createElement('span')
        meta.style.cssText = 'display:flex;gap:var(--oas-space-2);align-items:center;color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-xs)'
        const owner = document.createElement('span')
        owner.textContent = card.owner
        const state = document.createElement('oas-tag')
        state.textContent = card.state
        state.setAttribute('size', 'small')
        meta.appendChild(owner)
        meta.appendChild(state)
        box.appendChild(title)
        box.appendChild(meta)
        return box
      }
    }

    // Column reordering: oas-column-reorder feedback
    const reorder = document.querySelector('#kanban-reorder')
    if (reorder) {
      const log = document.querySelector('#kanban-reorder-log')
      reorder.addEventListener('oas-column-reorder', (e) => {
        const { from, to, keys } = e.detail
        if (log) log.textContent = `oas-column-reorder emitted: column ${from + 1} moved to position ${to + 1}; new order [${keys.join(', ')}].`
      })
    }

    // Multi-select batch move: ids feedback on oas-change
    const multi = document.querySelector('#kanban-multi')
    if (multi) {
      const titles = {}
      for (const c of multi.cards) titles[c.id] = c.title
      const log = document.querySelector('#kanban-multi-log')
      multi.addEventListener('oas-change', (e) => {
        const { id, ids, from, to } = e.detail
        const moved = (ids ?? [id]).map((cardId) => titles[cardId] ?? cardId)
        if (log) log.textContent = `Moved ${moved.length} card(s) (${moved.join(', ')}) from "${from}" to "${to}".`
      })
    }

    // Swimlanes: cross-band drop feedback
    const swim = document.querySelector('#kanban-swim')
    if (swim) {
      const titles = {}
      for (const c of swim.cards) titles[c.id] = c.title
      const log = document.querySelector('#kanban-swim-log')
      swim.addEventListener('oas-change', (e) => {
        const { id, swimlane } = e.detail
        if (!swimlane) return
        if (log) log.textContent = `"${titles[id] ?? id}" moved from the "${swimlane.from || '(empty)'}" band to "${swimlane.to || '(empty)'}".`
      })
    }
  })
})
</script>
