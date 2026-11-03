# Scenarios

Copy-ready composition patterns: each recipe shows how multiple components form a real business shape.

## Spreadsheet-style Record Editing Form

**Scenario**: `oas-table` displays structured records with typed columns (badges / progress / dates / checkmarks); clicking a row opens an `oas-form` editing dialog, and validated submissions write back into the table — a complete "browse in table → edit in form" loop.

<DemoBlock title="Click a row to open the editing form (validation + write-back)">
  <oas-table id="recipe-records" row-key="id"
    columns='[{"key":"name","title":"Name","type":"link","width":"150px"},{"key":"cat","title":"Category","type":"select","width":"100px","options":[{"value":"fruit","label":"Fruit","color":"var(--oas-color-success)"},{"value":"digital","label":"Digital","color":"var(--oas-color-primary)"}]},{"key":"stock","title":"Stock","type":"number","width":"80px"},{"key":"listed","title":"Listed","type":"date","width":"110px"},{"key":"on","title":"On Sale","type":"checkbox","width":"60px"}]'
    data='[{"id":1,"name":"https://example.com/apple","cat":"fruit","stock":15230,"listed":"2026-08-12","on":true},{"id":2,"name":"https://example.com/headphone","cat":"digital","stock":860,"listed":"2026-09-01","on":false}]'>
  </oas-table>
  <oas-modal id="recipe-modal" title="Edit Record" style="width: 420px">
    <oas-form id="recipe-form" layout="vertical"></oas-form>
    <div slot="footer">
      <oas-button id="recipe-cancel">Cancel</oas-button>
      <oas-button id="recipe-save" type="primary">Save</oas-button>
    </div>
  </oas-modal>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Last saved: <span id="recipe-log">—</span>
  </p>
</DemoBlock>

**Pattern notes**:

