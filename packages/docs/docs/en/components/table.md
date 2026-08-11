# Table

Displays structured data in a row-and-column grid with sorting, row selection, multi-select, and a loading state. It can be wired together with a pagination component.

`columns` / `data` support a declarative attribute channel: pass a JSON string directly to render the header and data rows (invalid JSON falls back to the empty state), while the property channel (assigning arrays/objects, property takes precedence) remains available and can be serialized into an SSR snapshot.

## Basic Usage (with Sorting)

<DemoBlock title="Sortable columns">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Name","sortable":true},{"key":"age","title":"Age","sortable":true},{"key":"city","title":"City"},{"key":"email","title":"Email"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","email":"alice@example.com","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","email":"bob@example.com","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","email":"carol@example.com","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","email":"david@example.com","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","email":"emma@example.com","position":"QA Engineer"},{"name":"Frank","age":27,"city":"Chengdu","email":"frank@example.com","position":"Operations Specialist"},{"name":"Grace","age":41,"city":"Wuhan","email":"grace@example.com","position":"Technical Director"},{"name":"Henry","age":24,"city":"Nanjing","email":"henry@example.com","position":"Intern"},{"name":"Ivy","age":38,"city":"Xian","email":"ivy@example.com","position":"Architect"},{"name":"Jack","age":29,"city":"Suzhou","email":"jack@example.com","position":"Data Analyst"},{"name":"Kate","age":33,"city":"Tianjin","email":"kate@example.com","position":"Project Manager"},{"name":"Liam","age":26,"city":"Chongqing","email":"liam@example.com","position":"DevOps Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

Click a sortable column header to cycle through ascending / descending / no sort.

## Column Alignment and Width

<DemoBlock title="Alignment and width">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Name","width":"140px"},{"key":"age","title":"Age","align":"center"},{"key":"city","title":"City","align":"right"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## Controlled Sorting and Row Selection

<DemoBlock title="Initial sort and selection">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age","sortable":true},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"},{"name":"Frank","age":27,"city":"Chengdu","position":"Operations Specialist"},{"name":"Grace","age":41,"city":"Wuhan","position":"Technical Director"},{"name":"Henry","age":24,"city":"Nanjing","position":"Intern"},{"name":"Ivy","age":38,"city":"Xian","position":"Architect"},{"name":"Jack","age":29,"city":"Suzhou","position":"Data Analyst"},{"name":"Kate","age":33,"city":"Tianjin","position":"Project Manager"},{"name":"Liam","age":26,"city":"Chongqing","position":"DevOps Engineer"}]' sort-key="age" sort-order="desc" selected="Grace" row-key="name"></oas-table>
  </div>
</DemoBlock>

`sort-key` / `sort-order` control the sort; `selected` highlights the selected row (clicking a row toggles the selection).

## Multi-Select

<DemoBlock title="Row multi-select (checkable)">
  <div style="width: 100%">
    <oas-table checkable columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"},{"name":"Frank","age":27,"city":"Chengdu","position":"Operations Specialist"},{"name":"Grace","age":41,"city":"Wuhan","position":"Technical Director"},{"name":"Henry","age":24,"city":"Nanjing","position":"Intern"},{"name":"Ivy","age":38,"city":"Xian","position":"Architect"},{"name":"Jack","age":29,"city":"Suzhou","position":"Data Analyst"},{"name":"Kate","age":33,"city":"Tianjin","position":"Project Manager"},{"name":"Liam","age":26,"city":"Chongqing","position":"DevOps Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

The header checkbox selects / clears all rows at once; row checkboxes toggle individually. Selection changes emit `oas-check`.

## Integration with Pagination

<DemoBlock title="Table + pagination">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-paged" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"Name"},{"key":"age","title":"Age","sortable":true},{"key":"city","title":"City"},{"key":"email","title":"Email"},{"key":"position","title":"Position"}]' data="[]"></oas-table>
    <oas-pagination id="table-pager" total="12" page-size="5" current="1"></oas-pagination>
  </oas-space>
</DemoBlock>

Table data is sliced into 5 rows per page; on page change the `data` attribute is updated via the `oas-change` event and the table re-renders.

