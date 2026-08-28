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

## Declarative child-element channel

<DemoBlock title="Declare columns with <oas-table-column>">
  <div style="width: 100%">
    <oas-table row-key="name" data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"}]'>
      <oas-table-column key="name" title="Name" sortable></oas-table-column>
      <oas-table-column key="age" title="Age" sortable></oas-table-column>
      <oas-table-column key="city" title="City"></oas-table-column>
    </oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Nested child columns for a grouped header">
  <div style="width: 100%">
    <oas-table row-key="id" data='[{"id":1,"name":"Alice","age":28,"city":"Beijing","score":92},{"id":2,"name":"Bob","age":32,"city":"Shanghai","score":85}]'>
      <oas-table-column key="base" title="Basic">
        <oas-table-column key="name" title="Name" sortable></oas-table-column>
        <oas-table-column key="age" title="Age" sortable></oas-table-column>
      </oas-table-column>
      <oas-table-column key="city" title="City"></oas-table-column>
      <oas-table-column key="score" title="Score" sortable></oas-table-column>
    </oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Cell template cellTemplate (interpolate row.field)">
  <div style="width: 100%">
    <oas-table row-key="id" data='[{"id":1,"name":"Alice","price":128,"city":"Beijing"},{"id":2,"name":"Bob","price":256,"city":"Shanghai"}]'>
      <oas-table-column key="name" title="Name">
        <template v-pre><span style="background:#eef2ff;color:#4f46e5;border-radius:4px;padding:1px 6px;font-size:12px">{{row.name}}</span></template>
      </oas-table-column>
      <oas-table-column key="price" title="Price">
        <template v-pre><b style="color: var(--oas-color-danger)">¥ {{row.price}}</b></template>
      </oas-table-column>
      <oas-table-column key="city" title="City"></oas-table-column>
    </oas-table>
  </div>
</DemoBlock>