1. **Typed columns own presentation** (declare `type` for badges / dates / checkmarks), the form owns editing — each side uses the most suitable component
2. **Build form fields from the clicked row's data**; validation rules are declared on the **`oas-form`** (shape `{ fieldName: [{ required, pattern, message, ... }] }`, matched by field `name`) — the save button calls `form.submit()`, and on success the form emits `oas-submit` (`detail.values` is the full form value collected by `name`)
3. **Write-back is "read all → patch one row → setAttribute the whole thing"** (the table's uncontrolled data channel, complementary to the inline-editing channel)
4. For quick single-cell edits use `editable` + `editComponent` (see the Table page); for multi-field row editing use this form recipe

## Kanban-driven Task Flow

`oas-kanban`'s `oas-change` event is the data-change protocol — map `from/to/index` to your backend state transitions:

```ts
const laneField = 'state' // swimlane field (replace with your actual field name)
document.querySelector('oas-kanban').addEventListener('oas-change', async (e) => {
  const { id, from, to, index, ids, swimlane } = e.detail
  await api.moveCards({
    cardIds: ids ?? [id], // ids is an array on multi-select batch moves
    toColumn: to,
    toIndex: index,
    ...(swimlane ? { [laneField]: swimlane.to } : {}),
  })
})
```

WIP limits are advisory (the `data-over-limit` marker); hard blocking is the host's choice, enforced after the event.

## Gallery View (Cards Grouped by Field)

**Scenario**: the "gallery" form of a spreadsheet — records are shown as rich card stacks grouped by a field value instead of rows. Compose it with `oas-card` + grouping; no dedicated component needed.

<DemoBlock title="Product gallery grouped by category">
  <div id="recipe-gallery" style="display: flex; gap: var(--oas-space-4); align-items: flex-start"></div>
</DemoBlock>

**Pattern notes**: the group key drives columns (`new Set(records.map(r => r.cat))`), and each card is a rich record view (`oas-card` + `oas-tag` status badge). The gallery is essentially "group + cards" — the badge/format semantics stay aligned with the table's `type` column (price/stock/status share one dataset).

## Calendar View (Records Laid Out by Date)

**Scenario**: the "calendar" form — lay records into calendar day cells by a date field. `oas-calendar`'s `oas-cell-render` event is the channel (fired for every day cell; the host appends content).

<DemoBlock title="Release schedule calendar (event dots + hover details)">
  <oas-calendar id="recipe-calendar" value="2026-08-09"></oas-calendar>
</DemoBlock>

**Pattern notes**: `oas-cell-render`'s `detail.element` is the day-cell container — append `.cell-dot` (the built-in dot style) and set `element.title` for hover details; index events by the `date` field — note that `detail.date` is a **Date object** (from parseISODate): format it to an ISO key (`YYYY-MM-DD`) before comparing with your event data (a direct `ev.date === detail.date` comparison always fails on type mismatch). With one shared dataset, table / gallery / calendar become three projections of the same records.

<script setup>
import { onMounted } from 'vue'
import { whenTagDefined } from '../../.vitepress/theme/when-defined'

onMounted(() => {
  // ① Record editing form: row click → build fields → form.submit() → write back on oas-submit
    const table = document.querySelector('#recipe-records')
    const modal = document.querySelector('#recipe-modal')
    const form = document.querySelector('#recipe-form')
    const log = document.querySelector('#recipe-log')
    if (table && modal && form) {
      let editingId = null
      // Validation rules are declared on the form (shape { fieldName: Rule[] }), matched by field name
      form.setAttribute(
        'rules',
        JSON.stringify({
          stock: [
            { required: true, message: 'Stock is required' },
            { pattern: '^\\d+$', message: 'Must be an integer' },
          ],
        }),
      )
      table.addEventListener('oas-row-click', (e) => {
        const row = e.detail.row
        if (!row) return
        editingId = row.id
        form.innerHTML = ''
        const fields = [
          { tag: 'oas-input', name: 'stock', label: 'Stock', value: String(row.stock) },
          { tag: 'oas-select', name: 'cat', label: 'Category', value: row.cat, options: [{ value: 'fruit', label: 'Fruit' }, { value: 'digital', label: 'Digital' }] },
          { tag: 'oas-date-picker', name: 'listed', label: 'Listed Date', value: row.listed },
          { tag: 'oas-switch', name: 'on', label: 'On Sale', checked: !!row.on },
        ]
        for (const f of fields) {
          const field = document.createElement(f.tag)
          field.setAttribute('name', f.name)
          if (f.label) field.setAttribute('label', f.label)
          // input / select / date-picker read the value attribute; switch only observes checked
          if (f.value !== undefined) field.setAttribute('value', f.value)
          if (f.checked) field.setAttribute('checked', '')
          if (f.options) field.setAttribute('options', JSON.stringify(f.options))
          form.appendChild(field)
        }
        modal.setAttribute('visible', '')
      })
      document.querySelector('#recipe-cancel')?.addEventListener('oas-click', () => modal.removeAttribute('visible'))
      document.querySelector('#recipe-save')?.addEventListener('oas-click', () => form.submit())
      // Validation passed → oas-submit (detail.values is the full form value collected by name)
      form.addEventListener('oas-submit', (e) => {
        const v = e.detail.values
        const data = JSON.parse(table.getAttribute('data')).map((r) =>
          r.id === editingId ? { ...r, stock: Number(v.stock), cat: v.cat, listed: v.listed, on: v.on === 'true' } : r,
        )
        table.setAttribute('data', JSON.stringify(data))
        log.textContent = `id=${editingId}: stock ${v.stock} / ${v.cat} / ${v.listed} / ${v.on === 'true' ? 'on sale' : 'off'}`
        modal.removeAttribute('visible')
      })
    }

    // ② Gallery: build a card wall grouped by field
    const gallery = document.querySelector('#recipe-gallery')
    if (gallery) {
      const records = [
        { id: 1, name: 'Red Fuji Apple', cat: 'Fruit', price: 12.8, stock: 15230, on: true },
        { id: 2, name: 'Shine Muscat', cat: 'Fruit', price: 39.9, stock: 7600, on: true },
        { id: 3, name: 'ANC Headphones', cat: 'Digital', price: 899, stock: 860, on: false },
        { id: 4, name: 'Mech Keyboard', cat: 'Digital', price: 459, stock: 2341, on: true },
        { id: 5, name: 'Olive Oil', cat: 'Food', price: 88, stock: 320, on: true },
      ]
      const groups = [...new Set(records.map((r) => r.cat))]
      for (const g of groups) {
        const col = document.createElement('div')
        col.style.cssText = 'display:flex;flex-direction:column;gap:var(--oas-space-2);min-width:180px'
        const head = document.createElement('strong')
        head.textContent = `${g} (${records.filter((r) => r.cat === g).length})`
        head.style.color = 'var(--oas-color-text-secondary)'
        col.appendChild(head)
        for (const r of records.filter((x) => x.cat === g)) {
          const card = document.createElement('oas-card')
          card.setAttribute('title', r.name)
          const body = document.createElement('div')
          body.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px'
          const price = document.createElement('span')
          price.textContent = `$${r.price}`
          const tag = document.createElement('oas-tag')
          tag.setAttribute('type', r.on ? 'success' : 'default')
          tag.textContent = r.on ? 'On Sale' : 'Off'
          body.append(price, tag)
          const meta = document.createElement('div')
          meta.style.cssText = 'color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)'
          meta.textContent = `Stock ${r.stock.toLocaleString()}`
          card.append(body, meta)
          col.appendChild(card)
        }
        gallery.appendChild(col)
      }
    }

    // ③ Calendar: lay event dots via oas-cell-render
    const cal = document.querySelector('#recipe-calendar')
    if (cal) {
      const events = [
        { date: '2026-08-12', name: 'Red Fuji Apple' },
        { date: '2026-08-12', name: 'Mech Keyboard' },
        { date: '2026-08-20', name: 'ANC Headphones' },
        { date: '2026-08-27', name: 'Olive Oil' },
      ]
      cal.addEventListener('oas-cell-render', (e) => {
        // detail.date is a Date object (from parseISODate) — format to an ISO key before comparing
        const d = e.detail.date
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const dayEvents = events.filter((ev) => ev.date === dayKey)
        if (dayEvents.length === 0) return
        // Built-in cell-dot + title hover details — merge same-day events into a single dot (avoids absolute-position overlap)
        const dot = document.createElement('span')
        dot.className = 'cell-dot'
        dot.title = dayEvents.map((ev) => ev.name).join(', ')
        e.detail.element.appendChild(dot)
        e.detail.element.title = dayEvents.map((ev) => ev.name).join(', ')
      })
    }

    // ④ Action Sheet: drawer (bottom + no-mask) + list action items; picking closes the sheet and updates the badge
    const sheet = document.querySelector('#recipe-sheet')
    const sheetOpen = document.querySelector('#recipe-sheet-open')
    const sheetAction = document.querySelector('#recipe-sheet-action')
    if (sheet && sheetOpen && sheetAction) {
      sheetOpen.addEventListener('oas-click', () => sheet.setAttribute('visible', ''))
      const sheetPick = (label) => {
        sheetAction.textContent = label
        sheet.removeAttribute('visible')
      }
      for (const item of sheet.querySelectorAll('oas-list-item[data-action]')) {
        item.addEventListener('oas-click', () => sheetPick(item.getAttribute('data-action')))
      }
      document.querySelector('#recipe-sheet-cancel')?.addEventListener('oas-click', () => sheet.removeAttribute('visible'))
    }

    // ⑤ Terminal panel: dark recipe (token overrides) + command echo (whenDefined guard against pre-upgrade expando shadowing)
    whenTagDefined('oas-log', () => {
      const termLog = document.querySelector('#recipe-term-log')
      const termInput = document.querySelector('#recipe-term-input')
      const termClear = document.querySelector('#recipe-term-clear')
      if (!termLog || !termInput || !termClear) return
      const termLines = ['OAS terminal ready. Type help to list commands.']
      const termLevels = ['']
      const termEcho = (text, level = '') => {
        termLines.push(text)
        termLevels.push(level)
      }
      const termFlush = () => {
        termLog.lines = [...termLines]
        // levels is attribute-only (no property setter); it must go through setAttribute
        termLog.setAttribute('levels', JSON.stringify(termLevels))
      }
      termFlush()
      termInput.addEventListener('oas-enter', (e) => {
        const raw = (e.detail?.value ?? '').trim()
        if (!raw) return
        if (raw === 'clear') {
          termLines.length = 0
          termLevels.length = 0
        } else {
          termEcho(`$ ${raw}`, 'info')
          if (raw === 'help') termEcho('Available commands: help / date / echo <text> / clear', 'success')
          else if (raw === 'date') termEcho(new Date().toLocaleString(), 'success')
          else if (raw.startsWith('echo')) termEcho(raw.slice(4).trim() || '(empty)', '')
          else termEcho(`command not found: ${raw} (type help to list commands)`, 'error')
        }
        termFlush()
        termInput.value = ''
      })
      termClear.addEventListener('oas-click', () => {
        termLines.length = 0
        termLevels.length = 0
        termFlush()
      })
    })

    // ⑥ JSON formatting comparison: two readings of one dataset (tree vs text); the data lives in a single object
    const jsonTree = document.querySelector('#recipe-json-tree')
    const jsonDiff = document.querySelector('#recipe-json-diff')
    const jsonMode = document.querySelector('#recipe-json-mode')
    if (jsonTree && jsonDiff && jsonMode) {
      const recipeJsonData = {
        order: 'SO-2026-1103',
        status: 'shipped',
        items: [
          { sku: 'OAS-CORE-01', name: 'Core runtime', qty: 2, price: 0 },
          { sku: 'OAS-ICN-24', name: 'Icon pack 24px', qty: 1, price: 12 },
        ],
        shipping: { carrier: 'SF', tracking: 'SF3100110024', eta: '2026-11-05' },
        tags: ['priority', 'b2b'],
      }
      const prettyJson = JSON.stringify(recipeJsonData, null, 2)
      const compactJson = JSON.stringify(recipeJsonData)
      const applyJsonMode = (mode) => {
        const pretty = mode !== 'compact'
        jsonTree.setAttribute('text', pretty ? prettyJson : compactJson)
        jsonDiff.setAttribute('old-text', pretty ? compactJson : prettyJson)
        jsonDiff.setAttribute('new-text', pretty ? prettyJson : compactJson)
        jsonDiff.setAttribute('old-label', pretty ? 'Minified source' : 'Formatted')
        jsonDiff.setAttribute('new-label', pretty ? 'Formatted' : 'Minified')
        jsonMode.setAttribute('value', pretty ? 'pretty' : 'compact')
      }
      applyJsonMode('pretty')
      jsonMode.addEventListener('oas-change', (e) => applyJsonMode(e.detail.value))
    }
})
</script>

## Multi-project Gantt tree + resource project priority

Do not add a second gantt instance: create one root summary task per project (`type:"summary"`) and put project tasks under it via `children`/`parent`. Project roots, task bars, dependencies and virtualization share one tree. On the resource side, use task `project` plus `levelResources({ projectOrder })` to carry project priority into leveling.

```ts
const tasks = [
  { id: `p-a`, name: `Project A`, type: `summary`, start: `2026-03-02`, end: `2026-03-13`, children: [
    { id: `a1`, name: `A design`, start: `2026-03-02`, end: `2026-03-06`, project: `A` },
  ]},
]
const leveled = levelResources(resources, resourceTasks, { projectOrder: [`A`, `B`] })
```

- Project roots only group/aggregate; dependencies live on leaf tasks and may cross projects.
- Resource leveling sorts by `projectOrder`; later projects yield first and gantt project-root dates are not rewritten.

## Action Sheet: Mobile Action Menu

**Scenario**: the mobile "more actions" menu — a set of actions sliding up from the bottom, destructive ones highlighted red, and a cancel button in its own group. Compose it from `oas-drawer` (`placement="bottom"` + `no-mask`) holding `oas-list` action items; no dedicated "action panel" component needed: slide-in animation, outside-click/Esc close and scroll lock are drawer built-ins (`no-mask` is the non-modal form and ships no focus trap), while focusability, Enter/Space activation and `oas-click` reporting are list built-ins.

<DemoBlock title="Open the Action Sheet (clicking an item gives feedback; outside click / Esc / cancel all close it)">
  <div style="width: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: var(--oas-space-3)">
    <oas-button id="recipe-sheet-open" type="primary">Open Action Sheet</oas-button>
    <p role="status" style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">
      Last action: <oas-tag id="recipe-sheet-action" type="default">None</oas-tag>
    </p>
  </div>
  <oas-drawer id="recipe-sheet" class="recipe-sheet" placement="bottom" no-mask no-header no-footer height="256" label="Action options">
    <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
      <oas-list split size="lg">
        <oas-list-item clickable data-action="Take photo"><span slot="title">Take photo</span></oas-list-item>
        <oas-list-item clickable data-action="Choose from library"><span slot="title">Choose from library</span></oas-list-item>
        <oas-list-item clickable data-action="Delete"><span slot="title" style="color: var(--oas-color-danger)">Delete</span></oas-list-item>
      </oas-list>
      <oas-list split size="lg">
        <oas-list-item clickable id="recipe-sheet-cancel"><span slot="title">Cancel</span></oas-list-item>
      </oas-list>
    </div>
  </oas-drawer>
</DemoBlock>

**Pattern notes**:

1. `no-mask` renders no overlay but keeps the "click outside to close" cancel semantics; Esc close is a drawer built-in (so is scroll lock — `no-mask` is a non-modal drawer, no focus trap) — distinguish close sources via `oas-close`'s `detail.source` (`esc` / `mask`)
2. **A destructive item is not a component prop** — list items have no danger channel; drop `var(--oas-color-danger)` on the `slot="title"` span and the semantic color is yours. That flexibility is exactly what composition buys
3. Cancel sits in its own group (visual separation + semantic separation); after a pick the host closes the drawer and updates the feedback badge (a `role="status"` line, perceivable to screen readers). A `no-header` + `no-mask` drawer has no visible title, so `label="Action options"` supplies the `aria-label` accessible name (otherwise screen readers only announce "dialog")
4. The rounded top corners come from a page-level `::part(panel)` override (see the styles at the bottom of this page) — the drawer panel ships without border radius; that "last mile" belongs to the recipe. A vertical drawer needs an explicit height (`height` accepts concrete lengths only; default 320px)

## Terminal Panel: Dark Log + Command Line

**Scenario**: a deploy / build console — dark background, monospace, a numbered output stream, status + clear on top, command line at the bottom. Assembled entirely from existing components: `oas-log` (line numbers, semantic levels, empty state) + `oas-tag` (status) + `oas-button` (clear) + `oas-input` (Enter emits `oas-enter`). The dark theme comes from **container-level token overrides**: override a set of color tokens on a recipe container, CSS custom properties pierce the shadow DOM, and every component in the subtree reskins itself — a terminal palette is a scenario-fixed color (it does not flip with the light/dark theme), which is exactly the division of labor between "recipe" and "component".

<DemoBlock title="Terminal simulation (help / date / echo text / clear)">
  <div class="recipe-term">
    <div class="recipe-term__bar">
      <oas-tag id="recipe-term-status" type="success">Running</oas-tag>
      <span class="recipe-term__title">deploy@oas-ui:~/app</span>
      <oas-button id="recipe-term-clear" size="small">Clear</oas-button>
    </div>
    <oas-log id="recipe-term-log" line-number style="height: 220px; width: 100%"></oas-log>
    <oas-input id="recipe-term-input" placeholder="Type a command and press Enter (help / date / echo text / clear)" style="width: 100%"></oas-input>
  </div>
</DemoBlock>

**Pattern notes**:

1. The token overrides live only on the `.recipe-term` container — nothing else on the page is affected; the override set covers exactly the variables the subtree components actually reference (bg / bg-hover / text / border, plus the semantic `-text` set referenced by log rows and the tag badge — semantic rows on a black background need dark-background safe shades, otherwise they inherit the site theme's light-theme dark shades and become unreadable)
2. Output lines and their semantics live in two parallel arrays (`lines` / `levels`, index-aligned): command echo at `info`, success output at `success`, unknown commands at `error` — the log maps levels to semantic tokens (colors adjust automatically in dark mode)
3. Clearing has two equivalent paths (toolbar button / the `clear` command), both via the data channel `lines = []` — once empty, the log's built-in empty state appears
4. Empty commands are ignored outright (no blank lines); clearing the input after submit goes through the controlled `value` channel (no event emitted)

## JSON Formatting Comparison: Tree vs Text

**Scenario**: when debugging API data, the same dataset supports two readings — the **tree reading** shows structure (expand, search, copy subtrees), the **text reading** shows bytes (what the source looks like, what formatting changed). Left `oas-json-viewer` (tree), right `oas-diff-viewer` (minified source ↔ formatted text). Keep the data as one object; both forms are projections of `JSON.stringify` — never maintain two copies of the text.

<DemoBlock title="Two readings of one dataset (switch between formatted / compact views)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-segmented
      id="recipe-json-mode"
      options='[{"label":"Formatted view","value":"pretty"},{"label":"Compact view","value":"compact"}]'
      value="pretty"
      aria-label="Switch JSON view"
    ></oas-segmented>
    <div class="recipe-json-panes">
      <div class="recipe-json-pane">
        <p>Tree reading (structure)</p>
        <oas-json-viewer id="recipe-json-tree" height="320" default-expand-depth="2" aria-label="Order data JSON tree"></oas-json-viewer>
      </div>
      <div class="recipe-json-pane">
        <p>Text reading (bytes)</p>
        <oas-diff-viewer id="recipe-json-diff" mode="split" wrap height="320" old-label="Minified source" new-label="Formatted"></oas-diff-viewer>
      </div>
    </div>
  </div>
</DemoBlock>

**Pattern notes**:

1. The segmented control switches between two views: **Formatted** shows the "compact → formatted" diff (what formatting added); **Compact** flips the direction (formatted → compact, what minification removed)
2. The tree panel's `text` switches with the view too (fed the minified or the formatted string) — the tree renders identically in both views, directly demonstrating that the structural reading is whitespace-insensitive
3. The diff panel uses `mode="split"` (degrades to unified on narrow containers, built-in responsive behavior) + `wrap` for readable long lines; `old-label` / `new-label` make the columns' semantics explicit
4. The tree panel's companion tools are ready when needed: search box (toolbar built-in), `expandAll()` / `collapseAll()`, `copyJson()` for subtree copy

<style>
/* —— Action Sheet: rounded top corners (the drawer panel ships without radius; the recipe adds it at page level) —— */
.recipe-sheet::part(panel) {
  border-radius: var(--oas-radius-lg) var(--oas-radius-lg) 0 0;
}

/* —— Terminal panel: dark recipe (container-level token overrides pierce the shadow; the palette is scenario-fixed and does not flip with the theme) —— */
.recipe-term {
  --oas-color-bg: #0b0f14;
  --oas-color-bg-hover: #141a22;
  --oas-color-text-primary: #d6dee8;
  --oas-color-text-secondary: #b0bdd0;
  --oas-color-text-disabled: #5d6b7d;
  --oas-color-border: #263140;
  --oas-color-border-strong: #3a465a;
  /* Semantic -text colors referenced by log rows and the tag badge: without overrides they
     inherit the light-theme dark shades from the site theme (e.g. success-text #11813a),
     which scores ~26 on a black background — override with dark-background safe shades
     (68~73 on black, verified offline with the same formula as packages/theme/oklab.ts). */
  --oas-color-success-text: #4ade80;
  --oas-color-warning-text: #fbbf24;
  --oas-color-danger-text: #fbb2b2;
  --oas-color-info-text: #23d3ef;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
  padding: var(--oas-space-3);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
.recipe-term__bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
}
.recipe-term__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}

/* —— JSON comparison: two-pane split (stacks on narrow screens) —— */
.recipe-json-panes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--oas-space-3);
  min-width: 0;
}
.recipe-json-pane {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.recipe-json-pane > p {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
@media (max-width: 720px) {
  .recipe-json-panes {
    grid-template-columns: 1fr;
  }
}
</style>
