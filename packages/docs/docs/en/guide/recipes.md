# Recipes

Copy-ready composition patterns: each recipe shows how multiple components form a real business shape.

## Spreadsheet-style Record Editing Form

**Scenario**: `oas-table` displays structured records with typed columns (badges / progress / dates / checkmarks); clicking a row opens an `oas-form` editing dialog, and validated submissions write back into the table — a complete "browse in table → edit in form" loop.

<DemoBlock title="Click a row to open the editing form (validation + write-back)">
  <oas-table id="recipe-records" row-key="id"
    columns='[{"key":"name","title":"Name","type":"link","width":"150px"},{"key":"cat","title":"Category","type":"select","width":"110px","options":[{"value":"fruit","label":"Fruit","color":"var(--oas-color-success)"},{"value":"digital","label":"Digital","color":"var(--oas-color-primary)"}]},{"key":"stock","title":"Stock","type":"number","width":"80px"},{"key":"listed","title":"Listed","type":"date","width":"110px"},{"key":"on","title":"On Sale","type":"checkbox","width":"80px"}]'
    data='[{"id":1,"name":"https://example.com/apple","cat":"fruit","stock":15230,"listed":"2026-08-12","on":true},{"id":2,"name":"https://example.com/headphone","cat":"digital","stock":860,"listed":"2026-09-01","on":false}]'>
  </oas-table>
  <oas-dialog id="recipe-dialog" title="Edit Record" style="width: 420px">
    <oas-form id="recipe-form" layout="vertical"></oas-form>
    <div slot="footer">
      <oas-button id="recipe-cancel">Cancel</oas-button>
      <oas-button id="recipe-save" type="primary">Save</oas-button>
    </div>
  </oas-dialog>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Last saved: <span id="recipe-log">—</span>
  </p>
  <script setup>
    import { onMounted } from 'vue'
    onMounted(() => {
      const table = document.querySelector('#recipe-records')
      const dialog = document.querySelector('#recipe-dialog')
      const form = document.querySelector('#recipe-form')
      const log = document.querySelector('#recipe-log')
      let editingId = null
      table.addEventListener('oas-row-click', (e) => {
        const row = JSON.parse(table.getAttribute('data')).find((r) => String(r.id) === e.detail.key)
        if (!row) return
        editingId = row.id
        form.innerHTML = ''
        const fields = [
          { tag: 'oas-input', name: 'stock', label: 'Stock', value: String(row.stock), rules: [{ required: true, message: 'Stock is required' }, { pattern: '^\\d+$', message: 'Must be an integer' }] },
          { tag: 'oas-select', name: 'cat', label: 'Category', value: row.cat, options: [{ value: 'fruit', label: 'Fruit' }, { value: 'digital', label: 'Digital' }] },
          { tag: 'oas-date-picker', name: 'listed', label: 'Listed Date', value: row.listed },
          { tag: 'oas-switch', name: 'on', label: 'On Sale', value: row.on ? 'true' : 'false', 'true-value': 'true', 'false-value': 'false' },
        ]
        for (const f of fields) {
          const field = document.createElement(f.tag)
          field.setAttribute('name', f.name)
          field.setAttribute('label', f.label)
          if (f.value !== undefined) field.setAttribute('value', f.value)
          if (f.options) field.setAttribute('options', JSON.stringify(f.options))
          if (f.rules) field.setAttribute('rules', JSON.stringify(f.rules))
          if (f['true-value']) field.setAttribute('true-value', f['true-value'])
          if (f['false-value']) field.setAttribute('false-value', f['false-value'])
          form.appendChild(field)
        }
        dialog.setAttribute('open', '')
      })
      const close = () => dialog.removeAttribute('open')
      document.querySelector('#recipe-cancel').addEventListener('oas-click', close)
      document.querySelector('#recipe-save').addEventListener('oas-click', async () => {
        const result = await form.validate()
        if (!result.valid) return
        const v = result.values
        const data = JSON.parse(table.getAttribute('data')).map((r) =>
          r.id === editingId ? { ...r, stock: Number(v.stock), cat: v.cat, listed: v.listed, on: v.on === 'true' } : r,
        )
        table.setAttribute('data', JSON.stringify(data))
        log.textContent = `id=${editingId}: stock ${v.stock} / ${v.cat} / ${v.listed} / ${v.on === 'true' ? 'on sale' : 'off'}`
        close()
      })
    })
  </script>
</DemoBlock>

**Pattern notes**:

1. **Typed columns own presentation** (declare `type` for badges/dates/checkmarks), the form owns editing — each side uses the most suitable component
2. **Build form fields from the clicked row's data** (`oas-form`'s `validate()` collects and validates in one call)
3. **Write-back is "read all → patch one row → setAttribute the whole thing"** (the table's uncontrolled data channel, complementary to the `oas-edit` event channel of inline editing)
4. For quick single-cell edits use `editable` + `editComponent` (see the Table page); for multi-field row editing use this form recipe

## Kanban-driven Task Flow

`oas-kanban`'s `oas-change` event is the data-change protocol — map `from/to/index` to your backend state transitions:

```ts
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