## Fixed Columns

<DemoBlock title="Left fixed column">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Name","fixed":"left","width":"120px"},{"key":"age","title":"Age","width":"80px"},{"key":"city","title":"City","width":"100px"},{"key":"email","title":"Email","width":"220px"},{"key":"position","title":"Position","width":"120px"}]' data='[{"name":"Alice","age":30,"city":"Beijing","email":"alice@example.com","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","email":"bob@example.com","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","email":"carol@example.com","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","email":"david@example.com","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","email":"emma@example.com","position":"QA Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Left/right fixed columns + sticky header">
  <div style="width: 100%; max-width: 680px">
    <oas-table height="240" row-height="40" columns='[{"key":"id","title":"ID","fixed":"left","width":"60px"},{"key":"name","title":"Name","fixed":"left","width":"120px"},{"key":"age","title":"Age","width":"80px"},{"key":"city","title":"City","width":"100px"},{"key":"email","title":"Email","width":"220px"},{"key":"position","title":"Position","fixed":"right","width":"120px"}]' data='[{"id":1,"name":"Alice","age":30,"city":"Beijing","email":"alice@example.com","position":"Frontend Engineer"},{"id":2,"name":"Bob","age":25,"city":"Shanghai","email":"bob@example.com","position":"Product Manager"},{"id":3,"name":"Carol","age":35,"city":"Shenzhen","email":"carol@example.com","position":"Backend Engineer"},{"id":4,"name":"David","age":28,"city":"Hangzhou","email":"david@example.com","position":"UI Designer"},{"id":5,"name":"Emma","age":32,"city":"Guangzhou","email":"emma@example.com","position":"QA Engineer"},{"id":6,"name":"Frank","age":27,"city":"Chengdu","email":"frank@example.com","position":"Operations Specialist"},{"id":7,"name":"Grace","age":41,"city":"Wuhan","email":"grace@example.com","position":"Technical Director"},{"id":8,"name":"Henry","age":24,"city":"Nanjing","email":"henry@example.com","position":"Intern"}]' row-key="id"></oas-table>
  </div>
</DemoBlock>

In the column config, `fixed: 'left' | 'right'` makes that column's header and cells `position: sticky` (the `left` / `right` offset is accumulated automatically from column widths); the remaining columns scroll horizontally, and the header always stays sticky.

## Large Data Sets (Virtual Scroll)

<DemoBlock title="Virtual scroll with 10k rows">
  <div style="width: 100%">
    <oas-table id="table-virtual" height="360" row-height="40" columns='[{"key":"id","title":"ID","fixed":"left","width":"70px"},{"key":"name","title":"Name","fixed":"left","width":"120px"},{"key":"age","title":"Age","sortable":true,"width":"80px"},{"key":"city","title":"City","width":"100px"},{"key":"email","title":"Email","width":"220px"},{"key":"position","title":"Position","fixed":"right","width":"120px"}]'></oas-table>
  </div>
</DemoBlock>

Setting `height` enables virtual scrolling (with a fixed `row-height`): only rows within the visible window are rendered. It works together with fixed columns, sorting, and multi-select; scrolling emits `oas-scroll`.

## Stripes and Borders

<DemoBlock title="Striped rows (stripe)">
  <div style="width: 100%">
    <oas-table stripe columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Full border (bordered)">
  <div style="width: 100%">
    <oas-table bordered columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

Set `stripe` to alternate the background of odd/even rows, or `bordered` to draw a full grid border around the cells.

## Summary Row