Besides the `columns` attribute / property array, columns also support a declarative child-element channel: `<oas-table-column key title sortable width align fixed ...>`, with attributes aligned to the `TableColumn` fields (booleans are true/false, kebab-case like `serial-number` / `filters`); `title` falls back to the default slot text; a nested `<oas-table-column>` expresses a grouped header (children). Child changes are picked up by a MutationObserver to auto re-render. An explicit `columns` attribute / property takes precedence over the child-element channel. A `<template>` inside a column (used with a `row.field` placeholder for interpolation; see the example above; add `v-pre` on the docs site so Vue doesn't parse it) renders a cell template, cloned and hydrated per cell; the `render` function still takes precedence over the template.

> **⚠️ Function fields (“a detail”)**: function types — `render`, `filterMatch`, editor callbacks (functions in `editOptions`) — **cannot be serialized via a child-element attribute or JSON**. Neither the child-element channel nor the `columns` attribute can express them. For columns containing such function fields, assign `columns` as a **property** (build the array in JS), or use the declarative `cellTemplate` (`<template>` + a `row.field` placeholder, a function-free alternative; see the example above) for custom cells.

## Density Sizes

<DemoBlock title="size: small / medium (default) / large">
  <div style="width: 100%; display: flex; flex-direction: column; gap: 16px">
    <oas-table size="small" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"}]' row-key="name"></oas-table>
    <oas-table columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"}]' row-key="name"></oas-table>
    <oas-table size="large" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

Each size only changes the default cell padding and font size, all via CSS variables: override with `--oas-table-cell-padding-block` / `--oas-table-cell-padding-inline` / `--oas-table-font-size` (takes precedence over the size preset). Invalid values fall back to `medium` with a warning. `row-height` is orthogonal to size: in fixed-row-height scenarios such as virtual scrolling, the row height is controlled by `row-height` and is not affected by the size preset.

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

## Inline Editing

<DemoBlock title="Double-click cells to edit (with operation column)">
  <div style="width: 100%">
    <oas-table id="table-edit" editable row-key="name" columns='[{"key":"name","title":"Name","editable":true},{"key":"age","title":"Age","editable":true,"width":"100px"},{"key":"city","title":"City","editable":true},{"key":"position","title":"Position","editable":true,"editor":"select","editOptions":[{"label":"Frontend Engineer","value":"frontend"},{"label":"Backend Engineer","value":"backend"},{"label":"Product Manager","value":"pm"},{"label":"QA Engineer","value":"qa"}]},{"key":"op","title":"Actions","actions":true}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"frontend"},{"name":"Bob","age":25,"city":"Shanghai","position":"backend"},{"name":"Carol","age":35,"city":"Shenzhen","position":"pm"},{"name":"David","age":28,"city":"Hangzhou","position":"qa"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Last edit: <span id="table-edit-feedback">—</span>
    </p>
  </div>
</DemoBlock>

Set `editable` to enable inline editing; mark editable columns with `editable: true` on the column config (`editor: 'input'` for text / `editor: 'select'` for a dropdown with `editOptions`), and `actions: true` renders an operation column (Edit / Save / Cancel buttons). Double-click a cell, or focus it and press Enter / F2, to start editing: Enter or blur submits, Esc cancels; submit emits `oas-edit` (`detail: { rowIndex, key, column, value }`), cancel emits `oas-edit-cancel`. Submitting an empty value restores the original (non-destructive by default).

## Controlled Editing

<DemoBlock title="Controlled editing (edit-controlled)">
  <div style="width: 100%">
    <oas-table id="table-edit-controlled" editable edit-controlled row-key="name" columns='[{"key":"name","title":"Name","editable":true},{"key":"age","title":"Age","editable":true,"width":"100px"},{"key":"city","title":"City","editable":true}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      This table is in controlled mode: the component does not write back <code>data</code> on submit; the host listens to <code>oas-edit</code> and updates it.
    </p>
  </div>
</DemoBlock>

`edit-controlled` is the controlled editing mode: on submit the component does not write back `data`, it only emits `oas-edit`; the host listens and updates `data` itself (see the script below).

## Sticky Rows

<DemoBlock title="Sticky header + first N rows">
  <div style="width: 100%">
    <oas-table height="280" row-height="40" sticky-rows="3" row-key="id" columns='[{"key":"id","title":"ID","fixed":"left","width":"60px"},{"key":"name","title":"Name","fixed":"left","width":"120px"},{"key":"age","title":"Age","width":"80px"},{"key":"city","title":"City","width":"100px"},{"key":"email","title":"Email","width":"220px"},{"key":"position","title":"Position","fixed":"right","width":"120px"}]' data='[{"id":1,"name":"Alice","age":30,"city":"Beijing","email":"alice@example.com","position":"Frontend Engineer"},{"id":2,"name":"Bob","age":25,"city":"Shanghai","email":"bob@example.com","position":"Product Manager"},{"id":3,"name":"Carol","age":35,"city":"Shenzhen","email":"carol@example.com","position":"Backend Engineer"},{"id":4,"name":"David","age":28,"city":"Hangzhou","email":"david@example.com","position":"UI Designer"},{"id":5,"name":"Emma","age":32,"city":"Guangzhou","email":"emma@example.com","position":"QA Engineer"},{"id":6,"name":"Frank","age":27,"city":"Chengdu","email":"frank@example.com","position":"Operations Specialist"},{"id":7,"name":"Grace","age":41,"city":"Wuhan","email":"grace@example.com","position":"Technical Director"},{"id":8,"name":"Henry","age":24,"city":"Nanjing","email":"henry@example.com","position":"Intern"},{"id":9,"name":"Ivy","age":38,"city":"Xian","email":"ivy@example.com","position":"Architect"},{"id":10,"name":"Jack","age":29,"city":"Suzhou","email":"jack@example.com","position":"Data Analyst"},{"id":11,"name":"Kate","age":33,"city":"Tianjin","email":"kate@example.com","position":"Project Manager"},{"id":12,"name":"Liam","age":26,"city":"Chongqing","email":"liam@example.com","position":"DevOps Engineer"}]'></oas-table>
  </div>
</DemoBlock>

`sticky-rows="N"` sticks the first N rows below the header (works with the scroll container: set `height` so the table body scrolls); it coexists with fixed columns (`fixed: 'left' | 'right'`).

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

## Column settings: show / hide / drag / resize

<DemoBlock title="Column drag reorder + column width resize">
  <div style="width: 100%">
    <oas-table id="table-col-setting" checkable row-key="name" columns='[{"key":"name","title":"Name","width":"120px"},{"key":"age","title":"Age","width":"90px"},{"key":"city","title":"City","width":"100px"},{"key":"position","title":"Position","width":"120px"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Drag a header to reorder columns; drag the right edge of a header to resize. · Column order: <span id="table-col-order">original</span> · Width: <span id="table-col-width">—</span>
    </p>
  </div>
</DemoBlock>

<DemoBlock title="Column visibility (controlled column-keys / hidden)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: 8px">
    <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: var(--oas-font-size-sm)">
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="name" checked> Name</label>
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="age" checked> Age</label>
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="city" checked> City</label>
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="position" checked> Position</label>
    </div>
    <oas-table id="table-col-hidden" row-key="name" column-keys='["name","age","city","position"]' columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"}]'></oas-table>
  </div>
</DemoBlock>

Column drag reorder / resize fire `oas-column-order` / `oas-column-resize` (for host persistence). Two ways to hide a column: controlled `column-keys` (JSON array, also controls order) or `hidden: true` in the column config.

## Multi-column sorting

<DemoBlock title="Shift-click to multi-sort">
  <div style="width: 100%">
    <oas-table id="table-multi-sort" row-key="name" columns='[{"key":"age","title":"Age","sortable":true},{"key":"name","title":"Name","sortable":true},{"key":"city","title":"City","sortable":true}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":25,"city":"Hangzhou"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Hold Shift and click several sortable columns to accumulate the sort (header shows priority 1, 2…); a plain click resets to single column.
    </p>
  </div>
</DemoBlock>

## Serial number & ellipsis

<DemoBlock title="Serial number + ellipsis">
  <div style="width: 100%">
    <oas-table row-key="name" columns='[{"key":"index","title":"#","serialNumber":true,"width":"60px"},{"key":"name","title":"Name","width":"120px"},{"key":"desc","title":"Description","ellipsis":true},{"key":"city","title":"City","width":"100px"}]' data='[{"name":"Alice","city":"Beijing","desc":"Three years of front-end experience, owning core component design and performance optimization."},{"name":"Bob","city":"Shanghai","desc":"Focuses on product planning and requirements review."},{"name":"Carol","city":"Shenzhen","desc":"Backend veteran focused on high concurrency and microservices."}]'></oas-table>
  </div>
</DemoBlock>

A column with `serialNumber: true` renders the row number (starting from 1, not reading a data field); a column with `ellipsis: true` truncates overflowing content to a single line with an ellipsis (hover `title` shows the full text).

## Grouped header

<DemoBlock title="Grouped header (children)">
  <div style="width: 100%">
    <oas-table row-key="id" columns='[{"key":"base","title":"Basic","children":[{"key":"name","title":"Name","sortable":true},{"key":"age","title":"Age","sortable":true}]},{"key":"addr","title":"Address","children":[{"key":"city","title":"City"},{"key":"street","title":"Street"}]},{"key":"score","title":"Score","sortable":true}]' data='[{"id":1,"name":"Alice","age":28,"city":"Beijing","street":"Changan Avenue","score":92},{"id":2,"name":"Bob","age":32,"city":"Shanghai","street":"Nanjing Road","score":85},{"id":3,"name":"Carol","age":40,"city":"Guangzhou","street":"Tianhe Road","score":78}]'></oas-table>
  </div>
</DemoBlock>

`children` in a column config defines a group header: the group column spans its children (colspan) and leaf columns align with data rows via rowspan; data / sorting / visibility / drag all operate on leaf columns.

## Built-in pagination

<DemoBlock title="Table built-in pagination (pagination)">
  <div style="width: 100%">
    <oas-table id="table-builtin-pager" pagination page-size="5" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"Name"},{"key":"age","title":"Age","sortable":true},{"key":"city","title":"City"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Setting `pagination` enables built-in pagination: top-level rows are globally sorted then sliced; page / page-size changes fire `oas-page-change`. Current page: <span id="table-pager-page">1</span>
    </p>
  </div>
</DemoBlock>

## Column filter

<DemoBlock title="Column filter (filterable)">
  <div style="width: 100%">
    <oas-table id="table-filter" row-key="name" columns='[{"key":"name","title":"Name","filterable":true},{"key":"city","title":"City","filterable":true,"filters":[{"label":"Beijing","value":"Beijing"},{"label":"Shanghai","value":"Shanghai"},{"label":"Shenzhen","value":"Shenzhen"}]},{"key":"age","title":"Age"}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":28,"city":"Shanghai"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Click the filter icon in a header to open the option popup; selecting a value filters rows and fires `oas-filter-change`. Current filter: <span id="table-filter-values">none</span>
    </p>
  </div>
</DemoBlock>

## Merged cells

<DemoBlock title="Merged cells (merge)">
  <div style="width: 100%">
    <oas-table row-key="name" columns='[{"key":"dept","title":"Dept","merge":true,"align":"center"},{"key":"team","title":"Team","merge":true,"align":"center"},{"key":"name","title":"Name"},{"key":"age","title":"Age"}]' data='[{"dept":"Engineering","team":"Frontend","name":"Alice","age":28},{"dept":"Engineering","team":"Frontend","name":"Bob","age":32},{"dept":"Engineering","team":"Backend","name":"Carol","age":40},{"dept":"Marketing","team":"Marketing","name":"David","age":26},{"dept":"Marketing","team":"Marketing","name":"Eve","age":30}]'></oas-table>
  </div>
</DemoBlock>

`merge: true` merges consecutive rows with the same displayed value in that column into a single rowspan cell (ignored in virtual-scroll mode).

## Remote data & sort loading

<DemoBlock title="Sort triggers a re-request (simulated remote)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-remote" sort-key="age" sort-order="asc" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"Name","sortable":true},{"key":"age","title":"Age","sortable":true},{"key":"city","title":"City"}]'></oas-table>
    <oas-button type="primary" onclick="simulateRemoteReload()">Clear sort & re-request</oas-button>
  </oas-space>
