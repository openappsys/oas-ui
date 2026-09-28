# Kanban

A board view of columns and cards: drag cards across columns or reorder them within a column; every settled move emits `oas-change` so the host can sync data. Fits staged workflows such as task boards, idea pools, and hiring pipelines.

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

- Touch devices (`pointer: coarse`) cannot drive HTML5 drag: every card gets a move button in its top-right corner that opens a small menu — move up / move down / move to a column (move up is disabled on the first card, move down on the last);
- Keyboard accessible: cards are focusable (`tabindex=0`), column bodies are `role="list"`, cards are `role="listitem"`, with readable names from column titles and card titles.

## API

### oas-kanban

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `cards` | Card data (JSON array [{ id, column, title, ...arbitrary fields }] where column is the owning column key). After a drop the component writes the new grouping/order back to this attribute (uncontrolled write-back + attribute reflection); skipped while a renderCard function is present (the host owns the data) | `KanbanCard[] \| string` | `[]` |
| `columns` | Column definitions (JSON array [{ key, title }]; the same-named property array channel works identically — the setter reflects back to the attribute) | `KanbanColumn[] \| string` | `[]` |
| `empty-column-text` | Override for the empty-column placeholder text (defaults to the i18n kanban.emptyColumn key, translated with the locale) | `string` | — |

#### Property (JS property only, not reflected as attribute)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `renderCard` | Custom card renderer (card) => Node \| string (property channel; functions cannot be serialized and stay out of attributes/SSR). A returned Node mounts directly; a returned string renders as plain text (injection-safe). While present, card data is not reflected back to the cards attribute (the host owns the data) while drag and the touch move menu still emit oas-change. Set to null to restore the default title rendering | `KanbanCardRenderer \| null` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted after a drag cross-column move, an in-column reorder, or a touch move-menu action settles (dropping back at the original spot emits nothing). detail { id, from, to, index } — from/to are column keys, index is the insertion position in the target column (measured after removing the dragged card itself; hosts can reproduce with splice(index, 0, card) on the target array) |

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
  })
})
</script>
