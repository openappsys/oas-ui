# Recipes

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
})
</script>