</DemoBlock>

Listen to `oas-sort-change`, then set `loading` and re-request remote paginated/sorted data; this demo shows the "sort → loading → re-render" handoff with a simulated delay. Server-side sorting is done by the host after it receives the event (the table only dispatches the event and shows the loading state).

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

  // Inline editing demo: feedback
  const editTable = document.querySelector('#table-edit')
  editTable?.addEventListener('oas-edit', (e) => {
    const { key, column, value } = e.detail
    const el = document.querySelector('#table-edit-feedback')
    if (el) el.textContent = `${key} ${column} → ${value}`
  })
  editTable?.addEventListener('oas-edit-cancel', () => {
    const el = document.querySelector('#table-edit-feedback')
    if (el) el.textContent = 'cancelled'
  })

  // Controlled editing demo: the host writes data back on oas-edit
  const ctlTable = document.querySelector('#table-edit-controlled')
  ctlTable?.addEventListener('oas-edit', (e) => {
    const { key, column, value } = e.detail
    const rows = JSON.parse(ctlTable.getAttribute('data'))
    const row = rows.find((r) => r.name === key)
    if (row) row[column] = value
    ctlTable.setAttribute('data', JSON.stringify(rows))
  })

  // Column settings: reorder / resize feedback
  document.querySelector('#table-col-setting')?.addEventListener('oas-column-order', (e) => {
    document.querySelector('#table-col-order').textContent = e.detail.keys.join(' → ')
  })
  document.querySelector('#table-col-setting')?.addEventListener('oas-column-resize', (e) => {
    document.querySelector('#table-col-width').textContent = `${e.detail.key} = ${e.detail.width}px`
  })

  // Column visibility: checkbox → write back column-keys
  const hiddenTable = document.querySelector('#table-col-hidden')
  const colToggles = [...document.querySelectorAll('.col-toggle')]
  const renderColUi = () => {
    const checked = colToggles.filter((el) => el.checked).map((el) => el.dataset.key)
    hiddenTable?.setAttribute('column-keys', JSON.stringify(checked))
  }
  colToggles.forEach((el) => el.addEventListener('change', renderColUi))

  // Built-in pagination: current page feedback (12 rows, page-size 5)
  const builtInPager = document.querySelector('#table-builtin-pager')
  builtInPager?.setAttribute('data', JSON.stringify(TABLE_ROWS))
  builtInPager?.addEventListener('oas-page-change', (e) => {
    document.querySelector('#table-pager-page').textContent = e.detail.page
  })

  // Column filter: current filter feedback
  document.querySelector('#table-filter')?.addEventListener('oas-filter-change', (e) => {
    const vals = Object.values(e.detail.filters)
    document.querySelector('#table-filter-values').textContent = vals.length ? vals.join(', ') : 'none'
  })

  // Remote data + sort loading demo: sort triggers loading, simulated delay then clear sort + refill data
  const remote = document.querySelector('#table-remote')
  const renderRemote = () => {
    remote?.setAttribute('data', JSON.stringify(TABLE_ROWS))
  }
  const simulateRemoteReload = () => {
    remote?.removeAttribute('sort-key')
    remote?.removeAttribute('sort-order')
    remote?.setAttribute('loading', '')
    setTimeout(() => {
      remote?.removeAttribute('loading')
      renderRemote()
    }, 800)
  }
  window.simulateRemoteReload = simulateRemoteReload
  remote?.addEventListener('oas-sort-change', () => {
    remote?.setAttribute('loading', '')
    setTimeout(() => {
      remote?.removeAttribute('loading')
      renderRemote()
    }, 800)
  })
  renderRemote()
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `bordered` | Full border: draws a grid outline around cells (the outer frame is built in) | — | — |
| `checkable` | Enables checkbox multi-select | `boolean` | — |
| `column-keys` | — | `string[] \| string` | `[]` |
| `columns` | Column config `[{ key, title, sortable?, width?, align?, fixed?, render?, summary?, editable?, editor?, editOptions?, actions? }]`, JSON string (declarative attribute channel; property assignment takes precedence) | `TableColumn[] \| string` | `[]` |
| `current` | — | `string` | `1` |
| `data` | Row data `[{ [key]: value, children?, expand? }]`, JSON string (declarative attribute channel; property assignment takes precedence) | `Array<Record<string, unknown>> \| string` | `[]` |
| `edit-controlled` | Controlled editing: does not write back `data` on submit, only fires `oas-edit`; the host listens and updates `data` itself | `boolean` | — |
| `editable` | Inline editing switch (requires `editable: true` on columns; same for the `actions: true` operation column) | `boolean` | — |
| `empty-text` | Empty state text | — | — |
| `expanded` | Set of expanded row keys (comma-separated; shared by tree parent rows and expandable rows) | `string` | — |
| `filter-values` | — | `string` | — |
| `height` | Virtual scroll viewport height (px); when set, only visible-window rows plus head/tail placeholders are rendered | `string` | `320` |
| `loading` | Loading state: shows placeholder rows in the data area (header retained) | `boolean` | — |
| `multi-sort` | — | `string` | — |
| `page-size` | — | `string` | `10` |
| `pagination` | — | `boolean` | — |
| `row-height` | Fixed row height for virtual scrolling (px) | `string` | `40` |
| `row-key` | Unique key field of a row | `string` | `key` |
| `selected` | Set of selected row keys (comma-separated) | `string` | — |
| `size` | Density preset: `small` / `medium` (default) / `large` — only changes default cell padding and font size (all via CSS variables; override with `--oas-table-cell-padding-block` / `--oas-table-cell-padding-inline` / `--oas-table-font-size`, which take precedence); invalid values fall back to `medium` with a warning; orthogonal to `row-height` | `string` | `medium` |
| `sort-key` | Controlled sort; `sort-order` is `asc` / `desc` / empty | `string` | — |
| `sort-order` | Controlled sort; `sort-order` is `asc` / `desc` / empty | `SortOrder` | — |
| `sticky-rows` | Number of sticky rows (N): the first N rows stick below the header (coexists with the scroll container and fixed columns) | `string` | — |
| `stripe` | Zebra striping: alternating light background for odd/even rows | `boolean` | — |
| `summary` | Summary config `[{ key, type: 'sum'\|'avg'\|'count', label? }]`, JSON string | `string` | — |
| `summary-scope` | — | `string` | `all` |