<DemoBlock title="Summary row (summary)">
  <div style="width: 100%">
    <oas-table summary='[{"key":"age","type":"sum","label":"Total"},{"key":"score","type":"avg"}]' columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"score","title":"Score"},{"key":"city","title":"City"}]' data='[{"name":"Alice","age":30,"score":92,"city":"Beijing"},{"name":"Bob","age":25,"score":88,"city":"Shanghai"},{"name":"Carol","age":35,"score":76,"city":"Shenzhen"},{"name":"David","age":28,"score":95,"city":"Hangzhou"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

The `summary` attribute is a JSON array `[{ key, type: 'sum' | 'avg' | 'count', label? }]` rendered as a summary row at the table footer: `label` is shown in the first non-aggregated column, and each aggregated value in its corresponding column. You can also write `summary: 'sum' | 'avg' | 'count'` directly on a column config.

## Expandable Rows

<DemoBlock title="Expandable rows (expand field)">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer","expand":"<div>More: Alice oversees frontend architecture and team management, joined in 2021.</div>"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager","expand":"<div>More: Bob leads product planning and requirements review, joined in 2022.</div>"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

When a row's data has a non-empty `expand` field, an expand column appears at the end of the table; clicking the button expands the whole row to show custom content. The expanded state is stored in the `expanded` attribute (a comma-separated set of keys), and toggling emits `oas-expand`.

<DemoBlock title="Controlled expansion (expanded attribute)">
  <div style="width: 100%">
    <oas-table expanded="Alice" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer","expand":"<div>More: Alice oversees frontend architecture and team management, joined in 2021.</div>"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

`expanded` is a controlled attribute (a comma-separated set of keys): pre-expanded rows open on the first render, and the host can add or remove keys at any time to drive the expansion state (shared by tree parent rows and expandable rows).

## Tree Data

<DemoBlock title="Tree data (children)">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Department / Member"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' data='[{"name":"R&D Department","age":"","city":"","children":[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"}]},{"name":"Product Department","age":"","city":"","children":[{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":28,"city":"Hangzhou"}]}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

Rows with a `children` array are rendered as a tree: parent rows show an expand button in the first column, and child rows are indented by depth. The expanded state is stored in the same `expanded` attribute, and toggling emits `oas-expand`.

## Loading State

<DemoBlock title="Loading state">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-loading" row-key="name" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"}]'></oas-table>
    <oas-button type="primary" onclick="simulateTableLoading()">Simulate 2s loading</oas-button>
  </oas-space>
</DemoBlock>

With the `loading` attribute, the header stays visible and the data area shows placeholder rows; removing the attribute restores the data.

## Empty State

<DemoBlock title="Empty data">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Custom empty text">
  <div style="width: 100%">
    <oas-table empty-text="No matching data" columns='[{"key":"name","title":"Name"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Sort and click events">
  <div style="width: 100%">
    <oas-table id="table-event" columns='[{"key":"name","title":"Name","sortable":true},{"key":"age","title":"Age","sortable":true},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Sort: <span id="table-sort">none</span> · Row: <span id="table-row">—</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

// Shared demo dataset (12 rows)
const MOCK = [
  ['Alice', 30, 'Beijing', 'alice@example.com', 'Frontend Engineer'],
  ['Bob', 25, 'Shanghai', 'bob@example.com', 'Product Manager'],
  ['Carol', 35, 'Shenzhen', 'carol@example.com', 'Backend Engineer'],
  ['David', 28, 'Hangzhou', 'david@example.com', 'UI Designer'],
  ['Emma', 32, 'Guangzhou', 'emma@example.com', 'QA Engineer'],
  ['Frank', 27, 'Chengdu', 'frank@example.com', 'Operations Specialist'],
  ['Grace', 41, 'Wuhan', 'grace@example.com', 'Technical Director'],
  ['Henry', 24, 'Nanjing', 'henry@example.com', 'Intern'],
  ['Ivy', 38, 'Xian', 'ivy@example.com', 'Architect'],
  ['Jack', 29, 'Suzhou', 'jack@example.com', 'Data Analyst'],
  ['Kate', 33, 'Tianjin', 'kate@example.com', 'Project Manager'],
  ['Liam', 26, 'Chongqing', 'liam@example.com', 'DevOps Engineer'],
]
const TABLE_ROWS = MOCK.map(([name, age, city, email, position], i) => ({
  id: i + 1,
  name,
  age,
  city,
  email,
  position,
}))

onMounted(() => {
  // Sort and click event demo
  const table = document.querySelector('#table-event')
  table?.addEventListener('oas-sort-change', (e) => {
    const { key, order } = e.detail
    document.querySelector('#table-sort').textContent = order ? `${key} ${order}` : 'none'
  })
  table?.addEventListener('oas-row-click', (e) => {
    document.querySelector('#table-row').textContent = e.detail.row.name ?? e.detail.key
  })

  // Virtual scroll demo: 10k rows
  const virtual = document.querySelector('#table-virtual')
  if (virtual) {
    const cities = ['Beijing', 'Shanghai', 'Shenzhen', 'Hangzhou', 'Guangzhou']
    const positions = ['Frontend Engineer', 'Backend Engineer', 'Product Manager', 'QA Engineer', 'Operations Specialist']
    const rows = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      age: 20 + (i % 30),
      city: cities[i % cities.length],
      email: `user${i + 1}@example.com`,
      position: positions[i % positions.length],
    }))
    virtual.setAttribute('data', JSON.stringify(rows))
  }

  // Pagination demo: slice 5 rows per page into data
  const pager = document.querySelector('#table-pager')
  const paged = document.querySelector('#table-paged')
  const pageSize = 5
  const renderPage = (page) => {
    const start = (page - 1) * pageSize
    paged?.setAttribute('data', JSON.stringify(TABLE_ROWS.slice(start, start + pageSize)))
  }
  pager?.addEventListener('oas-change', (e) => renderPage(e.detail.page))
  renderPage(1)

  // Loading state demo: simulate 2s loading
  window.simulateTableLoading = () => {
    const table = document.querySelector('#table-loading')
    table?.setAttribute('loading', '')
    setTimeout(() => table?.removeAttribute('loading'), 2000)
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `bordered` | Full border: draws a grid outline around cells (the outer frame is built in) | — | — |
| `checkable` | Enables checkbox multi-select | `boolean` | — |
| `columns` | Column config `[{ key, title, sortable?, width?, align?, fixed?, render?, summary? }]`, JSON string (declarative attribute channel; property assignment takes precedence) | `TableColumn[] \| string` | `[]` |
| `data` | Row data `[{ [key]: value, children?, expand? }]`, JSON string (declarative attribute channel; property assignment takes precedence) | `Array<Record<string, unknown>> \| string` | `[]` |
| `empty-text` | Empty state text | — | — |
| `expanded` | Set of expanded row keys (comma-separated; shared by tree parent rows and expandable rows) | `string` | — |
| `height` | Virtual scroll viewport height (px); when set, only visible-window rows plus head/tail placeholders are rendered | `string` | `320` |
| `loading` | Loading state: shows placeholder rows in the data area (header retained) | `boolean` | — |
| `row-height` | Fixed row height for virtual scrolling (px) | `string` | `40` |
| `row-key` | Unique key field of a row | `string` | `key` |
| `selected` | Set of selected row keys (comma-separated) | `string` | — |
| `sort-key` | Controlled sort; `sort-order` is `asc` / `desc` / empty | `string` | — |
| `sort-order` | Controlled sort; `sort-order` is `asc` / `desc` / empty | `SortOrder` | — |
| `stripe` | Zebra striping: alternating light background for odd/even rows | `boolean` | — |
| `summary` | Summary config `[{ key, type: 'sum'\|'avg'\|'count', label? }]`, JSON string | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-check` | Checkbox selection change, `detail: { keys: string[] }` |
| `oas-expand` | Row expand/collapse (tree child rows or expandable content rows), `detail: { key, expanded }` |
| `oas-row-click` | Row click (also toggles selection when not checkable), `detail: { row, key }` |
| `oas-scroll` | Virtual scroll event (rAF throttled), `detail: { scrollTop, start, end }` |
| `oas-sort-change` | Sort change, `detail: { key, order: 'asc' \| 'desc' \| '' }` |

> Note: `columns.render` is a function type and can only be assigned via the property from JS — it cannot be expressed as a JSON string. For `fixed` columns it is recommended to declare `width` explicitly (sticky offsets fall back to 100px when omitted). Summary can also be written directly on a column as `summary: 'sum' | 'avg' | 'count'`; `children` (tree child rows) and `expand` (expandable row content) are both row data fields.

The loading placeholder row is exposed as `::part(loading-row)`, the summary row as `::part(summary-row)`, and the expandable content row as `::part(expand-row)`; each can be styled independently.