### Events

| Event | Description |
| --- | --- |
| `oas-check` | Checkbox selection change, `detail: { keys: string[] }` |
| `oas-column-order` | — |
| `oas-column-resize` | — |
| `oas-edit` | Inline edit submitted (Enter / blur / operation column save), `detail: { rowIndex, key, column, value }`; in controlled mode the component does not write back `data` |
| `oas-edit-cancel` | Inline edit cancelled (Esc / operation column cancel / empty submit restores), `detail: { rowIndex, key, column, value }` (`value` is the original value) |
| `oas-expand` | Row expand/collapse (tree child rows or expandable content rows), `detail: { key, expanded }` |
| `oas-filter-change` | — |
| `oas-page-change` | — |
| `oas-row-click` | Row click (also toggles selection when not checkable), `detail: { row, key }` |
| `oas-scroll` | Virtual scroll event (rAF throttled), `detail: { scrollTop, start, end }` |
| `oas-sort-change` | Sort change, `detail: { key, order: 'asc' \| 'desc' \| '' }` |

> Note: `columns.render` is a function type and can only be assigned via the property from JS — it cannot be expressed as a JSON string. For `fixed` columns it is recommended to declare `width` explicitly (sticky offsets fall back to 100px when omitted). Summary can also be written directly on a column as `summary: 'sum' | 'avg' | 'count'`; `children` (tree child rows) and `expand` (expandable row content) are both row data fields.

The loading placeholder row is exposed as `::part(loading-row)`, the summary row as `::part(summary-row)`, and the expandable content row as `::part(expand-row)`; each can be styled independently.
