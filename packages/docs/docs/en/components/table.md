# Table

Displays structured data in a row-and-column grid with sorting, row selection, multi-select, and a loading state. It can be wired together with a pagination component.

`columns` / `data` support a declarative attribute channel: pass a JSON string directly to render the header and data rows (invalid JSON falls back to the empty state), while the property channel (assigning arrays/objects, property takes precedence) remains available and can be serialized into an SSR snapshot.

> **Data channel contract (read alongside oas-chart)**: pass a JSON string via the attribute, or an object/array via the property (no serialization needed; parsed in the setter and takes precedence over the attribute). `oas-table`'s `columns` / `data` setters **reflect back to the attribute** — after a property assignment, `getAttribute('columns')` / `getAttribute('data')` read back the corresponding JSON string (attribute and property stay in sync as a single source of truth). This differs from `oas-chart` (its `data` writes internal state only without reflecting; read it via `el.data`). Exception: when `columns` contain function fields (such as `render`), the setter takes a pure in-memory path without reflecting — read such columns via the `el.columns` property. Do not feed large / high-frequency datasets in full: reflection serializes the whole array into the attribute (serialize + read-back double cost, and a same-value write forces a full re-render); use [windowed mode](#server-side-row-window-windowed) instead (only the current slice is fed, so reflection cost is negligible).

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
      <oas-table-column data-key="name" title="Name" sortable></oas-table-column>
      <oas-table-column data-key="age" title="Age" sortable></oas-table-column>
      <oas-table-column data-key="city" title="City"></oas-table-column>
    </oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Nested child columns for a grouped header">
  <div style="width: 100%">
    <oas-table row-key="id" data='[{"id":1,"name":"Alice","age":28,"city":"Beijing","score":92},{"id":2,"name":"Bob","age":32,"city":"Shanghai","score":85}]'>
      <oas-table-column data-key="base" title="Basic">
        <oas-table-column data-key="name" title="Name" sortable></oas-table-column>
        <oas-table-column data-key="age" title="Age" sortable></oas-table-column>
      </oas-table-column>
      <oas-table-column data-key="city" title="City"></oas-table-column>
      <oas-table-column data-key="score" title="Score" sortable></oas-table-column>
    </oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Cell template cellTemplate (interpolate row.field)">
  <div style="width: 100%">
    <oas-table id="cell-tpl-table" row-key="id" data='[{"id":1,"name":"Alice","price":128,"city":"Beijing"},{"id":2,"name":"Bob","price":256,"city":"Shanghai"}]'></oas-table>
  </div>
</DemoBlock>

Besides the `columns` attribute / property array, columns also support a declarative child-element channel: `<oas-table-column data-key title sortable width align fixed ...>`, with attributes aligned to the `TableColumn` fields (booleans are true/false, kebab-case like `serial-number` / `filters`; the column identifier field is `key`, but `key` is a reserved word in Vue templates and gets stripped before reaching the DOM — **write `data-key` in declarative markup** (plain HTML may use `key` directly; the component reads both)); `title` falls back to the default slot text; a nested `<oas-table-column>` expresses a grouped header (children). Child changes are picked up by a MutationObserver to auto re-render. An explicit `columns` attribute / property takes precedence over the child-element channel. The `cellTemplate` (with a `row.field` placeholder for interpolation) renders a custom cell template, cloned and hydrated per cell: plain HTML may declare it with a `<template>` inside the column; in Vue hosts / the docs site prefer the `columns` **property** channel (build an `HTMLTemplateElement` in JS, as shown in the example above — md/Vue compile pipelines handle `<template>` children inconsistently and empty them in dev); the `render` function still takes precedence over the template.

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

Headers default to `header-align="follow"` and share the column `align` with body cells; `type: "number"` / `type: "currency"` default to right alignment when no explicit align is set. Override globally on the table with `header-align="left|center|right|default"`, or per column with `headerAlign` in `columns` / `header-align` on a child element; `default` returns control to the browser (UA th centering). Group headers in multi-level headers stay centered.

<DemoBlock title="Alignment and width">
  <div style="width: 100%">
    <oas-table header-align="follow" columns='[{"key":"name","title":"Name","width":"140px"},{"key":"age","title":"Age","align":"center"},{"key":"city","title":"City","align":"right"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"}]' row-key="name"></oas-table>
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

> Selection relies on `row-key`: the `selected` attribute is a comma-separated list of row keys. Without `row-key` the row key falls back to the row's JSON (which contains commas), so `selected` parsing fails and the row selected state does not apply — always set `row-key` on selectable tables.

## Row Single-Select (checkable="radio")

<DemoBlock title="Row single-select (mutually exclusive radio)">
  <div style="width: 100%">
    <oas-table id="table-radio" checkable="radio" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"},{"name":"David","age":28,"city":"Hangzhou","position":"UI Designer"},{"name":"Emma","age":32,"city":"Guangzhou","position":"QA Engineer"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Selected: <span id="table-radio-selected">none</span>
    </p>
  </div>
</DemoBlock>

`checkable="radio"` switches to single-select (a bare `checkable` keeps the multi-select behavior): the selection column renders radios with no header select-all checkbox (a blank header cell keeps the columns aligned), and clicking is mutually exclusive — `selected` holds single-value semantics (at most one row key). Clicking the already-selected row deselects it; `oas-check` carries the same `{ keys: string[] }` detail (at most one element in single-select mode).

## Row State Styling (row-class)

<DemoBlock title="row-class: return a class per row">
  <div style="width: 100%">
    <oas-table id="table-row-class" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"status","title":"Status"}]' data='[{"name":"Alice","age":30,"status":"active"},{"name":"Bob","age":25,"status":"active"},{"name":"Carol","age":41,"status":"over"},{"name":"David","age":28,"status":"disabled"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      The disabled row is greyed out and the over-quota row is tinted warning — driven by the class returned from row-class.
    </p>
  </div>
</DemoBlock>

<style>
#table-row-class::part(row-disabled) {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary-strong);
  text-decoration: line-through;
}
#table-row-class::part(row-warn) {
  color: var(--oas-color-danger);
  font-weight: 600;
}
</style>

`row-class` is a property function channel: `(row, index) => string` (multiple values separated by spaces). The returned classes land on the data row's `tr` and are also exposed as `::part()` tokens on that row's `tr` and each of its cells — page CSS can then target them through the Shadow DOM with `::part()` (the disabled/over-quota styling above uses exactly this mechanism). Functions cannot be serialized: it does **not** participate in the attribute / SSR snapshot (same contract as `columns.render`); in SSR scenarios assign it after client hydration.

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

Set `editable` to enable inline editing; mark editable columns with `editable: true` on the column config (`editor: 'input'` for text / `editor: 'select'` for a dropdown with `editOptions`), and `actions: true` renders an operation column (Edit / Save / Cancel buttons). Double-click a cell, or focus it and press Enter / F2, to start editing: Enter or blur submits, Esc cancels; submit emits `oas-edit` (`detail: { rowIndex, key, column, value, oldValue, oldRawValue }`), cancel emits `oas-edit-cancel` (with the same old-value fields). Submitting an empty value restores the original (non-destructive by default).

> **Inline editing is opt-in since v2.6.4**: the default entry `@oas-ui/ui/data/table` only provides the base table and **no longer bundles editing**. When using `editable` / `actions`, explicitly `import '@oas-ui/ui/data/table/edit'` (import registers it); otherwise editing silently no-ops with a dev hint. The full entry `@oas-ui/ui` and CDN family bundles still include editing (the demos below use the full entry, so no extra import is needed). The old alias `@oas-ui/ui/data/table/core` was removed in v2.6.5 (unreleased) — migrate by replacing `table/core` with `table` (add `table/edit` when you need editing).

Editable cells come with perceptible affordances: hovering or focusing (focus-visible) a cell reveals a subtle background tint and a pencil icon at the top-right (the icon never intercepts interaction), and the cell carries a `title` hint ("Double-click to edit"). Three ways to start editing: double-click, or focus the cell and press Enter / F2.

Clicks / double-clicks landing inside an inline “interactive host” never cascade into row-level gestures: pointer events inside native controls (`button` / `a` / `input` / `select` / `textarea`), elements carrying a `role` attribute, or library interactive components (e.g. `oas-button`, `oas-link`, `oas-select`) only trigger the control itself — they neither toggle row selection nor get misread as a double-click-to-edit. Row clicks and double-click editing share the same exclusion list, kept in sync as new interactive components are added to the library. Business-specific interactive content inside a row (charts, mini widgets, etc.) needs no library release: add `data-oas-row-click-ignore` to its container to exempt that whole block from row clicks and row editing. Interactive hosts suppress row-level gestures but do **not** block the editing state itself.

### Component Editor (editComponent)

<DemoBlock title="editComponent: any component as the cell editor">
  <oas-table id="table-edit-component" editable row-key="word" columns='[{"key":"word","title":"Term","editable":true,"editComponent":"oas-input"},{"key":"note","title":"Note","editable":true,"editComponent":"oas-textarea"}]' data='[{"word":"oas-ui","note":"Web Components library"},{"word":"divider","note":"Divider"}]'></oas-table>
</DemoBlock>

`editComponent` (a columns JSON field) specifies a **component editor** (takes precedence over `editor`): double-clicking mounts the given component and injects the current value. Component contract (minimal): readable value (`getFormValue()` → value property → value attribute, three-level fallback — `getFormValue` is the internal form-associated channel of in-library components; host custom elements only need to implement either a value property or a value attribute), submit event (`oas-change` or native `change`, either one), Escape cancels; multiline editors (textarea-based) let Enter through for line breaks and submit on blur. In-library form components (oas-input / oas-textarea / oas-switch etc.) satisfy it natively, and host-defined custom elements work the same way. Note: horizontal scrolling that shifts the column window re-renders the whole table and silently cancels any in-progress edit (no `oas-edit-cancel` is dispatched) — overlay editors follow the same semantics.

#### Overlay Component Editors (oas-select / oas-date-picker)

<DemoBlock title="Overlay editors: select + date picker">
  <oas-table id="table-edit-overlay" editable row-key="name" columns='[{"key":"name","title":"Member","editable":true},{"key":"dept","title":"Department","editable":true,"editComponent":"oas-select","editOptions":[{"value":"fe","label":"Frontend"},{"value":"be","label":"Backend"},{"value":"qa","label":"QA"}]},{"key":"joined","title":"Joined","editable":true,"editComponent":"oas-date-picker"}]' data='[{"name":"Zhang San","dept":"fe","joined":"2026-03-15"},{"name":"Li Si","dept":"be","joined":"2025-11-02"}]'></oas-table>
</DemoBlock>

Overlay components (`editComponent: 'oas-select'` / `'oas-date-picker'`) automatically go through the **overlay editor channel**, which differs from the plain component channel:

- **The overlay opens automatically on entering edit** (driven through the component's uncontrolled open path via its trigger, without writing the controlled `open` attribute); if the component is not registered (typo tag / missing import), it mounts as a blank element with no auto-open and no warning — consistent with the plain channel.
- **Pointer interaction inside the overlay panel does not misfire the blur-submit**: the panel lives inside the component's shadow, so focus shifts caused by pointer presses within the editor subtree (picking an option, navigating the calendar, searching) are suppressed — single-value components commit on selection (`oas-change`); multi-select components treat toggling as intermediate state and commit once on blur.
- **Two-level Escape**: while the overlay is open, Escape only closes the panel (edit stays); pressing Escape again after the panel is closed cancels the edit.
- **Click-outside commits**: clicking outside both the editor and the overlay commits the current value; clicking another cell inside the table keeps the existing semantics (row re-render silently cancels the edit).

`oas-select` edit options sync from the column config: `editOptions` first, falling back to `options` (the same option semantics as the display side). The default editor of a `type: 'multi-select'` column is this channel's `oas-select multiple` (see "Field Types" below).

### Cell validation (validate)

Column config `validate` (**property function channel** — the attribute JSON declarative channel cannot carry functions) intercepts illegal values before commit: `(value, row) => error message | false | empty string/undefined to pass`. On failure: **no commit, the edit state is kept** (retry in place), the cell shows a danger background (`data-invalid`) plus a top danger banner message (`.edit-error`, overlaid on the editor's top edge — never clipped by the scroll container even with fixed row heights / virtual scrolling), the editor focus ring turns danger (overlay editor channel included), focus returns to the editor, and `oas-edit-invalid` is dispatched (`detail: { rowIndex, key, column, value, oldValue, oldRawValue, message }` — listen for error summaries/logging); a successful retry clears the marker and message automatically. `type: 'date'` columns get a built-in `YYYY-MM-DD` shape check when no custom `validate` is given (a "commit without changes" with an ISO/timestamp old value is exempted, so it is never blocked by mistake). The error visuals use danger semantic tokens (`--oas-color-danger-soft` invalid cell background / `--oas-color-danger` focus ring and banner fill / `--oas-color-text-on-danger` banner text; dark mode adapts automatically).

<DemoBlock title="validate interception: amount must be positive — failure keeps the edit state, inline message, oas-edit-invalid event">
  <div style="width: 100%">
    <oas-table id="table-edit-validate" editable row-key="item" style="width: 100%"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      Blocked: <span id="table-edit-validate-feedback">—</span>
    </p>
  </div>
</DemoBlock>

```ts
// Columns go through the property channel (validate is a function the attribute JSON cannot carry):
table.columns = [
  { key: 'item', title: 'Item', editable: true },
  {
    key: 'amount',
    title: 'Amount',
    editable: true,
    validate: (v) => (Number(v) > 0 ? '' : 'Amount must be positive'),
  },
]
table.addEventListener('oas-edit-invalid', (e) => {
  console.log('blocked:', e.detail.column, e.detail.value, e.detail.message)
})
```

> Validation applies to the **edit-commit path only**: programmatic `data` writes / property assignments bypass `validate` (data cleaning is the host's job); an inline error summary bar is a host composition (listen to `oas-edit-invalid` + conditional formatting).

### Audit trail (table/audit, helper L3)

`@oas-ui/ui/data/table/audit` provides an **audit log**: it subscribes to the `oas-edit` event stream and records every commit per "row key × column" (old value → new value + raw form + timestamp), for "who changed what" traceability in financial vouchers / medical records / lab data. It is **orthogonal to `table/history`** (the undo stack): the audit log is an observation log — **no replay, no undo, no participation in the edit pipeline**; cancels (`oas-edit-cancel`) and unchanged commits produce no entries. In-memory ring buffer (default limit 500, configurable via `limit`), **no persistence** — cross-session auditing is the host's job (persist to your own store). **Semantic boundaries**: (1) the edit-commit channel only — other write channels (range batch paste/fill, etc.) are not audited in v1; (2) under `edit-controlled`, commit *requests* are recorded — whether they take effect depends on the host write-back; (3) the event stream is the source of truth — a hand-dispatched `oas-edit` is recorded as-is; (4) queries return shallow copies, so in-place mutation cannot corrupt the log.

```ts
import { createAuditLog } from '@oas-ui/ui/data/table/audit'

const audit = createAuditLog(table, { limit: 500 })
audit.getCellHistory('r1', 'amount') // one cell, chronological: [{ key, column, oldValue, oldRawValue, value, at }]
audit.getRowHistory('r1') // one row across columns
audit.size / audit.clear() / audit.destroy() // count / clear / unsubscribe
```

A **cell audit tooltip** ("edited 3 times, latest: 30 → 31") needs no new component — build it with structural-render's `bodyCell` hook on hover (the library's first structural-render recipe; the row key follows the table's `row-key` — this recipe assumes `row-key="id"`):

```ts
import '@oas-ui/ui/data/table/structural-render'
const audit = createAuditLog(table)
table.structuralRenderers = {
  bodyCell({ el: td, row, column }) {
    const show = () => {
      const h = audit.getCellHistory(String(row.id), column.key)
      if (h.length === 0) return
      const last = h[h.length - 1]!
      td.title = `edited ${h.length}x · latest ${last.oldValue} → ${last.value}`
    }
    td.addEventListener('mouseenter', show)
  },
}
```

<DemoBlock title="Audit log: commits are recorded; getCellHistory reads old → new">
  <div style="width: 100%">
    <oas-table id="table-audit" editable row-key="item" style="width: 100%"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      Audit: <span id="table-audit-feedback">—</span>
    </p>
  </div>
</DemoBlock>

```ts
const audit = createAuditLog(table)
table.addEventListener('oas-edit', (e) => {
  const d = e.detail
  const h = audit.getCellHistory(d.key, d.column)
  // surface the full history of that cell
})
```

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

Setting `height` enables virtual scrolling (with a fixed `row-height`): only rows within the visible window are rendered. It works together with fixed columns, sorting, and multi-select; scrolling emits `oas-scroll`. **Print view**: when the browser prints or exports to PDF (`print` media), the component detects it automatically and renders **all rows** — off-window rows are not in the DOM and CSS cannot bring them back, so entering print/print-preview fires `matchMedia('print')` which re-renders the full row set into the DOM (print geometry applies too: scroll height caps removed, sticky header/fixed columns reset, spacer rows take no paper space). Window rendering resumes after printing. Row shape matches the on-screen form (fixed-height truncation semantics are preserved).

<DemoBlock title="column-virtual: horizontal virtualization for wide tables">
  <oas-table id="table-col-virtual" column-virtual height="300" checkable></oas-table>
</DemoBlock>

`column-virtual` enables horizontal virtualization (column windowing): only visible-window columns render; off-window columns collapse into `colSpan` placeholder cells (widths summed via `colgroup`; `table-layout: fixed` is enforced) — a 60-column table keeps only a dozen or so in the DOM. It can be combined with `height` row virtualization; fixed columns must use two-end layout and always render. Constraints (warns and degrades): grouped header / span-method / summary rows / an active server grouping are incompatible (server grouping is data semantics and wins — the per-column group-row layout conflicts geometrically with column-window placeholders, so column virtualization is what gets dropped); explicit `width` on every column is recommended (unset widths fall back to an estimated 100px). Note: horizontal scrolling that shifts the column window re-renders the whole table and silently cancels any in-progress edit.

## Multi-line Cells

In non-virtual tables (no `height`), long cell text wraps naturally within the column width and the row grows taller — this is supported behavior. Wrapping only happens when the **column width is constrained**: under the default auto table layout the table first claims the container's surplus width, so long text may fit on one line when the container is wide enough; set an explicit `width` on the column to constrain wrapping by column width.

Under virtual scrolling (`height`), cells default to **single-line, no wrapping** (`nowrap + overflow hidden`) to preserve the fixed-row geometry: a `row-height` row never lets wrapped content push its height (height drift would misalign the scroll window against the spacer heights). Note the default rule carries no column-width cap — content wider than the column's allocated width **widens the table with a horizontal scrollbar**, and the part overflowing the cell edge is clipped. For a true ellipsis or a strict width, use an `ellipsis` / `wrap: false` column (which carries a `max-width` constraint) or explicit column widths.

The `wrap` column field controls cell wrapping in three states:

| `wrap` | Non-virtual (no height) | Virtual scroll (height) |
| --- | --- | --- |
| unset | Natural wrapping by column width (as above; no style class added) | Single-line, no wrap (no ellipsis cap; the table widens horizontally beyond the column width, overflow clipped) |
| `true` | Explicit wrapping (`cell-wrap`) | Wrapped display, content beyond the fixed height is clipped (row height stays `row-height`) |
| `false` | Single-line ellipsis truncation (no title; the hover tooltip is exclusive to `ellipsis` columns) | Single-line ellipsis truncation (no title) |

**Recipe for multi-line notes**: virtual scrolling + a `wrap: true` column + a larger `row-height` tier (e.g. 64 / 96) — the cell shows multi-line note text within the fixed height; overflow is clipped without stretching the row.

## Auto row height (row-auto-height)

Virtual scrolling (`height`) keeps a uniform row height across the table (the `row-height` step) by default. When rows should **grow with their content** (long notes, message-style data), import `@oas-ui/ui/data/table/auto-height` once and set the `row-auto-height` attribute:

- **Measurement model**: ResizeObserver measures each rendered row; unmeasured rows use the `row-height` estimate — the scrollbar length starts estimated and converges as measurements arrive (jumping to a remote region positions by estimate until it settles). A `wrap: true` column participates in multi-line measurement; non-wrap columns stay single-line (narrowed measurement surface).
- **Windowed mixed model**: also supported under windowed — rows inside the loaded slice are measured, rows outside and unloaded regions use the `row-height` estimate, and the prefix sum stitches estimate with measured values; after a height correction an `oas-window-request` is re-dispatched as needed (the expected range follows the geometry).
- **Anchoring**: any height correction (measurement backfill / data change) compensates the scroll position by (row identity, in-row offset) — the viewport content never jumps (same behavior as spreadsheet auto-fit).
- **Shrinking**: the tr inline height acts as a minimum in table layout (grow-only, which eliminates oscillation); rows whose content got shorter are re-measured via a per-frame round-robin probe and converge within a few frames.
- **Rows being edited** are excluded from measurement rebuilds (so typing is never cancelled); the next sync after editing settles picks them up.
- **Limits**: merge / span-method are already inert under virtual scrolling (see the constraints above); expand rows stay fixed-height under windowed (auto-height applies to data rows only); the module is a registered L3 — without the import the default table chain only pays a sub-KB hook constant.

<DemoBlock title="Auto row height (row-auto-height + wrap column: long-note rows grow automatically, scroll geometry converges with measurement)">
  <oas-table height="220" row-height="40" row-auto-height stripe style="width: 100%"
    columns='[{"key":"name","title":"Task","width":"140px"},{"key":"note","title":"Note","wrap":true}]'
    data='[{"name":"Kickoff","note":"Short note"},{"name":"Design review","note":"A long enough note: the review covered contrast, focus-ring visibility and density-tier switching under both light and dark themes. The issue list is synced to the collaboration board and queued for fix scheduling once design confirms."},{"name":"API integration","note":"Short"},{"name":"Perf baseline","note":"Another long note: this sampling captured first-screen interactivity, long-list scroll frame rate and memory usage. Scroll frame rate stays above 55fps on low-end devices — target met."},{"name":"Regression","note":"Short"}]'
    row-key="name"></oas-table>
</DemoBlock>

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

## Summary scope

`summary-scope` controls the aggregation range of the summary row: `all` (default) totals the complete filtered result set before pagination slicing (stable across page flips), while `page` subtotals only the current page. The difference is visible when pagination is on.

<DemoBlock title="Summary scope: all (default) vs page">
  <div style="width: 100%; display: flex; flex-direction: column; gap: 16px">
    <oas-table pagination page-size="3" summary='[{"key":"age","type":"sum","label":"Total (all)"}]' columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":28,"city":"Hangzhou"},{"name":"Emma","age":32,"city":"Guangzhou"},{"name":"Frank","age":27,"city":"Chengdu"}]' row-key="name"></oas-table>
    <oas-table pagination page-size="3" summary-scope="page" summary='[{"key":"age","type":"sum","label":"Subtotal (page)"}]' columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":28,"city":"Hangzhou"},{"name":"Emma","age":32,"city":"Guangzhou"},{"name":"Frank","age":27,"city":"Chengdu"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

In the first table above `summary-scope` is omitted (`all`): page 1 shows the total age sum of all 6 rows, 177. In the second `summary-scope="page"`: page 1 subtotal is the current page's 3 rows (30+25+35=90), and the subtotal changes as you flip pages.

## Expandable Rows

<DemoBlock title="Expandable rows (expand field)">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"position","title":"Position"}]' data='[{"name":"Alice","age":30,"city":"Beijing","position":"Frontend Engineer","expand":"<div>More: Alice oversees frontend architecture and team management, joined in 2021.</div>"},{"name":"Bob","age":25,"city":"Shanghai","position":"Product Manager","expand":"<div>More: Bob leads product planning and requirements review, joined in 2022.</div>"},{"name":"Carol","age":35,"city":"Shenzhen","position":"Backend Engineer"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

When a row's data has a non-empty `expand` field, an expand column appears at the end of the table; clicking the button expands the whole row to show custom content. The expanded state is stored in the `expanded` attribute (a comma-separated set of keys), and toggling emits `oas-expand`. `expand` is rendered as an HTML string: pass trusted content only, or escape/sanitize untrusted data on the host side.

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

With the `loading` attribute, the header stays visible and the data area shows a placeholder row; removing the attribute restores the data.

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

<DemoBlock title="Rich empty content slot (slot=&quot;empty&quot;)">
  <div style="width: 100%">
    <oas-table id="table-empty-slot" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"}]' data="[]">
      <div slot="empty" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0">
        <oas-icon name="search" style="font-size: 28px; color: var(--oas-color-text-secondary)"></oas-icon>
        <span>No records yet — click the button to add one</span>
        <oas-button size="small" type="primary" onclick="window.tableEmptySlotAdd && window.tableEmptySlotAdd()">Add data</oas-button>
      </div>
    </oas-table>
  </div>
</DemoBlock>

Empty state priority: the `slot="empty"` slot (either `<template slot="empty">` or a plain element — a plain element is cloned as-is, a template clones its content) > the `empty-text` attribute > the built-in i18n text; adding or removing the slotted content re-renders automatically.

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

Touch adaptation: HTML5 drag-and-drop (dragstart) does not work on touch screens. Under coarse pointers each header cell shows move-up / move-down buttons (hidden on desktop) to swap a column with its neighbor; the header filter button, expand toggle and column-resize handle all grow to the 44px touch target; the filter panel positions itself away from viewport edges (flipping when space is short, never overflowing on narrow screens).

## Multi-column sorting

<DemoBlock title="Shift-click to multi-sort (multi-sort)">
  <div style="width: 100%">
    <oas-table id="table-multi-sort" multi-sort='[{"key":"age","order":"asc"},{"key":"name","order":"asc"}]' row-key="name" columns='[{"key":"age","title":"Age","sortable":true},{"key":"name","title":"Name","sortable":true},{"key":"city","title":"City","sortable":true}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":25,"city":"Hangzhou"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      The initial `multi-sort='[{"key":"age","order":"asc"},{"key":"name","order":"asc"}]'` declares the multi-column sort state as JSON (header shows priority 1, 2…). Hold Shift and click sortable columns to accumulate / toggle / remove sorts, writing back to `multi-sort`; a plain click resets to single column.
    </p>
  </div>
</DemoBlock>

## Serial number & ellipsis

<DemoBlock title="Serial number + ellipsis">
  <div style="width: 100%">
    <oas-table row-key="name" columns='[{"key":"index","title":"#","serialNumber":true,"width":"60px"},{"key":"name","title":"Name","width":"120px"},{"key":"desc","title":"Description","ellipsis":true},{"key":"city","title":"City","width":"100px"}]' data='[{"name":"Alice","city":"Beijing","desc":"Three years of front-end experience, owning core component design and performance optimization."},{"name":"Bob","city":"Shanghai","desc":"Focuses on product planning and requirements review."},{"name":"Carol","city":"Shenzhen","desc":"Backend veteran focused on high concurrency and microservices."}]'></oas-table>
  </div>
</DemoBlock>

A column with `serialNumber: true` renders the row number (starting from 1, not reading a data field); a column with `ellipsis: true` truncates overflowing content to a single line with an ellipsis (hover `title` shows the full text); the three-state `wrap` semantics are covered in the "Multi-line Cells" section above.

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

## External data pagination (total)

<DemoBlock title="Server-side pagination (total + controlled current, host swaps data)">
  <div style="width: 100%">
    <oas-table id="table-total" pagination page-size="5" total="47" current="1" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"Name"},{"key":"age","title":"Age"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Setting `total` declares the total row count: `data` holds only the current page slice (no internal slicing); page / page-size changes fire `oas-page-change` and the host fetches that page (this demo simulates server slicing with local data). Current page: <span id="table-total-page">1</span> · rows in loaded page: <span id="table-total-rows">—</span>
    </p>
  </div>
</DemoBlock>

## Server-side row window (windowed)

> For very large datasets (hundreds of thousands of rows): the host supplies only the slice near the visible window and the component **holds no full dataset** — the row window is computed from the scroll position and, when it is not covered by the loaded range, `oas-window-request` is emitted for the host to refill (scroll → request → refill).

Attributes: `windowed` (enable) + `total` (full row count) + `window-start` (absolute row index of `data[0]`). Event `oas-window-request`: `detail: { start, end, reason, visualStart?, visualEnd }` (`start`/`end` are half-open absolute **data row** indices and always stay in data coordinates; `reason` is `init` / `scroll` / `resize` / `data`; the same expected window — including the visual fields — is not emitted twice).

```html
<oas-table windowed total="100000" window-start="0" row-key="id" height="360" columns='[…]'></oas-table>
<script>
  const el = document.querySelector('oas-table[windowed]')
  el.addEventListener('oas-window-request', (e) => {
    const { start, end } = e.detail
    // Real apps fetch rows [start, end) from the server; this sample mocks it locally
    el.setAttribute('window-start', String(start))
    el.setAttribute('data', JSON.stringify(rowsOf(start, end)))
  })
</script>
```

In windowed mode **local sort / filter / group / pagination / tree-expand / summary / merge (`merge`, `span-method`) / `column-virtual` are the host's responsibility** (the component skips them with a devWarn) — listen to the existing `oas-sort-change` / `oas-filter-change` / `oas-page-change` events, process the full dataset, then refill the window slice. Off by default: behavior unchanged.

**Print limitation**: the full dataset lives on the server and the client only holds the loaded slice — printing / PDF export (`print` media) **cannot render the full set**; the output is exactly the loaded slice rows (the component devWarns once). To print everything, have the host preload the entire slice range or turn windowed off for that scenario. Print geometry (spacer rows take no paper space, sticky reset) matches the local virtualization path.

**Exception — tree lazy-loading (the hasChildren contract, unreleased)**: a windowed slice row carrying `hasChildren: true` enters tree lazy-loading mode (a nested `children` array keeps its legacy ignored semantics and does NOT trigger this mode). The contract is a three-piece set:

- **Expand interaction**: clicking the tree toggle only dispatches `oas-expand` (`detail { key, expanded }`) — the component does **not** modify `expanded` locally. The host fetches descendants, merges them into the slice as **flat rows** (with `depth` metadata), refeeds `data`, and updates `total` (the flattened row count in the current expand state) plus the `expanded` attribute.
- **Row metadata**: `hasChildren: boolean` (**only the boolean `true` is recognized** — string forms do not trigger) — marks the row as a parent and renders the toggle even when descendants are not loaded; plus `depth: number` (indent level, default 0). Row fields pass through the attribute JSON untouched — there is no cleaning whitelist. When combined with the optional visual protocol, expansion is also host-controlled and **`total` must be updated as well** (the two protocols are orthogonal and composable, not mutually exclusive).
- **Coordinate semantics**: after flattening, children rows ARE regular data rows — `data-row-index`, event `rowIndex` and ARIA stay **exactly the same as plain windowed**; no new coordinate system is introduced. The visual protocol remains an optional optimization (hosts can opt in to express the full expanded extent).
- **Collapse anchoring**: collapsing N descendant rows shifts `total` and the viewport — host recipe: record the anchor row key before refeeding, then call `scrollToRow(key)` after (scrolls to the row in a virtual/windowed viewport; returns false when not found).
- The mode is judged per render from the slice data (any `hasChildren` row in the slice = tree mode; once they all disappear the `depth` metadata stops taking effect and interaction falls back to the plain channel, leaving no residual visuals). A row carrying both `hasChildren` and an inline `expand` field keeps both channels: the tree toggle goes through the host channel while the trailing expand button stays local (the inline content row occupies an independent visual slot).

```ts
// Host-side expand handling (illustrative):
table.addEventListener('oas-expand', async (e) => {
  const { key, expanded } = e.detail
  const anchor = key // collapse anchor = the operated parent row
  const slice = expanded ? await loadDescendantsInto(key) : await collapseTo(key)
  table.setAttribute('data', JSON.stringify(slice)) // flat rows + depth
  table.setAttribute('total', String(sliceFullLength))
  table.setAttribute('expanded', nextExpandedSet)
  table.scrollToRow(anchor) // restore the viewport after a collapse
})
```

<DemoBlock title="windowed × tree lazy-loading: a three-level org tree with click-to-load descendants (host refeed + scrollToRow anchoring)">
  <oas-table id="table-wintree" windowed row-key="name" height="160" row-height="32" style="width: 100%"></oas-table>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
    Expanded: <span id="table-wintree-feedback">3 root nodes (total 3)</span>
  </p>
</DemoBlock>

Inline row expansion (the row `expand` field) occupies an **independent visual slot** in windowed virtual scrolling but does not consume an absolute data row number: `data-row-index`, event row numbers and ARIA semantics still count data rows only. The visible window and the scroll height are computed as `total + expansions in the current slice`, so multiple expansions and the expansion of the last loaded row stay visible; when the slice is out of range (length exceeds `total - window-start`), out-of-range rows and their expansions are not rendered, while the expansion of the last in-range data row is kept. When the slice contains expand rows, the `oas-window-request` expected range is no longer guessed from a uniform data grid: the visible window is **mapped back to data coordinates** through the visual slots (covering the actually visible data rows and their expand owner rows), and `visualStart` / `visualEnd` carry the visible window's visual coordinates for host-side visual fetching — when local expand changes move the visible range, the request is re-emitted even if the data range is unchanged.

### Optional visual protocol (visual-total / visual-start)

When the host's slice **starts after already-expanded rows** (the component only holds the slice and cannot know the expansion count before it), provide the optional visual protocol so the component renders in visual coordinates:

- `visual-total`: total number of visual rows (data rows + inline expand content rows), a finite positive integer (truncated) not smaller than `total`;
- `visual-start`: the visual row number of the current slice's `data[0]`, `0 ≤ visual-start ≤ visual-total`.

Both attributes must be **valid at the same time** to activate (windowed only): the render flow starts at `visual-start × row-height`, and rendering and scroll height follow `visual-total`. **Once active, expansion is fully host-controlled** — clicking the local toggle only emits `oas-expand` (with a one-time devWarn) and does not modify `expanded`; the host listens and writes back `expanded` / `data` / visual attributes to re-render, and never double-writes from both sides. Missing / invalid / only one of the pair / `visual-total` smaller than the data `total`: devWarn once and **fall back entirely** to the current model (no partial activation). Absolute data row numbers (`data-row-index`, event row numbers, ARIA, range/displaySnapshot) are unaffected by the visual protocol; when `visual-start + loaded entry count > visual-total`, out-of-range entries are not rendered with a one-time devWarn. In non-virtual windowed mode (no `height`) the protocol only affects "expansion is host-controlled", not the layout.

> For the host fetching recipe in visual coordinates (prefer `visualStart` / `visualEnd`, atomic refill of `visual-start` in the same snapshot as the slice, re-evaluating on refill), see "Visual protocol recipe" in [Server-side windowed data](/en/guide/windowed-data); `createWindowedSource` accepts an optional `visual` adapter that performs the mapping and visual-attribute write-back automatically — see "Visual adapter" under the windowed data source helper below.

> Note: `total` is reused here as the "full row count" (in pagination mode it means the external total row count); row/column virtualization requires `height` (host-constrained); the windowed slice must be **flat** (the component does not recurse into `children`); rows beyond `total - window-start` are not rendered and produce a one-time devWarn.

> For the full host recipe (segment fetch, abort in-flight, merge by id, atomic refill) and a runnable example, see [Server-side windowed data](/en/guide/windowed-data).

## Server row model (row-model="server")

> A fetching mode that hands sorting/filtering responsibility to the server (enterprise datasets with 100k+ rows): `data` is the host-refilled current-page slice, and the local filter/sort transforms are **skipped entirely** (all or nothing — "sort only the current page" is wrong semantics; the component provides no partially-mixed configuration). **Activation requires the `total` attribute** (external pagination form); without it the component falls back to client behavior and devWarns once. When combined with `windowed`, **windowed wins** (`row-model` is ignored) and devWarns once — the two protocols are mutually exclusive; pick one. With `group-by` set, the component enters the **server-side grouping protocol** (see "Server-side grouping" below): grouping/aggregation responsibility likewise moves to the host, and the component renders the group rows the host returns.

### Mode recipe (minimal)

Three pieces on the component: `row-model="server"` (enable) + `total` (activation premise; rewritten as responses arrive) + `pagination` (built-in pager; each page change refetches):

```html
<oas-table
  id="orders-table"
  row-model="server"
  total="0"
  pagination
  page-size="10"
  row-key="id"
  columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"Name"},{"key":"amount","title":"Amount","sortable":true}]'
></oas-table>
```

On the host, use `createServerSource` to take over fetching (protocol listening, requestId validation, aborting in-flight requests, and failure reporting are all built in; imported from `@oas-ui/ui/data/table/advanced` — a pure host-side helper that adds no component API). The element must be connected (append before creating). **One source instance per element** — creating a second source on the same element doubles listeners and fetches (warns on every duplicate creation and still returns the new instance); call `destroy()` first and rebuild (rebuilding after `destroy()` is warning-free). Rebuilding after `destroy()`: if `data` is still present, the first page is not auto-fetched again (the first-load fallback only applies to elements without data) — call `source.refresh()` to refresh. On creation the helper proactively issues one refresh to fetch the first page — with static markup the element upgrades before the script runs, so the init request fires before any listener exists (dynamic creation where init was already caught, or elements prefilled with data for SSR, are not refreshed again — the first page is the host's responsibility there):

```ts
import { createServerSource } from '@oas-ui/ui/data/table/advanced'

const source = createServerSource(table, {
  // Writes total up front, before server mode activates (activation premise; if omitted the host must set the attribute itself)
  total: 1000,
  fetchRows: async ({ requestId, start, end, sortModel, filterValues, reason, signal }) => {
    // requestId: monotonically increasing inside the component; can be forwarded to the server for trace correlation
    // start / end: current page half-open range (current-1)*pageSize ~ current*pageSize
    // sortModel / filterValues: server-side sort/filter conditions (reusing the sort-key / filter-values vocabulary)
    // signal: aborted when a newer request is emitted or on destroy — respond to it early in your fetch
    const res = await api.listOrders({ start, end, sort: sortModel, filter: filterValues, signal })
    // Returning { rows, total } lets the helper sync the total attribute automatically; a bare array requires total to be present already
    return { rows: res.list, total: res.total }
  },
})
// source.refresh(): force-refetch the current page (reason='refresh', bypassing same-value dedup); refresh({ purge: true }): purge all cache entries, then force-refetch
// source.destroy(): unbind listeners, abort in-flight work, and clear the helper cache (does not touch row-model / total attributes)
```

Data-layer caching (built into the helper, no component protocol changes): **enabled by default** — the same query (same range / sort / filter / cursor, regardless of what triggered it) refills from cache within its TTL on page round-trips **without calling `fetchRows` again**. `cache: false` disables it entirely (the disabled path behaves exactly like the pre-cache implementation); `{ ttlMs }` is configurable in milliseconds (default `300000` = 5 minutes); `{ staleWhileRevalidate: true }` enables background revalidation — an expired hit first refills the stale value (users see old data immediately instead of a loading state), then a background refetch updates the refill when it succeeds (two visible phases). Concurrent same-key requests are merged automatically (one fetch reused, no duplicates); a failed or aborted `fetchRows` writes no cache (returning to a failed page retries it); `refresh()` with no argument bypasses the cache and force-refetches (the result updates the cache), while `refresh({ purge: true })` purges **all** cache entries before force-refetching (use when the data was modified externally); `destroy()` clears the cache and in-flight registry:

```ts
// Default: 5-minute TTL; page round-trips hit the cache without calling fetchRows
const source = createServerSource(table, { fetchRows, total: 1000 })

// Full configuration example
const source = createServerSource(table, {
  fetchRows,
  total: 1000,
  cache: {
    ttlMs: 60_000, // entry lifetime in ms (default 300000)
    staleWhileRevalidate: true, // expired hit: refill the stale value + refetch in the background (default false = expired means refetch)
  },
})
// source.refresh()          → force-refetch the current page (bypasses cache reads, result written back to cache)
// source.refresh({ purge: true }) → purge all cache + force-refetch (every key refetches on return)
```

Cache semantics at a glance: key = the full query (`start` / `end` / `sortModel` / `filterValues` / `cursor`, independent of the request reason — `init` / `sort` / `filter` / `paginate` are all query states, so page round-trips hit the same entry; sort order is array-sensitive, filter key order is insensitive, value types are sensitive); an unexpired hit refills directly (the `data` / `total` attribute writes use the same channel as the success path, requestId guard semantics preserved); an expired hit refetches by default, or goes through the two phases when SWR is on; same-key in-flight requests reuse one Promise. After host data is modified externally on the server, use `refresh({ purge: true })` (single-page refetch: `refresh()`); for scenarios that must always hit the server (non-idempotent fetchers, latency-sensitive data), pass `cache: false`.

Timeout and cancellation: the component has no built-in request timeout — timeouts are the data layer's (host fetcher's) responsibility. Compose abort signals inside `fetchRows` before handing them to your fetch: `AbortSignal.any([signal, AbortSignal.timeout(8000)])` (the helper's `signal` + an 8s timeout, whichever fires first; `AbortSignal.any`/`AbortSignal.timeout` baseline is 2024 — engines shipped them progressively between 2023-08 and 2024-04. On older environments, feature-detect with `typeof AbortSignal.any === 'function'` and fall back to a manual `AbortController` + `setTimeout` combination or a host-side timeout). A timeout rejects like any other failure and takes the same path: the helper bridges it to the error bar + retry automatically — no custom timeout UI needed:

```ts
fetchRows: async ({ signal, ...rest }) => {
  // helper signal + 8s timeout, whichever fires first: page-change/destroy aborts and timeouts don't swallow each other
  const res = await api.listOrders({ ...rest, signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) })
  return { rows: res.list, total: res.total }
}
```

Request triggers: mount first load, page change / page-size change, sort change, filter change, group-key change, `refreshRows()` (`reason` is `init` / `paginate` / `sort` / `filter` / `group` / `refresh`; sort/filter/page-size/group-key changes reset `current` to 1 before refetching — the user sees the first page under the new criteria, not "page N of the new sort"). While a request is in flight the component shows its built-in loading row; when `fetchRows` fails, the helper bridges the built-in failure channel via `reportRowsError` — **keep the old data + emit `oas-rows-error` + show the error bar** (`role="alert"`, retry button calls `refreshRows()`), so the host needs no custom failure UI. The component has no built-in request timeout: if the host fetch never settles, loading stays — compose signal + a timeout on the fetcher side (see "Timeout and cancellation" above). The helper refills asynchronously and is not subject to the "synchronous `data` write inside the listener lags a frame" restriction (see the refill-timing note after the decision table below). Protocol details (requestId dedup, same-value suppression, race rules) are in the `row-model` / `oas-rows-request` / `reportRowsError` entries of the API tables below.

### Server-side grouping (group-by + host group-row protocol)

Under the `row-model="server"` form, `group-by` present means **host-side grouping**: the component does no local grouping or grouped sorting (whatever order the host returns is rendered, including hierarchy order), and grouping/aggregation responsibility is fully on the server. Composition matrix: supported under the server form; grouping remains disabled with `infinite` (devWarn once + requests do not carry `groupBy` — grouping already-loaded rows is a wrong result); the existing `windowed` disablement is unchanged; with `column-virtual` the column virtualization degrades to plain rendering (devWarn once — the per-column group-row layout conflicts geometrically with column-window placeholders, and grouping as data semantics wins); the client form's local grouping is unchanged (see "Grouped view").

Component obligation: request detail gains `groupBy` (the current group key; requests without `group-by` omit the key), and a group-key change emits a `reason='group'` request with the page reset. Host obligation: return a **mixed-row array** per `detail.groupBy` (refilled via the `data` attribute); rows come in two kinds and render in return order:

- **Group row**: `{ kind: 'group', groupKey, groupLabel?, groupCount?, depth?, aggregates? }`
  - `groupKey` (**required, non-empty string**): the group key = collapse-state identity (a `kind:'group'` row with an invalid `groupKey` **renders as a data row** — no data dropped, no silent removal; devWarn once)
  - `groupLabel`: section-header text (falls back to `groupKey` when absent)
  - `groupCount`: row count within the group (**no count shown when absent**; NaN/negative treated as absent)
  - `depth`: hierarchy depth (hierarchical grouping; defaults to 0, group rows indent with the same formula as tree rows)
  - `aggregates`: within-group aggregates (**column key → host-computed number/string**; the component neither aggregates locally nor re-formats; invalid values such as objects/arrays render as empty cells)
- **Data row**: the existing plain row (no `kind`, or `kind: 'data'`); tree `children` are not part of this protocol — flatten them host-side and return a flat row order if child expansion is needed

> **`kind` is a reserved field while the protocol is active**: the component uses the inline `kind` field to tell group rows from data rows — if your row data already carries a business field named `kind`, rename it to avoid accidentally triggering the group-row protocol (conflict behavior: a `kind:'group'` row with an invalid `groupKey` renders as a data row and warns once).

The component renders in array order: group rows reuse the existing section-header visual (collapse arrow + label + count), indenting by `depth>0`; collapsing filters **locally within loaded rows** (clicking the arrow only re-renders, no refetch — rows of the collapsed group hide up to the next group row, and under hierarchical grouping collapsing a top group hides its sub-group rows too); `aggregates` render in columns with `aggregate: true` (group rows lay out per column: the label cell covers everything before the first aggregate column, aggregate cells render the host value per column and stay empty when absent, and they carry `data-col` / `part="cell"` for host selector hits — `part` is always written on aggregate cells while data-row cells get it only when a rowClass hook is present, a side-effect-free addition; alignment follows the column `align` / numeric right-align convention; **the per-column form is a table-level decision** — once any column declares `aggregate`, all group rows in the table share the same form, and group rows without `aggregates` leave the aggregate cells empty). The collapse identity is `groupKey`, preserved across data/page refills. `total` counts **data rows only** (group rows are decoration rows and are not counted — pagination page counts and page numbers derive from data rows).

```html
<oas-table
  id="server-group-table"
  row-model="server"
  total="0"
  pagination
  group-by="dept"
  columns='[{"key":"name","title":"Name"},{"key":"amount","title":"Amount","aggregate":true,"type":"number"}]'
></oas-table>
<script>
  document.getElementById('server-group-table').addEventListener('oas-rows-request', async (e) => {
    const { requestId, groupBy, start, end } = e.detail
    const res = await api.listGrouped({ groupBy, start, end }) // server-side grouping + aggregation
    // Refill mixed rows: group rows + in-group data rows, order decided by the server (the component renders in order)
    // total counts data rows only (group rows are decoration rows — pagination derives from data rows)
    e.target.setAttribute('total', String(res.total))
    e.target.setAttribute('data', JSON.stringify(res.rows))
  })
</script>
```

<DemoBlock title="Server-side grouping live demo: host returns mixed rows (group + data rows), per-column aggregates + collapse filters locally without refetching">
  <div style="width: 100%">
    <oas-table
      id="table-server-group-live"
      row-model="server"
      total="5"
      pagination
      page-size="10"
      group-by="dept"
      columns='[{"key":"name","title":"Name"},{"key":"amount","title":"Amount","aggregate":true,"type":"number"}]'
    ></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      The host returns mixed rows (group rows carry `groupCount` / `aggregates`, aggregate values pre-computed by the "server"; total = 5 counts data rows only). Click a group row's arrow to collapse/expand: in-group rows hide/restore locally, **no refetch**.
    </p>
  </div>
</DemoBlock>

Scope note: aggregates reflect the in-group aggregation of the slice the server returns for the current page (when pagination and grouping combine, each group row covers only the slice of the page its data rows live in — whole-group aggregation across pages is the server's call under the `groupBy` query). Export/print still operate on the current-page slice (in-group data rows only; group rows are not exported). Fixed columns (sticky) are not yet wired for group-row aggregate cells (during horizontal scrolling the group row's stickiness does not follow the data rows) — planned as a follow-up increment.

### Server data approach decision table

Pick one of the five approaches by "who holds the full data and who owns sorting/filtering"; do not mix them per-segment:

| Approach | Best for | Who owns sort/filter | Race guard | Error feedback | Recommendation |
| --- | --- | --- | --- | --- | --- |
| External pagination `total` (host-managed fetching) | Pure paged browsing; sorting/filtering done on the client or not needed | Host (listens to `oas-sort-change` / `oas-filter-change` / `oas-page-change` and handles them) | Host-built (sequence/snapshot) | Host-built | Lightweight: enough when the server only slices |
| `row-model="server"` | Enterprise datasets with server-side sorting/filtering that want built-in loading / error bar / retry; with `group-by` set it enters the server-side grouping protocol (host returns group rows) | Server (local transforms skipped entirely; requests carry sortModel / filterValues / groupBy) | Built-in (monotonic requestId + helper write-back validation) | Built-in (error bar + `oas-rows-error` + retry button) | First choice for server-side sort/filter paging |
| `infinite` (infinite scroll + cursor pagination) | Long lists browsed without paging (feeds / logs / result streams), loading the next chunk on scroll; sorting/filtering on the server, total known or unknown | Server (requests carry sortModel / filterValues / cursor; sort/filter changes reset the loaded buffer and refetch the first chunk) | Built-in (monotonic requestId + `appendRows` requestId guarding) | Built-in (error bar + `oas-rows-error` + retry button, shared with server) | First choice for scroll-to-load scenarios (recipe below) |
| windowed (server-side row window) | 100k+ row **scrolling** scenarios: host supplies only the visible-window slice, no paging | Host (component skips local execution and devWarns) | `createWindowedSource` built-in (aborts stale in-flight + coverage checks) | Helper emits `oas-window-error`; no built-in error bar | First choice for scroll virtualization |
| Host-managed event listening | Deeply customized fetching (own cache/merge/SSE push), or combinations the above do not cover | Host fully owns | Host-built | Host-built | Most freedom, most cost |

Mutual exclusion and premise rules: when `row-model="server"` and `windowed` are both set, **windowed wins** (server is ignored) with a one-time devWarn; `infinite` combined with `pagination` — **pagination wins** (existing paging semantics); with `windowed` — **windowed wins**; with `row-model="server"` — **infinite wins** (protocol switches to cursor/load-more with the relaxed `total` premise), each with a one-time devWarn; server activation requires the `total` attribute (falls back to client + one-time devWarn when missing), while **`total` is optional for infinite** (unknown-total scenes declare end-of-data via the host's empty-chunk signal); "partial mixing (sort only the current page)" is wrong semantics and the component provides no such configuration — sorting/filtering lives either entirely on the server (server / infinite) or entirely locally/host-side. Caching dimension: `createServerSource` ships a query-level cache (same query refills directly within its TTL; default 5 minutes, configurable, with SWR / purge / in-flight merging — see "Data-layer caching" above) — **for scenarios that must always hit the server (non-idempotent fetchers, latency-sensitive data) pass `cache: false`**; on the "Host-managed event listening" path the cache is entirely host-built.

Refill-timing note: on the "Host-managed event listening" path, refill **asynchronously** inside event listeners — writing `data` synchronously in the listener callback lags the DOM by one frame due to render-pipeline reentry; the `createServerSource` helper refills asynchronously out of the box and has no such restriction.

### Capability gates (declared per feature under server mode and infinite)

"Cross-full-data" capabilities produce wrong results when executed on the current-page slice — server mode declares them one by one (each devWarns once; judged in the same shape as windowed, with overlapping items marked accordingly). The `infinite` form is **the same mechanism**: its slice scope is the loaded rows (below, "current-page slice" reads as "loaded buffer" for infinite):

| Capability | Server-mode semantics | Compared to windowed |
| --- | --- | --- |
| Export / print | Current-page slice only + devWarn once (not blocking; prevents silent partial export) | Same mechanism (windowed prints the loaded slice, server prints the current-page slice — different slice scope, same mechanism) |
| Summary `summary-scope="all"` | Disabled + devWarn (full-data scope unknown); `scope="page"` page summaries still work | windowed likewise hands summaries to the host (local skipped + devWarn) |
| Grouping `group-by` | Host-side grouping protocol (request `detail.groupBy` + host returns group rows rendered in order; no local grouping, collapse filters locally within the current page) — see the "Server-side grouping" section | windowed likewise hands grouping to the host (local skipped + devWarn) |
| Row drag | Disabled + devWarn (row-order semantics owned by the server) | Also unavailable in virtual windowed (unstable row order in a virtual window; virtual-incompatibility guard) |
| Column drag / `setColumnOrder` | Write-back intercepted + devWarn (column-order semantics owned by the server); settings-panel move buttons disabled in sync | No such gate in windowed (column order is a display-layer semantic, valid within a slice) |
| merge / span-method | Disabled + devWarn | **Same mechanism** (both skip local merging — placeholder rows/slice boundaries corrupt cross-row merges) |
| Fill handle / range selection | Page-relative row semantics (`data-row-index` is the 0-based in-page index); writes only already-loaded rows, never silently extends | Same mechanism (windowed likewise writes only loaded rows, never silently extends) |
| Filter panel candidates | From current-page data (in-page semantics; the panel opens as usual) | Different: in windowed the panel does not open (the host implements full-data filtering via `oas-filter-change`) |
| History (undo) | Records local operations only; invalidated on page change | — |
| Editing | In-page edits are local only and lost on refill after paging (v1 has no server-side edit write-back contract) | — |

**Composable with virtual scroll (`height`)**: the server row model does not exclude virtual scrolling — the page size is the request unit, and in-page rendering goes through the existing virtualization (same mechanism as plain pagination × virtual). Unlike the windowed hybrid model (pixel-driven, splices slices across pages), server mode never splices data across pages — the scroll/render boundary is always the current page.

### Boundaries: column order and edit persistence

- **Column order persistence**: under server mode, `setColumnOrder()` write-backs are intercepted (capability gate) — **programmatic calls that restore persisted column order during host initialization are intercepted too**; the settings panel's move buttons are disabled in sync (`columnReorderGate()` shares the same predicate as the write-back guard). For column-order persistence, manage it on the host (e.g. send the order as a request parameter) or turn off row-model.
- **In-page editing**: edits apply locally only and drafts are lost when a new slice is refilled after paging — v1 provides no server-side edit write-back contract; to persist edits, submit to your server in an `oas-edit` listener and do not rely on cross-page drafts.

## Infinite scroll (infinite + cursor pagination)

> A server-side data shape (same family as `row-model="server"`, cursor-pagination variant): scrolling near the bottom auto-fetches the next chunk and **appends** it — no pager. `total` is **optional** — when the server cannot provide a total, the component runs with `totalKnown=false` and end-of-data is declared by the host's empty-chunk signal. Capability gates mirror server mode (see the gates table above); combined with `row-model="server"`, infinite wins (protocol switches to cursor/load-more).

Two pieces on the component: `infinite` (enable) + optional `total` (provide when known — `aria-rowcount` and the "loaded-full means end" check follow it). On the host side, listen to `oas-rows-request` for the next chunk and refill via `appendRows`:

```html
<oas-table id="table" infinite columns='...' row-key="id"></oas-table>
<script type="module">
  const table = document.getElementById('table')
  table.addEventListener('oas-rows-request', async (e) => {
    const { requestId, cursor: prev, sortModel, filterValues, reason } = e.detail
    const res = await fetchNextChunk({ cursor: prev, sortModel, filterValues, reason }) // host fetching
    table.appendRows(res.rows, { requestId, cursor: res.nextCursor, total: res.total }) // total optional
    // An empty res.rows signals "no more data" — the component stops bottom triggers and shows the end-of-list hint
  })
</script>
```

Request protocol (shared with server mode via `oas-rows-request`):

- `reason` enum: `init` (mount first load) / `sort` / `filter` / `paginate` (under infinite: page-size change only) / `refresh` (`refreshRows()`) / **`load-more`** (bottom-reached next chunk). Sort/filter/page-size changes automatically **reset the loaded buffer** (clearing loaded rows and the cursor) and fetch the first chunk — the user sees the first chunk under the new criteria; `current` does not apply under infinite (never written, not part of the request signature, and a `current` write triggers no request).
- `detail.cursor`: the cursor recorded by the component (the `options.cursor` of the last `appendRows`), echoed back verbatim — the host locates the next chunk by it; absent (undefined) on first entry / after a reset.
- `detail.start` / `detail.end`: the loaded-row count (range semantics N/A, both equal); `detail.totalKnown`: follows the presence of the `total` attribute (false in unknown-total scenes).
- Trigger threshold: scroll position within `max(200px, viewport height × 1.5)` of the bottom; no repeat trigger while a request is in flight; with `totalKnown`, loading up to total counts as end (no more triggers).

Refill channel `appendRows(rows, options?: { cursor?, total?, requestId? })` (distinct from the **replace** semantics of a `data` attribute write):

- `rows` are appended into the loaded buffer (chunk order preserved); **an empty array means "no more data"** — the component records the end signal, stops bottom triggers, and renders the end-of-list hint row (`part="no-more-row"`);
- `options.cursor` is recorded as the current cursor (echoed via `detail.cursor` on the next load-more); `options.total`, when provided, syncs the `total` attribute and `aria-rowcount`;
- `options.requestId` (taken from the event's `detail.requestId`), when provided, enables sequence guarding: mismatches with the in-flight sequence are dropped silently as stale late responses, duplicate same-sequence refills are idempotently ignored (each with a one-time devWarn) — double-listener / late-arrival races are handled by the component; without it the call is a free channel (prefill / manual additions; sequence validation is the host's responsibility);
- A `data` attribute write **resets the loaded buffer** (replace semantics: clears loaded rows, cursor and end signal — prefill/SSR scenes own the first chunk); `refreshRows({ purge: true })` resets the buffer and refetches the first chunk (`reason='refresh'`, clearing the end signal too).

In-flight visuals: with loaded rows > 0 the loading row is **appended after the loaded rows** (reusing `part="loading-row"` and the `loading` structural slot — the takeover protocol matches the full-table loading row); first load / empty buffer uses the full-table loading row. End-of-data state: when `hasMore=false` and loaded rows > 0, a static hint row renders (`part="no-more-row"`, locale-aware text).

The failure channel is shared with server mode: `reportRowsError` (same-sequence validation) → keep old data + `oas-rows-error` + built-in error bar (`role="alert"`, retry button calls `refreshRows()`).

A11y: `aria-rowcount` uses the known total (omitted when unknown — screen readers do not announce a total); `aria-busy` syncs while loading; row `aria-rowindex` = load order + 1.

**Composable with virtual scroll (`height`)**: the loaded buffer goes through the existing virtualized window slicing as a whole (recommended for large datasets; bottom detection uses the scroll container geometry — same threshold for virtual and non-virtual).

Known limitation: the loaded buffer grows linearly with scrolling (virtualization bounds the DOM, not the data buffer) — for very long sessions the host converges it via the end-of-data signal / `refreshRows()`. infinite and windowed are mutually exclusive (windowed wins with a one-time warning), so scenes needing a windowed data buffer should adopt the windowed shape directly.

Fill handle / range selection / filter panel / history / editing all operate with **loaded-row-relative semantics** under infinite (`data-row-index` is the 0-based load order) — same shape as server mode's in-page semantics; see the gates table above.

## Column filter

<DemoBlock title="Column filter (filterable + filter-values controlled)">
  <div style="width: 100%">
    <oas-table id="table-filter" filter-values='{"city":"Shanghai"}' row-key="name" columns='[{"key":"name","title":"Name","filterable":true},{"key":"city","title":"City","filterable":true,"filters":[{"label":"Beijing","value":"Beijing"},{"label":"Shanghai","value":"Shanghai"},{"label":"Shenzhen","value":"Shenzhen"}]},{"key":"age","title":"Age"}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":28,"city":"Shanghai"}]'></oas-table>
    <div style="width: 100%; display: flex; align-items: center; gap: 12px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Click the filter icon in a header to open the option popup; selecting a value filters rows and fires `oas-filter-change`. `filter-values` is the controlled attribute (JSON `{column: value}`; removing or emptying it clears the filter). Current filter: <span id="table-filter-values">none</span>
      <oas-button size="small" onclick="window.clearTableFilter && window.clearTableFilter()">Clear filter</oas-button>
    </div>
  </div>
</DemoBlock>

## Merged cells

<DemoBlock title="Merged cells (merge)">
  <div style="width: 100%">
    <oas-table row-key="name" columns='[{"key":"dept","title":"Dept","merge":true,"align":"center"},{"key":"team","title":"Team","merge":true,"align":"center"},{"key":"name","title":"Name"},{"key":"age","title":"Age"}]' data='[{"dept":"Engineering","team":"Frontend","name":"Alice","age":28},{"dept":"Engineering","team":"Frontend","name":"Bob","age":32},{"dept":"Engineering","team":"Backend","name":"Carol","age":40},{"dept":"Marketing","team":"Marketing","name":"David","age":26},{"dept":"Marketing","team":"Marketing","name":"Eve","age":30}]'></oas-table>
  </div>
</DemoBlock>

`merge: true` merges consecutive rows with the same displayed value in that column into a single rowspan cell (ignored in virtual-scroll mode).

## Controlled Span (span-method)

<DemoBlock title="span-method: explicit rowspan/colspan per cell">
  <div style="width: 100%">
    <oas-table id="table-span" columns='[{"key":"quarter","title":"Quarter"},{"key":"product","title":"Product"},{"key":"sales","title":"Sales","merge":true},{"key":"note","title":"Note"}]' data='[{"id":1,"quarter":"Q1","product":"A","sales":120,"note":"Good start"},{"id":2,"quarter":"Q1","product":"B","sales":120,"note":"Same as above"},{"id":3,"quarter":"Q2","product":"A","sales":98,"note":""},{"id":4,"quarter":"Q2","product":"B","sales":98,"note":"Same as above"}]' row-key="id"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      The quarter column is declared explicitly via spanMethod (Q1 / Q2 each span 2 rows); the sales column uses the column-level merge for same-value merging — the two mechanisms coexist independently per column.
    </p>
  </div>
</DemoBlock>

`span-method` is a property function channel: `(row, column, rowIndex, columnIndex) => [rowspan, colspan] | {rowspan, colspan}`, declaring the merge explicitly per cell; returning `0` means the cell is covered and not rendered (the function declares the coverage). It coexists with the column-level `merge` **independently per column** (rows missing a cell due to an explicit span naturally break that column's merge grouping); it is ignored in virtual-scroll mode (the same fixed-height limitation as `merge`). `rowIndex` counts data rows (0-based, excluding expand content rows) and `columnIndex` follows the effective column order; functions cannot be serialized and do not participate in the attribute / SSR snapshot (same contract as `columns.render`).

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
import { onBeforeUnmount, onMounted } from 'vue'
import '@oas-ui/ui/data/table/auto-height'
import { filterRows, formulaColumn, pivotTable } from '@oas-ui/ui/data/table/advanced'
import { setConditionalFormat } from '@oas-ui/ui/data/table/format'
import { pivotMatrix } from '@oas-ui/ui/data/table/pivot'
import { createFormatter } from '@oas-ui/ui/data/table/value-format'
import { applyQuery, createQueryState } from '@oas-ui/ui/data/table/query'
import { applyViewState, captureViewState, loadViewState, saveViewState } from '@oas-ui/ui/data/table/view'
import { addRangeSelection, applyRangePaste, copyRange, cutRange, enableRangeSelection, fillRange, setRangeSelection } from '@oas-ui/ui/data/table/range'
import { disableHistory, enableHistory, redo, undo } from '@oas-ui/ui/data/table/history'
import { createMasterDetail } from '@oas-ui/ui/data/table/detail'
import { computeRowModel } from '@oas-ui/ui/data/table/model'
import '@oas-ui/ui/data/table/structural-render'

// Structural rendering demo: the registered L3 is activated by the import above;
// wire the four-slot hooks onto #table-structural
const STRUCTURAL_STATUS_COLOR = {
  ok: 'var(--oas-color-success)',
  pending: 'var(--oas-color-warning)',
  off: 'var(--oas-color-text-tertiary)',
}
onMounted(() => {
  const t = document.getElementById('table-structural')
  if (!t) return
  // Data goes through attributes (pre-upgrade safe); structuralRenderers is a property channel,
  // guarded by whenDefined against expando shadowing on unupgraded elements (prop-write-timing rule)
  t.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: 'Task' },
      { key: 'owner', title: 'Owner' },
      { key: 'status', title: 'Status' },
    ]),
  )
  t.setAttribute(
    'data',
    JSON.stringify([
      { name: 'Release prep', owner: 'Alice', status: 'ok' },
      { name: 'Review queue', owner: 'Bob', status: 'pending' },
      { name: 'Archived', owner: 'Carol', status: 'off' },
      { name: 'Regression passed', owner: 'Dave', status: 'ok' },
    ]),
  )
  void customElements.whenDefined('oas-table').then(() => {
    t.structuralRenderers = {
      bodyCell({ el: td, column, row }) {
        if (column.key !== 'status') return
        const dot = document.createElement('i')
        dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${STRUCTURAL_STATUS_COLOR[row.status] ?? 'currentColor'}`
        td.prepend(dot)
      },
      headerCell({ el: th }) {
        const hint = document.createElement('span')
        hint.textContent = ' ⇅'
        hint.style.opacity = '0.45'
        th.append(hint)
      },
      bodyRow({ el: tr }) {
        tr.addEventListener('click', () => {
          const cell = tr.querySelector('td')
          if (!cell) return
          const old = cell.querySelector('.row-badge')
          if (old) {
            old.remove()
            return
          }
          const badge = document.createElement('oas-tag')
          badge.className = 'row-badge'
          badge.setAttribute('size', 'small')
          badge.textContent = '✓'
          cell.prepend(badge)
        })
      },
    }
  })
})

// ctx api query demo: bodyCell takes over the probe column as a "query this row" button - on
// click it queries ctx.api live instead of baking state into the DOM (selection patches do not
// re-run hooks; baked state goes stale, api reads are always fresh)
onMounted(() => {
  const t = document.getElementById('table-structural-api')
  const fb = document.getElementById('table-structural-api-feedback')
  if (!t) return
  t.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: 'Task', editable: true },
      { key: 'owner', title: 'Owner' },
      { key: 'probe', title: 'Row state' },
    ]),
  )
  t.setAttribute(
    'data',
    JSON.stringify([
      { id: 't1', name: 'Release prep', owner: 'Alice' },
      { id: 't2', name: 'Review queue', owner: 'Bob' },
      { id: 't3', name: 'Regression check', owner: 'Carol' },
    ]),
  )
  void customElements.whenDefined('oas-table').then(() => {
    t.structuralRenderers = {
      bodyCell({ el: td, row, column, api }) {
        if (column.key !== 'probe') return
        td.textContent = ''
        const btn = document.createElement('oas-button')
        btn.setAttribute('size', 'small')
        btn.textContent = 'Query row'
        // Results render into a chip container next to the button (the button stays clickable -
        // api re-queries live on every click)
        const result = document.createElement('span')
        result.className = 'probe-result'
        btn.addEventListener('click', () => {
          const key = String(row.id)
          const picked = api.isSelected(key) // live read of the selected attribute
          const editing = api.isEditing(key) // live read of the rendered edit markers
          result.textContent = ''
          const tag = document.createElement('oas-tag')
          tag.setAttribute('type', picked ? 'success' : 'default')
          tag.textContent = picked ? 'selected' : 'not selected'
          result.append(tag, document.createTextNode(' '))
          const editTag = document.createElement('oas-tag')
          editTag.setAttribute('type', editing ? 'warning' : 'default')
          editTag.textContent = editing ? 'editing' : 'not editing'
          result.append(editTag)
          if (fb) fb.textContent = `row ${key}: selected=${picked ? 'yes' : 'no'} - editing=${editing ? 'yes' : 'no'}`
        })
        td.append(btn, result)
      },
    }
  })
})

// validate demo: amount column validated before commit (property-channel function) —
// failure keeps the edit state + inline message + event feedback
onMounted(() => {
  const t = document.getElementById('table-edit-validate')
  const fb = document.getElementById('table-edit-validate-feedback')
  if (!t) return
  t.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'item', title: 'Item', editable: true },
      { key: 'amount', title: 'Amount', editable: true },
    ]),
  )
  t.setAttribute(
    'data',
    JSON.stringify([
      { item: 'Cloud renewal', amount: 1200 },
      { item: 'Domain renewal', amount: 80 },
    ]),
  )
  void customElements.whenDefined('oas-table').then(() => {
    t.columns = [
      { key: 'item', title: 'Item', editable: true },
      {
        key: 'amount',
        title: 'Amount',
        editable: true,
        validate: (v) => (Number(v) > 0 ? '' : 'Amount must be positive'),
      },
    ]
    t.addEventListener('oas-edit-invalid', (e) => {
      const d = e.detail
      if (fb) fb.textContent = `${d.column} = ${d.value} (${d.message ?? 'invalid'})`
    })
    t.addEventListener('oas-edit', () => {
      if (fb) fb.textContent = '—'
    })
  })
})

onMounted(() => {
  // windowed x tree lazy-loading demo: simulates the host's "full org tree" and refeed logic
  const t = document.getElementById('table-wintree')
  const fb = document.getElementById('table-wintree-feedback')
  if (!t) return
  t.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Org' }]))
  const fullTree = {
    engineering: { name: 'Engineering', depth: 0, hasChildren: true, children: ['platform', 'apps'] },
    platform: { name: 'Platform', depth: 1, hasChildren: true, children: ['infra', 'middleware'] },
    apps: { name: 'Apps', depth: 1 },
    infra: { name: 'Infrastructure', depth: 2 },
    middleware: { name: 'Middleware', depth: 2 },
    marketing: { name: 'Marketing', depth: 0, hasChildren: true, children: ['brand'] },
    brand: { name: 'Brand', depth: 1 },
    ops: { name: 'Operations', depth: 0 },
  }
  const expandedSet = new Set()
  const flatSlice = () => {
    const out = []
    const roots = ['engineering', 'marketing', 'ops']
    const walk = (name) => {
      const n = fullTree[name]
      out.push({ name: n.name, depth: n.depth, ...(n.hasChildren ? { hasChildren: true } : {}) })
      if (n.children && expandedSet.has(name)) for (const c of n.children) walk(c)
    }
    for (const r of roots) walk(r)
    return out
  }
  const refeed = () => {
    const slice = flatSlice()
    t.setAttribute('data', JSON.stringify(slice))
    t.setAttribute('total', String(slice.length))
    t.setAttribute('expanded', [...expandedSet].join(','))
    if (fb)
      fb.textContent = `expanded ${expandedSet.size ? [...expandedSet].join(', ') : '(none)'} · total ${slice.length}`
  }
  void customElements.whenDefined('oas-table').then(() => {
    refeed()
    t.addEventListener('oas-expand', (e) => {
      const d = e.detail
      if (d.expanded) expandedSet.add(d.key)
      else expandedSet.delete(d.key)
      refeed() // host refeed
      if (!d.expanded) t.scrollToRow(d.key) // collapse-only anchoring (expand leaves the viewport alone)
    })
  })
})

// Server-side grouping live demo: mock host refills mixed rows per detail.groupBy (group rows +
// in-group data rows, order = server authority). The init request of a statically upgraded tag fires
// before this script runs (the listener is not wired yet) — same "first-screen fallback" as the
// createServerSource helper: refill the first round manually after wiring.
onMounted(() => {
  const t = document.getElementById('table-server-group-live')
  if (!t) return
  const mixedRows = [
    { kind: 'group', groupKey: '研发', groupLabel: '研发部', groupCount: 3, aggregates: { amount: 128 } },
    { key: 'a1', name: '张三', amount: 52, dept: '研发' },
    { key: 'a2', name: '李四', amount: 47, dept: '研发' },
    { key: 'a3', name: '王五', amount: 29, dept: '研发' },
    { kind: 'group', groupKey: '销售', groupLabel: '销售部', groupCount: 2, aggregates: { amount: 85 } },
    { key: 'b1', name: '赵六', amount: 50, dept: '销售' },
    { key: 'b2', name: '钱七', amount: 35, dept: '销售' },
  ]
  // Asynchronous refill (no attribute writes inside the dispatch stack — aligned with real fetch timing)
  const fill = () => setTimeout(() => t.setAttribute('data', JSON.stringify(mixedRows)), 0)
  t.addEventListener('oas-rows-request', fill)
  fill() // first-screen fallback
})

// audit demo: commits recorded; the feedback line queries getCellHistory
onMounted(() => {
  const t = document.getElementById('table-audit')
  const fb = document.getElementById('table-audit-feedback')
  if (!t) return
  t.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'item', title: 'Item', editable: true },
      { key: 'amount', title: 'Amount', editable: true },
    ]),
  )
  t.setAttribute(
    'data',
    JSON.stringify([
      { item: 'Cloud renewal', amount: 1200 },
      { item: 'Domain renewal', amount: 80 },
    ]),
  )
  void customElements.whenDefined('oas-table').then(async () => {
    const { createAuditLog } = await import('@oas-ui/ui/data/table/audit')
    const audit = createAuditLog(t)
    t.addEventListener('oas-edit', (e) => {
      const d = e.detail
      const h = audit.getCellHistory(d.key, d.column)
      const last = h[h.length - 1]
      if (fb && last) fb.textContent = `${d.column}: ${h.length} edit(s) · latest ${last.oldValue} → ${last.value}`
    })
  })
})

// column-virtual demo: 60 metric columns × 40 rows (client-side injection for large data)
onMounted(() => {
  const cols = [{ key: 'name', title: 'Name', fixed: 'left', width: '100px' }]
  const cvRows = Array.from({ length: 40 }, (_, r) => ({ name: `Employee ${r + 1}`, level: `P${(r % 9) + 1}` }))
  for (let i = 1; i <= 60; i++) {
    cols.push({ key: `c${i}`, title: `Metric ${i}`, width: '110px' })
    cvRows.forEach((row, r) => (row[`c${i}`] = `${i}-${r}`))
  }
  cols.push({ key: 'level', title: 'Level', fixed: 'right', width: '80px' })
  const el = document.querySelector('#table-col-virtual')
  if (el) {
    el.setAttribute('columns', JSON.stringify(cols))
    el.setAttribute('data', JSON.stringify(cvRows))
  }
})

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
  // Cell template demo: inject templates via the property channel (JS-built HTMLTemplateElement) —
  // keeps template content out of the md/Vue compile pipeline (its handling of <template> children
  // differs between dev and production builds and can empty the template).
  // Wait for the element to be defined before assigning: the page's onMounted runs before the theme
  // registers components (child-before-parent order); assigning a property pre-upgrade creates an
  // expando that shadows the class accessor
  const nameTpl = document.createElement('template')
  nameTpl.innerHTML = `<span style="background:#eef2ff;color:#4f46e5;border-radius:4px;padding:1px 6px;font-size:12px">{{row.name}}</span>`
  const priceTpl = document.createElement('template')
  priceTpl.innerHTML = `<b style="color: var(--oas-color-danger)">¥ {{row.price}}</b>`
  customElements.whenDefined('oas-table').then(() => {
    const tplTable = document.getElementById('cell-tpl-table')
    if (tplTable) {
      tplTable.columns = [
        { key: 'name', title: 'Name', cellTemplate: nameTpl },
        { key: 'price', title: 'Price', cellTemplate: priceTpl },
        { key: 'city', title: 'City' },
      ]
    }
  })
  // Sort and click event demo
  const table = document.querySelector('#table-event')
  table?.addEventListener('oas-sort-change', (e) => {
    const { key, order } = e.detail
    document.querySelector('#table-sort').textContent = order ? `${key} ${order}` : 'none'
  })
  table?.addEventListener('oas-row-click', (e) => {
    document.querySelector('#table-row').textContent = e.detail.row.name ?? e.detail.key
  })

  // Row single-select demo: oas-check feedback (single-select detail.keys holds at most one value)
  const radioTable = document.querySelector('#table-radio')
  radioTable?.addEventListener('oas-check', (e) => {
    const keys = e.detail.keys
    const el = document.querySelector('#table-radio-selected')
    if (el) el.textContent = keys.length ? keys.join(', ') : 'none'
  })

  // Empty slot demo: click to add a row (the empty state is visibly replaced by the row)
  window.tableEmptySlotAdd = () => {
    document.querySelector('#table-empty-slot')?.setAttribute('data', JSON.stringify([{ name: 'Newcomer', age: 28 }]))
  }

  // Property function channels (row-class / span-method): assign only after the element is
  // registered — assigning before the upgrade turns the property into an expando shadowing
  // the class accessor (same reason as the cellTemplate demo above)
  customElements.whenDefined('oas-table').then(() => {
    const rowClassTable = document.querySelector('#table-row-class')
    if (rowClassTable) {
      rowClassTable.rowClass = (row) =>
        row.status === 'disabled' ? 'row-disabled' : row.status === 'over' ? 'row-warn' : ''
    }
    const spanTable = document.querySelector('#table-span')
    if (spanTable) {
      spanTable.spanMethod = (_row, _column, rowIndex, columnIndex) => {
        if (columnIndex !== 0) return undefined
        return rowIndex === 0 || rowIndex === 2 ? [2, 1] : [0, 0]
      }
    }
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
  // (docs load the full entry @oas-ui/ui, which explicitly bundles editing; consumers of the
  //  default entry data/table must explicitly `import '@oas-ui/ui/data/table/edit'` to
  //  enable editing — otherwise the table stays silently non-editable)
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

  // External data pagination (total): data holds only the current page slice, host swaps data on page turn (simulated server)
  const totalTable = document.querySelector('#table-total')
  const TOTAL_ROWS = 47
  const loadTotalPage = (page, size = 5) => {
    const start = (page - 1) * size
    const rows = Array.from({ length: Math.max(0, Math.min(size, TOTAL_ROWS - start)) }, (_, i) => ({
      id: start + i + 1,
      name: `Member ${start + i + 1}`,
      age: 22 + ((start + i) % 20),
    }))
    totalTable?.setAttribute('data', JSON.stringify(rows))
    const pageEl = document.querySelector('#table-total-page')
    const rowsEl = document.querySelector('#table-total-rows')
    if (pageEl) pageEl.textContent = String(page)
    if (rowsEl) rowsEl.textContent = String(rows.length)
  }
  totalTable?.addEventListener('oas-page-change', (e) => loadTotalPage(e.detail.page, e.detail.pageSize))
  loadTotalPage(1)

  // Column filter: current filter feedback (renders the initial preset too + clear button)
  const filterTable = document.querySelector('#table-filter')
  const renderFilterFeedback = () => {
    let vals = []
    try {
      const raw = filterTable?.getAttribute('filter-values')
      vals = raw ? Object.values(JSON.parse(raw)) : []
    } catch {}
    document.querySelector('#table-filter-values').textContent = vals.length ? vals.join(', ') : 'none'
  }
  filterTable?.addEventListener('oas-filter-change', renderFilterFeedback)
  window.clearTableFilter = () => {
    filterTable?.removeAttribute('filter-values')
    renderFilterFeedback()
  }
  renderFilterFeedback()

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

  // Header visibility demo: toggle the show-header attribute
  const showHeaderTable = document.querySelector('#table-show-header')
  const showHeaderBtn = document.querySelector('#table-show-header-toggle')
  showHeaderBtn?.addEventListener('click', () => {
    const hidden = showHeaderTable?.getAttribute('show-header') === 'false'
    if (hidden) {
      showHeaderTable?.setAttribute('show-header', 'true')
      showHeaderBtn.textContent = 'Hide header'
    } else {
      showHeaderTable?.setAttribute('show-header', 'false')
      showHeaderBtn.textContent = 'Show header'
    }
  })

  // P2 batch demos: capped-height data (12 rows) + rowExpandable predicate + filter icon slot + cell/dblclick feedback
  const maxHeightTable = document.querySelector('#table-max-height')
  if (maxHeightTable) {
    const mhRows = TABLE_ROWS.slice(0, 12).map((r) => ({ name: r.name, age: r.age, city: r.city }))
    maxHeightTable.setAttribute('data', JSON.stringify(mhRows))
  }
  customElements.whenDefined('oas-table').then(() => {
    const expandableTable = document.querySelector('#table-row-expandable')
    if (expandableTable) {
      expandableTable.rowExpandable = (row) => row.key !== 'c'
    }
  })
  const filterIconTable = document.querySelector('#table-filter-icon')
  if (filterIconTable) {
    const tpl = document.createElement('template')
    tpl.innerHTML = '<oas-icon name="search" style="font-size: 12px"></oas-icon>'
    tpl.setAttribute('slot', 'filter-icon')
    filterIconTable.appendChild(tpl)
  }
  const cellEventTable = document.querySelector('#table-cell-events')
  cellEventTable?.addEventListener('oas-cell-click', (e) => {
    const { column, value } = e.detail
    const el = document.querySelector('#table-cell-feedback')
    if (el) el.textContent = `${column} = ${value}`
  })
  cellEventTable?.addEventListener('oas-row-dblclick', (e) => {
    const el = document.querySelector('#table-dbl-feedback')
    if (el) el.textContent = e.detail.row.name ?? e.detail.rowIndex
  })

  // D-class demos: export (CSV / Excel) feedback
  const exportTable = document.querySelector('#table-export')
  exportTable?.addEventListener('oas-export', (e) => {
    const { format, fileName, rowCount } = e.detail
    const el = document.querySelector('#table-export-feedback')
    if (el) el.textContent = `${fileName} · ${format.toUpperCase()} · ${rowCount} rows`
  })

  // Data import demo (table/import helper): file picker + clipboard entries, results land in the table
  {
    const importTable = document.querySelector('#table-import-demo')
    const feedback = document.querySelector('#table-import-feedback')
    if (importTable && feedback) {
      const apply = async (r, source) => {
        await customElements.whenDefined('oas-table')
        importTable.columns = r.columns.map((key) => ({ key, title: key }))
        importTable.data = r.records
        const skipped = r.skippedRows + r.skippedCells
        const delim = r.delimiter === '\t' ? 'TAB' : r.delimiter
        feedback.textContent =
          `Imported ${r.rowCount} rows × ${r.columns.length} columns from ${source} (delimiter ${delim}` +
          (skipped > 0 ? `; ${r.skippedRows} blank rows skipped, ${r.skippedCells} cells padded/truncated)` : ')')
      }
      document.querySelector('#table-import-file')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const { importTableFile } = await import('@oas-ui/ui/data/table/import')
        apply(await importTableFile(file), 'file')
      })
      document.querySelector('#table-import-paste')?.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText()
          if (!text) {
            feedback.textContent = 'Clipboard is empty or unreadable — copy some TSV/CSV text first'
            return
          }
          const { importTableText } = await import('@oas-ui/ui/data/table/import')
          apply(importTableText(text), 'clipboard')
        } catch {
          feedback.textContent = 'Clipboard is unreadable (browser permission) — use the file picker instead'
        }
      })
    }
  }

  // Grid navigation demo: cell click feedback (keyboard roaming shows the cell focus ring)
  const gridNavTable = document.querySelector('#table-grid-nav')
  gridNavTable?.addEventListener('oas-cell-click', (e) => {
    const el = document.querySelector('#table-grid-nav-feedback')
    if (el) el.textContent = `${e.detail.row.name} · ${e.detail.column}`
  })

  // Row drag demo: host-controlled reorder (the component only emits oas-row-reorder)
  const rowDragTable = document.querySelector('#table-row-drag')
  rowDragTable?.addEventListener('oas-row-reorder', (e) => {
    const { from, to } = e.detail
    const rows = JSON.parse(rowDragTable.getAttribute('data') ?? '[]')
    const [moved] = rows.splice(from, 1)
    rows.splice(to, 0, moved)
    rowDragTable.setAttribute('data', JSON.stringify(rows))
    const el = document.querySelector('#table-row-drag-feedback')
    if (el) el.textContent = `${from} → ${to}`
  })

  // Advanced entry demo: formula column + query filter + pivot (assign properties after upgrade)
  customElements.whenDefined('oas-table').then(() => {
    const advancedSource = document.querySelector('#table-advanced-source')
    const advancedPivot = document.querySelector('#table-advanced-pivot')
    const advancedStatus = document.querySelector('#table-advanced-status')
    const advancedSales = [
      { region: 'East', product: 'A', amount: 120, qty: 3 },
      { region: 'East', product: 'B', amount: 80, qty: 2 },
      { region: 'South', product: 'A', amount: 150, qty: 1 },
      { region: 'South', product: 'B', amount: 60, qty: 4 },
      { region: 'North', product: 'A', amount: 90, qty: 2 },
      { region: 'North', product: 'B', amount: 110, qty: 3 },
    ]
    if (advancedSource) {
      advancedSource.columns = [
        { key: 'region', title: 'Region' },
        { key: 'product', title: 'Product' },
        { key: 'amount', title: 'Price', align: 'right', type: 'number' },
        { key: 'qty', title: 'Qty', align: 'right', type: 'number' },
        formulaColumn({
          key: 'total',
          title: 'Total',
          expression: 'amount * qty',
          align: 'right',
          format: (value) => `$${value}`,
        }),
      ]
      advancedSource.data = advancedSales
      let advancedFiltered = false
      document.querySelector('#table-advanced-filter')?.addEventListener('click', () => {
        advancedFiltered = !advancedFiltered
        const rows = advancedFiltered
          ? filterRows(advancedSales, { field: 'amount', op: 'gte', value: 100 })
          : advancedSales
        advancedSource.data = rows
        document.querySelector('#table-advanced-filter')?.setAttribute('aria-pressed', String(advancedFiltered))
        if (advancedStatus) {
          advancedStatus.textContent = advancedFiltered
            ? `Amount ≥ 100: ${rows.length} rows`
            : `All ${rows.length} rows`
        }
      })
    }
    if (advancedPivot) {
      const result = pivotTable({
        rows: advancedSales,
        rowField: 'region',
        columnField: 'product',
        valueField: 'qty',
        rowLabel: 'Region',
        totalLabel: 'Total',
      })
      advancedPivot.columns = result.columns
      advancedPivot.data = result.data
    }
  })

  // Pro: conditional formatting + view state
  const proTable = document.querySelector('#table-pro')
  const proStatus = document.querySelector('#table-pro-status')
  const proPanel = document.querySelector('#table-pro-detail')
  const proViewAdapter = {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  }
  let proSaved = null
  let proDetail = null
  if (proTable) {
    customElements.whenDefined('oas-table').then(() => {
      proSaved = captureViewState(proTable)
      enableRangeSelection(proTable)
      enableHistory(proTable)
      if (proPanel) {
        proDetail = createMasterDetail(proTable, {
          panel: proPanel,
          label: 'Row details',
          emptyText: 'Click a row to see details; Ctrl/Cmd+C copies the selection',
          render: (detail) => `${detail.row.name} · ${detail.row.team} · amount ${detail.row.amount}`,
        })
      }
    })
    proTable.addEventListener('oas-range-change', (event) => {
      const detail = event.detail
      if (!proStatus) return
      if (!detail) {
        proStatus.textContent = 'Selection cleared'
        return
      }
      const rows = detail.end.row - detail.start.row + 1
      proStatus.textContent = `${rows} row(s) · ${detail.start.col} → ${detail.end.col}`
    })
    proTable.addEventListener('oas-range-paste', (event) => {
      if (proStatus) proStatus.textContent = `Paste event: ${event.detail.rows.length} row(s) (host writes data)`
    })
  }
  document.querySelector('#table-pro-format')?.addEventListener('click', () => {
    if (!proTable) return
    setConditionalFormat(proTable, [
      {
        field: 'amount',
        op: 'gte',
        value: 100,
        style: { color: '#b91c1c', backgroundColor: '#fef2f2', className: 'is-high' },
      },
    ])
  })
  document.querySelector('#table-pro-reset')?.addEventListener('click', () => {
    if (!proTable) return
    if (proSaved) applyViewState(proTable, proSaved)
    setConditionalFormat(proTable, [])
  })
  document.querySelector('#table-pro-range')?.addEventListener('click', () => {
    if (!proTable) return
    setRangeSelection(proTable, { row: 0, col: 'name' }, { row: 1, col: 'team' })
  })
  document.querySelector('#table-pro-multi')?.addEventListener('click', () => {
    if (!proTable) return
    setRangeSelection(proTable, { row: 0, col: 'name' })
    addRangeSelection(proTable, { row: 2, col: 'team' })
    if (proStatus) proStatus.textContent = 'Two selections: Alpha name + Gamma team'
  })
  document.querySelector('#table-pro-cut')?.addEventListener('click', async () => {
    if (!proTable) return
    const text = await cutRange(proTable)
    if (proStatus) proStatus.textContent = text ? `Cut: ${text.replaceAll('\n', ' / ')}` : 'Select a range first'
  })
  document.querySelector('#table-pro-paste')?.addEventListener('click', () => {
    if (!proTable) return
    setRangeSelection(proTable, { row: 0, col: 'name' }, { row: 1, col: 'team' })
    const changed = applyRangePaste(proTable, 'AlphaX\t130\nBetaX\t90')
    if (proStatus) proStatus.textContent = `Wrote back ${changed} cells (oas-range-write)`
  })
  document.querySelector('#table-pro-fill')?.addEventListener('click', () => {
    if (!proTable) return
    setRangeSelection(proTable, { row: 0, col: 'amount' }, { row: 2, col: 'amount' })
    const changed = fillRange(proTable, { mode: 'series', cells: 1 })
    if (proStatus) proStatus.textContent = `Series-filled ${changed} cells`
  })
  document.querySelector('#table-pro-save')?.addEventListener('click', () => {
    if (!proTable) return
    if (proStatus) proStatus.textContent = saveViewState(proTable, proViewAdapter) ? 'View saved to localStorage' : 'Save failed'
  })
  document.querySelector('#table-pro-load')?.addEventListener('click', () => {
    if (!proTable) return
    if (proStatus) proStatus.textContent = loadViewState(proTable, proViewAdapter) ? 'View restored' : 'No view to restore'
  })
  document.querySelector('#table-pro-detail-key')?.addEventListener('click', () => {
    if (proDetail) proDetail.selectByKey('c')
  })
  document.querySelector('#table-pro-detail-close')?.addEventListener('click', () => {
    if (proDetail) proDetail.close()
  })
  document.querySelector('#table-pro-copy')?.addEventListener('click', async () => {
    if (!proTable) return
    const text = await copyRange(proTable)
    if (proStatus) proStatus.textContent = text ? `Copied: ${text.replaceAll('\n', ' / ')}` : 'Select a range first'
  })
  document.querySelector('#table-pro-undo')?.addEventListener('click', () => {
    if (proTable && proStatus) proStatus.textContent = undo(proTable) ? 'Undone' : 'Nothing to undo'
  })
  document.querySelector('#table-pro-redo')?.addEventListener('click', () => {
    if (proTable && proStatus) proStatus.textContent = redo(proTable) ? 'Redone' : 'Nothing to redo'
  })
  onBeforeUnmount(() => {
    proDetail?.destroy()
    if (proTable) disableHistory(proTable)
  })
})

// —— Pro helper subpaths: pivot matrix / value formatting / query state ——
const PIVOT_SALES = [
  { region: 'East', product: 'Phone', amount: 1200 },
  { region: 'East', product: 'Earbuds', amount: 320 },
  { region: 'North', product: 'Phone', amount: 980 },
  { region: 'North', product: 'Earbuds', amount: 260 },
  { region: 'South', product: 'Phone', amount: 640 },
  { region: 'South', product: 'Tablet', amount: 1500 },
]

onMounted(() => {
  const table = document.querySelector('#table-pivot-helper')
  if (!table) return
  // Empty values / missing combinations become null in the matrix; this demo only renders it
  const matrix = pivotMatrix(PIVOT_SALES, {
    rows: ['region'],
    columns: ['product'],
    values: [{ field: 'amount', aggregate: 'sum', alias: 'Sales' }],
    totals: true,
  })
  const columns = [
    { key: 'row', title: 'Region' },
    ...matrix.columnHeaders.map((header, index) => ({
      key: `pivot-${index}`,
      title: header.join(' / '),
      align: 'right',
    })),
    { key: 'row-total', title: 'Total', align: 'right' },
  ]
  const data = matrix.rowHeaders.map((header, rowIndex) => {
    const row = { row: header.join(' / ') }
    matrix.cells[rowIndex]?.forEach((value, colIndex) => {
      row[`pivot-${colIndex}`] = value == null ? '—' : String(value)
    })
    row['row-total'] = matrix.grandColumn?.[rowIndex]?.[0] ?? '—'
    return row
  })
  if (matrix.grandRow) {
    const total = { row: 'Total' }
    matrix.grandRow.forEach((value, colIndex) => {
      total[`pivot-${colIndex}`] = value == null ? '—' : String(value)
    })
    total['row-total'] = matrix.grandTotal?.[0] ?? '—'
    data.push(total)
  }
  table.setAttribute('columns', JSON.stringify(columns))
  table.setAttribute('data', JSON.stringify(data))
})

onMounted(() => {
  const table = document.querySelector('#table-value-format')
  if (!table) return
  const money = createFormatter({ type: 'number', precision: 2, group: true, prefix: '$' })
  const percent = createFormatter({ type: 'number', percent: true, precision: 1 })
  const date = createFormatter({ type: 'date', pattern: 'YYYY-MM-DD' })
  const note = createFormatter({ type: 'text', ellipsis: 12 })
  const columns = [
    { key: 'name', title: 'Project' },
    { key: 'budget', title: 'Budget', align: 'right', render: (row) => money(row.budget) },
    { key: 'rate', title: 'Progress', align: 'right', render: (row) => percent(row.rate) },
    { key: 'due', title: 'Due', render: (row) => date(row.due) },
    { key: 'note', title: 'Note', render: (row) => note(row.note) },
  ]
  const data = [
    { name: 'Site redesign', budget: 128000, rate: 0.62, due: '2026-03-18', note: 'Includes responsive work and visual QA' },
    { name: 'Analytics board', budget: 45600, rate: 0.35, due: '2026-04-02', note: 'Metric definitions pending sign-off' },
    { name: 'Permission hub', budget: 98700.5, rate: 0.9, due: '2026-02-27', note: 'Rollout completed' },
  ]
  // render is a function, so it must go through the property channel; wait for registration to avoid shadowing accessors
  customElements.whenDefined('oas-table').then(() => {
    table.columns = columns
    table.data = data
  })
})

onMounted(() => {
  const table = document.querySelector('#table-query-helper')
  const status = document.querySelector('#table-query-status')
  if (!table) return
  const ORDERS = [
    { id: 'A-1001', customer: 'Nova Tech', amount: 1280, due: '2026-03-12' },
    { id: 'A-1002', customer: 'Cedar Data', amount: 96, due: '2026-03-02' },
    { id: 'A-1003', customer: 'Longwind Mfg', amount: 540, due: '2026-03-21' },
    { id: 'A-1004', customer: 'Northshore Design', amount: 88, due: '2026-02-26' },
    { id: 'A-1005', customer: 'Greenfield Agri', amount: 320, due: '2026-03-08' },
    { id: 'A-1006', customer: 'Farhill Logistics', amount: 1750, due: '2026-04-01' },
    { id: 'A-1007', customer: 'Sunbeam Media', amount: 210, due: '2026-03-15' },
  ]
  const PAGE_SIZE = 3
  let state = createQueryState({ page: { current: 1, pageSize: PAGE_SIZE } })
  const totalOf = () => applyQuery(ORDERS, { filter: state.query.filter, sort: state.query.sort }).length
  const render = () => {
    const rows = applyQuery(ORDERS, state.query)
    table.setAttribute('data', JSON.stringify(rows))
    if (status) {
      const current = state.page?.current ?? 1
      status.textContent = `Page ${current} · ${totalOf()} rows (${rows.length} shown)`
    }
  }
  table.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'id', title: 'Order' },
      { key: 'customer', title: 'Customer' },
      { key: 'amount', title: 'Amount', align: 'right' },
      { key: 'due', title: 'Due' },
    ]),
  )
  render()

  const highButton = document.querySelector('#table-query-high')
  highButton?.addEventListener('click', () => {
    const pressed = highButton.getAttribute('aria-pressed') === 'true'
    highButton.setAttribute('aria-pressed', String(!pressed))
    state = pressed
      ? state.setFilter(null)
      : state.setFilter({ combinator: 'and', filters: [{ field: 'amount', op: 'gte', value: 300 }] })
    state = state.setPage({ current: 1 })
    render()
  })
  const sortButton = document.querySelector('#table-query-sort')
  sortButton?.addEventListener('click', () => {
    const desc = sortButton.getAttribute('aria-pressed') === 'true'
    sortButton.setAttribute('aria-pressed', String(!desc))
    state = state.addSort('due', desc ? 'asc' : 'desc')
    render()
  })
  const nextButton = document.querySelector('#table-query-next')
  nextButton?.addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(totalOf() / PAGE_SIZE))
    const current = state.page?.current ?? 1
    state = state.setPage({ current: (current % pages) + 1 })
    render()
  })
})

// —— Headless data layer demo: computeRowModel computes the row model,
// the table only renders the current page slice ——
// (filtering / sorting / pagination are all done by the pure-function pipeline;
// the same implementation as the component's built-in row model, identical row sets and order)
const HEADLESS_ORDERS = [
  { id: 'B-2001', customer: 'Guanlan Travel', amount: 640, dept: 'East' },
  { id: 'B-2002', customer: 'Luming Lodge', amount: 1280, dept: 'North' },
  { id: 'B-2003', customer: 'Tinglan House', amount: 96, dept: 'East' },
  { id: 'B-2004', customer: 'Songjian Inn', amount: 540, dept: 'South' },
  { id: 'B-2005', customer: 'Zhuli Studio', amount: 320, dept: 'North' },
  { id: 'B-2006', customer: 'Yunqi Stay', amount: 1750, dept: 'East' },
  { id: 'B-2007', customer: 'Banshan Books', amount: 210, dept: 'South' },
]
onMounted(() => {
  const table = document.querySelector('#table-headless')
  const status = document.querySelector('#table-headless-status')
  if (!table) return
  const PAGE_SIZE = 3
  let current = 1
  let order = null // null = insertion order; 'desc' = amount descending
  table.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'id', title: 'Order' },
      { key: 'customer', title: 'Customer' },
      { key: 'amount', title: 'Amount', align: 'right' },
      { key: 'dept', title: 'Region' },
    ]),
  )
  const buildInput = () => ({
    data: HEADLESS_ORDERS,
    columns: [{ key: 'amount', type: 'number' }],
    sorters: order ? [{ key: 'amount', order }] : [],
    pagination: { current, pageSize: PAGE_SIZE },
    rowKey: 'id',
  })
  const render = () => {
    const model = computeRowModel(buildInput())
    if (model.clamped) current = model.clampedCurrent // write the clamp suggestion back to our own state
    table.setAttribute('data', JSON.stringify(model.pageRows))
    if (status) {
      status.textContent = `Page ${current} / ${model.pageCount} · ${model.total} rows total (showing ${model.pageRows.length})`
    }
  }
  render()
  document.querySelector('#table-headless-sort')?.addEventListener('click', () => {
    const pressed = document.querySelector('#table-headless-sort').getAttribute('aria-pressed') === 'true'
    document.querySelector('#table-headless-sort').setAttribute('aria-pressed', String(!pressed))
    order = pressed ? null : 'desc'
    current = 1
    render()
  })
  document.querySelector('#table-headless-page')?.addEventListener('click', () => {
    const model = computeRowModel(buildInput())
    current = (current % model.pageCount) + 1
    render()
  })
})

// —— Fill handle demo: diamond at the active selection's corner; auto semantics
// (single-value copy / numeric first-diff series / date day-step / cyclic tiling) ——
onMounted(() => {
  const fillTable = document.querySelector('#table-fill')
  if (!fillTable) return
  const fillStatus = document.querySelector('#table-fill-status')
  void customElements.whenDefined('oas-table').then(() => {
    enableRangeSelection(fillTable)
  })
  fillTable.addEventListener('oas-range-write', (event) => {
    const detail = event.detail
    if (detail.kind === 'fill' && fillStatus) {
      fillStatus.textContent = `Filled ${detail.changes.length} cells (oas-range-write · one undo transaction)`
    }
  })
  fillTable.addEventListener('oas-range-change', (event) => {
    if (!event.detail && fillStatus) fillStatus.textContent = 'Selection cleared'
  })
  document.querySelector('#table-fill-select')?.addEventListener('click', () => {
    setRangeSelection(fillTable, { row: 0, col: 'day' }, { row: 1, col: 'owner' })
  })
  document.querySelector('#table-fill-off')?.addEventListener('click', () => {
    fillTable.setAttribute('fill-handle', 'false')
    if (fillStatus) fillStatus.textContent = 'Fill handle disabled (fill-handle="false")'
  })
  document.querySelector('#table-fill-on')?.addEventListener('click', () => {
    fillTable.removeAttribute('fill-handle')
    if (fillStatus) fillStatus.textContent = 'Fill handle re-enabled — select a range and drag its bottom-right corner'
  })
})
</script>

## Header visibility

`show-header` toggles the table header (defaults to `true`, current behavior). Set it to `"false"` to render without the header row — column configuration still aligns the data cells. Useful for pure data listings or pages that already render their own title row above the table.

<DemoBlock title="show-header=false (toggleable)">
  <div style="width: 100%">
    <oas-table id="table-show-header" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' data='[{"name":"Zhang San","age":30,"city":"Beijing"},{"name":"Li Si","age":25,"city":"Shanghai"},{"name":"Wang Wu","age":35,"city":"Shenzhen"}]' row-key="name"></oas-table>
    <div style="margin-top: var(--oas-space-3)">
      <oas-button size="small" id="table-show-header-toggle">Hide header</oas-button>
    </div>
  </div>
</DemoBlock>

## Table layout (table-layout)

`table-layout="fixed"` passes through to the inner table: column widths follow the declared `width` strictly (long content wraps/truncates instead of widening the column). By default nothing is passed through (the browser's `auto` baseline — columns adapt to content).

<DemoBlock title="table-layout=fixed (strict column widths)">
  <div style="width: 100%">
    <oas-table table-layout="fixed" columns='[{"key":"name","title":"Name","width":"25%"},{"key":"position","title":"Position","width":"25%"},{"key":"duty","title":"Duties"}]' data='[{"name":"Zhang San","position":"Frontend Engineer","duty":"Owns component library design and rendering performance, contributes to the design system."},{"name":"Li Si","position":"Product Manager","duty":"Leads requirement reviews and release planning, coordinates cross-team resources."}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## Row hover switch (hover)

`hover="false"` turns off the row hover background (default on). Useful when the row content carries its own interactive states and the full-row background change is unwanted. Purely visual — row click / selection behavior is unaffected.

<DemoBlock title="Default hover vs hover=false">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <div>
      <p style="margin: 0 0 var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Default (hover on)</p>
      <oas-table columns='[{"key":"name","title":"Name"},{"key":"city","title":"City"}]' data='[{"name":"Zhang San","city":"Beijing"},{"name":"Li Si","city":"Shanghai"}]' row-key="name"></oas-table>
    </div>
    <div>
      <p style="margin: 0 0 var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">hover=&quot;false&quot; (off)</p>
      <oas-table hover="false" columns='[{"key":"name","title":"Name"},{"key":"city","title":"City"}]' data='[{"name":"Zhang San","city":"Beijing"},{"name":"Li Si","city":"Shanghai"}]' row-key="name"></oas-table>
    </div>
  </div>
</DemoBlock>

## Tree indent (indent-size)

`indent-size` controls the per-level indent of tree data in px (default 24). Use it for compact hierarchies or deeper trees.

<DemoBlock title="indent-size=32 (wider per-level indent)">
  <div style="width: 100%">
    <oas-table indent-size="32" columns='[{"key":"name","title":"Department / Member"},{"key":"city","title":"City"}]' data='[{"key":"r1","name":"R&D","city":"—","children":[{"key":"r1-1","name":"Frontend Team","city":"Beijing","children":[{"key":"r1-1-1","name":"Zhang San","city":"Beijing"}]},{"key":"r1-2","name":"Backend Team","city":"Shenzhen"}]}]' expanded="r1,r1-1" row-key="name"></oas-table>
  </div>
</DemoBlock>

## Row expand predicate (row-expandable)

The `rowExpandable` property (function channel) decides per row whether the tail expand button renders: returning `false` omits the button while the placeholder cell is kept so column alignment stays intact.

<DemoBlock title="Only rows with a full profile are expandable">
  <div style="width: 100%">
    <oas-table id="table-row-expandable" columns='[{"key":"name","title":"Name"},{"key":"city","title":"City"}]' data='[{"key":"a","name":"Zhang San","city":"Beijing","expand":"<div>Emp. 1001 · joined 2021</div>"},{"key":"b","name":"Li Si","city":"Shanghai","expand":"<div>Emp. 1002 · joined 2022</div>"},{"key":"c","name":"Wang Wu","city":"Shenzhen"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">Wang Wu's profile is incomplete (rowExpandable returns false), so no expand button.</p>
  </div>
</DemoBlock>

## Capped height scrolling (max-height)

`max-height` caps the table body scroll container (numbers are px; CSS values like `50vh` pass through): overflowing content scrolls inside while the sticky header pins to the top of the container. Use it for lightweight capping; use `height` for virtual scrolling (ten-thousand-row scale).

<DemoBlock title="max-height=200 (sticky header)">
  <div style="width: 100%">
    <oas-table id="table-max-height" max-height="200" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## Custom filter icon (filter-icon slot)

The filter trigger icon in a filterable column header can be customized via `slot="filter-icon"` (a `<template>` or a plain element); the default is the built-in filter glyph.

<DemoBlock title="Custom filter icon via template">
  <div style="width: 100%">
    <oas-table id="table-filter-icon" columns='[{"key":"name","title":"Name","filterable":true},{"key":"city","title":"City"}]' data='[{"name":"Zhang San","city":"Beijing"},{"name":"Li Si","city":"Shanghai"},{"name":"Wang Wu","city":"Shenzhen"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## Cell & double-click events (oas-cell-click / oas-row-dblclick)

Clicking a data cell dispatches `oas-cell-click` (detail: `row / column / value / rowIndex / columnIndex`); double-clicking a data row dispatches `oas-row-dblclick` (detail: `row / rowIndex`). Clicks and double-clicks landing on interactive hosts inside the row (buttons, links, form controls) do not dispatch — the same exclusion list as row selection.

<DemoBlock title="Cell click / row double-click feedback">
  <div style="width: 100%">
    <oas-table id="table-cell-events" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' data='[{"name":"Zhang San","age":30,"city":"Beijing"},{"name":"Li Si","age":25,"city":"Shanghai"},{"name":"Wang Wu","age":35,"city":"Shenzhen"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      Cell click: <span id="table-cell-feedback">—</span> · Row double-click: <span id="table-dbl-feedback">—</span>
    </p>
  </div>
</DemoBlock>

## Export CSV / Excel (exportable)

`exportable` renders export buttons in a toolbar above the table (default: CSV; `export-format="excel"` switches to Excel, `"csv,excel"` shows both). The exported range is the header plus the **currently visible data rows** (after filtering / sorting / pagination slicing; virtual scrolling exports the full rendered set): `actions` columns are skipped, `serialNumber` columns export the row index, and `select` editors export the option label. CSV follows RFC 4180 escaping with a UTF-8 BOM; Excel uses SpreadsheetML (`.xls`). `export-file-name` sets the file name (default `export`). You can also call `table.exportData('csv' | 'excel')` programmatically — both the button and the method dispatch `oas-export` (detail `{ format, fileName, rowCount }`).

<DemoBlock title="Export CSV / Excel (click to really download)">
  <div style="width: 100%">
    <oas-table id="table-export" exportable export-format="csv,excel" export-file-name="employees" columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"},{"key":"note","title":"Note"}]' data='[{"name":"Alice","age":30,"city":"Beijing","note":"Frontend, 5 yrs"},{"name":"Bob","age":25,"city":"Shanghai","note":"Says \"hi\""},{"name":"Carol","age":35,"city":"Shenzhen","note":"Backend"},{"name":"David","age":28,"city":"Hangzhou","note":"Design"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">Last export: <span id="table-export-feedback">—</span></p>
  </div>
</DemoBlock>

## Data import (table/import, helper L3)

`@oas-ui/ui/data/table/import` provides **TSV/CSV import pure functions**: text → 2-D matrix → record array, in the same spirit as the on-demand Pro helpers above (pure functions, zero component runtime, zero DOM dependency — callable directly in SSR / Node; they only enter your bundle when explicitly imported). Entry points:

- **`parseTableText(text, options?)`**: text → 2-D matrix. `options.delimiter` defaults to `'auto'` — counts occurrences of `\t` / `,` / `;` **outside quotes** (a delimiter inside quotes is data, not structure); the most frequent wins (ties fall back in the order `\t` > `,` > `;`, prioritizing the standard TSV form pasted from spreadsheets); when all counts are zero it degrades to one column per row. The TSV branch reuses `parseTsv` (CRLF normalization + trailing blank-line trimming); `,` / `;` go through a local RFC 4180 state machine (delimiters/newlines inside quotes don't split, `""` escapes a quote). Returns `{ matrix, delimiter, skippedRows }` — `skippedRows` counts **interior completely-empty rows** (trailing blank lines are trimmed by convention and not counted).
- **`matrixToRecords(matrix, options?)`**: matrix → record array. With `header: true` (default) the first row provides the column names (trimmed; empty names become `c1`/`c2` by position; the Nth occurrence of a duplicate name gets a `.N` suffix — the first keeps the bare name); with `header: false` the names come from `options.columns` (shortfalls filled as `c{position}`). The column-count baseline is the header row (or the longest row): data rows missing cells are padded with empty strings and overlong rows are truncated, both counted in `skippedCells`. **Values stay strings** — number/date coercion is the host's job; no magic type inference.
- **`importTableText(text, options?)`**: the two steps combined, returning `{ records, columns, delimiter, rowCount, skippedRows, skippedCells }` — irregularities are **reported faithfully, never silently dropped**.
- **`importTableFile(file, options?)`**: the File entry point — reads via `file.text()` then behaves as above. The clipboard entry only accepts a string: the host calls `navigator.clipboard.readText()` itself and passes the result to `importTableText` (this module never touches the clipboard).

```ts
import { importTableText, importTableFile } from '@oas-ui/ui/data/table/import'

// Clipboard text (host reads the clipboard; the helper only accepts strings)
const text = await navigator.clipboard.readText()
const r1 = importTableText(text)
table.data = r1.records

// File (.csv / .tsv)
const r2 = await importTableFile(fileInput.files[0])
// r2 = { records, columns, delimiter, rowCount, skippedRows, skippedCells }
```

<DemoBlock title="Data import: file picker + clipboard entries, imported rows land in the table with an N rows × M columns report">
  <div style="width: 100%">
    <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;align-items:center;margin-bottom:var(--oas-space-2)">
      <input type="file" id="table-import-file" accept=".csv,.tsv,.txt" aria-label="Choose a CSV/TSV file to import" style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary)" />
      <oas-button id="table-import-paste" size="small">Import from clipboard</oas-button>
    </div>
    <oas-table id="table-import-demo" row-height="32" bordered row-key="Name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      <span id="table-import-feedback" role="status" aria-live="polite">Nothing imported yet — pick a CSV/TSV file, or copy some TSV/CSV text and click "Import from clipboard"</span>
    </p>
  </div>
</DemoBlock>

```ts
// demo wiring (excerpt): both entries go through importTableText / importTableFile,
// results land in the table and the stats are echoed back
const feedback = document.getElementById('table-import-feedback')
const table = document.getElementById('table-import-demo')
const apply = (r, source) => {
  table.columns = r.columns.map((key) => ({ key, title: key }))
  table.data = r.records
  const skipped = r.skippedRows + r.skippedCells
  feedback.textContent =
    `Imported ${r.rowCount} rows × ${r.columns.length} columns from ${source} (delimiter ${r.delimiter === '\t' ? 'TAB' : r.delimiter}` +
    (skipped > 0 ? `; ${r.skippedRows} blank rows skipped, ${r.skippedCells} cells padded/truncated)` : ')')
}
document.getElementById('table-import-file').addEventListener('change', async (e) => {
  const { importTableFile } = await import('@oas-ui/ui/data/table/import')
  if (e.target.files[0]) apply(await importTableFile(e.target.files[0]), 'file')
})
document.getElementById('table-import-paste').addEventListener('click', async () => {
  const { importTableText } = await import('@oas-ui/ui/data/table/import')
  const text = await navigator.clipboard.readText()
  if (text) apply(importTableText(text), 'clipboard')
})
```

## Grid navigation (grid-navigation)

`grid-navigation` gives the table `role="grid"` semantics (header cells `columnheader`, rows `row`, cells `gridcell`) and a single Tab stop for the data-cell region: Tab focuses the scroll container, then the arrow keys roam the cells — Left/Right wrap across rows, Up/Down keep the column, Home/End jump to the row edges, Ctrl+Home/End to the grid's first/last cell, PageUp/PageDown page by the viewport (or by `page-size` when pagination is on). Enter/Space activate a control inside the focused cell (expand toggle, row checkbox), and editable cells hand the keyboard over to the editor while editing. Header controls (select-all, column filter) keep their own Tab stops.

<DemoBlock title="Arrow-key roaming (click the table, then use the arrow keys)">
  <div style="width: 100%">
    <oas-table id="table-grid-nav" grid-navigation columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":28,"city":"Hangzhou"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">Click a cell, then roam with the arrow keys · cell click: <span id="table-grid-nav-feedback">—</span></p>
  </div>
</DemoBlock>

## Row drag sorting (row-draggable)

`row-draggable` adds a drag-handle column; dropping a handle onto another row dispatches `oas-row-reorder` with `detail: { from, to, row }` (`from`/`to` are indices in the currently visible data-row order; `to` is the insertion index after removing the dragged row, so the host can replay it with `const [moved] = rows.splice(from, 1); rows.splice(to, 0, moved)`). The component never mutates `data` itself (host-controlled, the same contract as sortable tabs / tree drag). Dragging is disabled under virtual scrolling (`height`) with a one-time dev warning.

<DemoBlock title="Drag a handle to reorder (host replays oas-row-reorder)">
  <div style="width: 100%">
    <oas-table id="table-row-drag" row-draggable columns='[{"key":"name","title":"Name"},{"key":"age","title":"Age"},{"key":"city","title":"City"}]' data='[{"name":"Alice","age":30,"city":"Beijing"},{"name":"Bob","age":25,"city":"Shanghai"},{"name":"Carol","age":35,"city":"Shenzhen"},{"name":"David","age":28,"city":"Hangzhou"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">Last reorder: <span id="table-row-drag-feedback">—</span></p>
  </div>
</DemoBlock>

## Column field types (column type)

The `type` field in a column config declares the field type, driving the **default cell rendering and the default editor** (custom `render` / `cellTemplate` take precedence over `type`). All types: `text` (default plain text) / `number` / `currency` / `select` / `multi-select` / `date` / `checkbox` / `link` / `progress` / `rate`. Companion fields: `currency` (currency symbol, default `¥`), `options` (select / multi-select options `[{ value, label, color? }]`; color falls back to the default token, unknown values render as raw text). Numeric columns (number / currency / progress / rate) sort by the raw numeric value when combined with `sortable`; `date` sorts chronologically. Badge / progress / star colors all use CSS variable tokens (readable in dark mode automatically).

<DemoBlock title="Multiple field-type columns in one table">
  <div style="width: 100%">
    <oas-table row-key="id" columns='[{"key":"name","title":"Product","width":"110px"},{"key":"cat","title":"Category","type":"select","width":"110px","options":[{"value":"fruit","label":"Fruit","color":"var(--oas-color-success)"},{"value":"digital","label":"Digital","color":"var(--oas-color-primary)"},{"value":"food","label":"Food"}]},{"key":"price","title":"Price","type":"currency","width":"100px"},{"key":"stock","title":"Stock","type":"number","width":"90px"},{"key":"listed","title":"Listed","type":"date","width":"110px"},{"key":"progress","title":"Sold","type":"progress","width":"120px"},{"key":"rating","title":"Rating","type":"rate","width":"110px"},{"key":"active","title":"Active","type":"checkbox","width":"70px"},{"key":"tags","title":"Tags","type":"multi-select","width":"160px","options":[{"value":"new","label":"New"},{"value":"hot","label":"Hot"},{"value":"promo","label":"Promo"}]},{"key":"site","title":"Site","type":"link","width":"200px"}]' data='[{"id":1,"name":"Fuji Apple","cat":"fruit","price":12.8,"stock":15230,"listed":"2026-08-12","progress":35,"rating":4.7,"active":true,"site":"https://example.com/apple","tags":["new","hot"]},{"id":2,"name":"ANC Headphones","cat":"digital","price":899,"stock":860,"listed":1753920000000,"progress":72,"rating":4,"active":true,"site":"https://example.com/headphone","tags":["hot","promo"]},{"id":3,"name":"Cold-Pressed Olive Oil","cat":"food","price":88,"stock":"pending","listed":"2026-06-01T09:30:00","progress":150,"rating":5,"active":false,"site":"https://example.com/olive","tags":["promo"]},{"id":4,"name":"Mechanical Keyboard","cat":"digital","price":459,"stock":2341,"listed":"2026-07-20","progress":18,"rating":3.5,"active":true,"site":"https://example.com/keyboard","tags":[]},{"id":5,"name":"Shine Muscat Grape","cat":"fruit","price":39.9,"stock":7600,"listed":"2026-09-01","progress":55,"rating":4.2,"active":true,"site":"https://example.com/grape","tags":["new"]},{"id":6,"name":"Portable Espresso Maker","cat":"food","price":299,"stock":null,"listed":"unknown","progress":-8,"rating":99,"active":false,"site":"https://example.com/coffee","tags":["hot"]}]'></oas-table>
  </div>
</DemoBlock>

The example also covers empty states: row 3 has a non-numeric stock (raw text) and an ISO datetime (date part shown); row 6 has a null stock (empty), an invalid date (raw text), an out-of-range progress (clamped to 0%), and an out-of-range rating (clamped to 5 stars).

Inline editing per type: `number` / `currency` / `link` use a native input (numeric columns write back numbers); `progress` / `rate` clamp to 0-100 / 0-5 on submit; `multi-select` goes through the overlay component-editor channel mounting `oas-select multiple` (tick multiple options with `options` auto-synced as edit options; committing writes back a string array, and clearing every selection then blurring commits `[]` as a legitimate value; the first-release comma-separated input editor is retired — legacy comma-separated string data is parsed into the selection set when entering edit); `date` ships a built-in `YYYY-MM-DD` format check (invalid format keeps the editor open); `checkbox` mounts `oas-switch` through the component-editor channel (writes back a boolean); `select` reuses the existing select editor channel (`options` are auto-synced as edit options). Turn on `editable` and double-click any typed column to try it.

## Grouped view (group-by)

`group-by="fieldKey"` renders sections by field value: a section header = collapse arrow + field value + row count; clicking the arrow collapses / expands that group (expanded by default, with `aria-expanded` kept in sync). Groups are ordered by first occurrence of the field value, and sorting applies within groups; rows with missing / empty grouping values fall into the "(empty)" group (i18n text). Section headers are a kind of flat row and participate in row virtualization, spanning the full width via `colSpan` (orthogonal to `column-virtual` / fixed columns); collapsed groups survive data / attribute changes. Combining with merge columns / `span-method` / `row-draggable` is unsupported (warns once and degrades to plain rendering). With `pagination`, grouping is per-page (group counts reflect the current page; cross-page groups reappear on each page).

When the data lives on the server (`row-model="server"`), local grouping is unavailable (grouping the current-page slice is a wrong result) — with `group-by` set the component enters the **server-side grouping protocol** (requests carry the group key, the host returns group rows, the component renders in host order); see the "Server-side grouping" section for the recipe and protocol fields. Under the `infinite` form `group-by` is disabled (warns once).

<DemoBlock title="Group by department (sortable within groups, click the arrow to collapse/expand)">
  <div style="width: 100%">
    <oas-table group-by="dept" row-key="name" columns='[{"key":"dept","title":"Department"},{"key":"name","title":"Name","sortable":true},{"key":"city","title":"City"},{"key":"role","title":"Role"}]' data='[{"dept":"Frontend","name":"Alice","city":"Beijing","role":"Frontend Engineer"},{"dept":"Backend","name":"Bob","city":"Shanghai","role":"Backend Engineer"},{"dept":"Frontend","name":"Carol","city":"Shenzhen","role":"Frontend Engineer"},{"dept":"Backend","name":"David","city":"Hangzhou","role":"Architect"},{"dept":"Design","name":"Ethan","city":"Guangzhou","role":"UI Designer"},{"dept":"Frontend","name":"Fiona","city":"Chengdu","role":"Frontend Lead"},{"dept":"","name":"Grace","city":"Wuhan","role":"QA Engineer"}]'></oas-table>
  </div>
</DemoBlock>

## Cell overflow tooltip (cell-tooltip)

`cell-tooltip` is on by default (set `cell-tooltip="false"` to disable): when a plain-text cell overflows (content wider than the column), hovering shows the full text in a floating layer — a table-level **singleton tooltip** (no per-cell instances), token inverse colors readable in dark mode, auto-hidden on scroll / re-render. `ellipsis` columns that already carry a native `title` and rich-content cells (custom render / badges / progress bars) do not trigger it, avoiding a double tooltip.

<DemoBlock title="Hover an overflowing cell to read the full text">
  <div style="width: 100%">
    <oas-table cell-tooltip columns='[{"key":"env","title":"Env","width":"90px"},{"key":"url","title":"Endpoint","width":"220px"},{"key":"owner","title":"Owner","width":"80px"}]' data='[{"env":"Production","url":"https://prod-cluster.example-assets-platform.com/dashboard/overview/health","owner":"Alice"},{"env":"Staging","url":"https://staging.example-assets-platform.com/monitor/health-check/status","owner":"Bob"},{"env":"Canary","url":"https://canary.example-assets-platform.com/release/notes/latest","owner":"Carol"}]'></oas-table>
  </div>
</DemoBlock>

The full endpoint URLs far exceed the column width (long unbreakable strings): hover any overflowing cell to read the full text in the tooltip; it hides as soon as the pointer leaves.

## Advanced Capabilities (advanced entry)

`@oas-ui/ui/data/table/advanced` is an optional entry with pure helpers / column factories. It registers no custom elements and pulls in no editing or form controls; combine it with `@oas-ui/ui/data/table/edit` when editing is needed. It currently provides:

- **Pivot**: `pivot()` returns a pivot matrix; this entry's `pivotTable()` returns `columns` / `data` ready for `oas-table` (distinct from the pure `pivotMatrix()` helper in the Pro section below — see "Choosing between these and `advanced`")
- **Formula columns**: `formulaColumn()` / `compileFormula()` parse a safe expression language (fields, arithmetic, comparison, logic, `IF` / `ROUND` / `MIN` / `MAX` / `SUM` / `CONCAT`, etc.) without `eval` / `Function`
- **Query builder**: `compileQuery()` / `filterRows()` with nested `and` / `or` and operators such as `eq` / `contains` / `in` / `between` / `exists`
- **TSV**: `toTsv()` / `parseTsv()` for exporting and pasting table regions
- **History stack**: `createHistory()` generic command stack (undo / redo / canUndo / canRedo / subscribe / limit)
- **Windowed source helper**: `createWindowedSource()` handles `oas-window-request`, fills short pages and aborts stale requests; an optional `visual` adapter plugs into the visual protocol (visual-range mapped fetching + automatic `visual-start` / `visual-total` write-back)

> Comparison / range operators use numeric semantics; text matching is case-insensitive by default (`caseSensitive: true` enables it); `in` / `contains` match an array field when any element matches; TSV export collapses tabs / newlines inside a cell to spaces.

<DemoBlock title="advanced entry: pivot + formula column + query filter">
  <div style="display:flex;gap:var(--oas-space-4);flex-wrap:wrap;width:100%">
    <div style="flex:1 1 360px;min-width:320px">
      <div style="display:flex;gap:var(--oas-space-2);align-items:center;flex-wrap:wrap;margin-bottom:var(--oas-space-2)">
        <oas-button id="table-advanced-filter" size="small" aria-pressed="false">Amount ≥ 100</oas-button>
        <span id="table-advanced-status" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)">All 6 rows</span>
      </div>
      <oas-table id="table-advanced-source" height="240" row-height="32" bordered></oas-table>
    </div>
    <div style="flex:1 1 360px;min-width:320px">
      <p style="margin:0 0 var(--oas-space-2);color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)">Pivot: region × product (sum of qty)</p>
      <oas-table id="table-advanced-pivot" height="240" row-height="32" bordered></oas-table>
    </div>
  </div>
</DemoBlock>

```js
import { filterRows, formulaColumn, pivotTable } from '@oas-ui/ui/data/table/advanced'

const columns = [
  { key: 'region', title: 'Region' },
  formulaColumn({ key: 'total', title: 'Total', expression: 'amount * qty', align: 'right' }),
]
const rows = filterRows(sales, { field: 'amount', op: 'gte', value: 100 })
const { columns: pivotColumns, data: pivotRows } = pivotTable({
  rows: sales,
  rowField: 'region',
  columnField: 'product',
  valueField: 'qty',
})
```

Conditional-format rule editor UI and view configuration panels stay on the host; `table/view` also ships a persistence adapter. Range selection, undo/redo and master-detail are covered by the second and third Pro batches below.

## Pro Capabilities: Format / View / Range / History / Detail

Each capability is imported independently, so the default table stays lean:

```ts
import { setConditionalFormat } from '@oas-ui/ui/data/table/format'
import { applyViewState, captureViewState } from '@oas-ui/ui/data/table/view'
import { copyRange, enableRangeSelection } from '@oas-ui/ui/data/table/range'
import { enableHistory } from '@oas-ui/ui/data/table/history'
import { createMasterDetail } from '@oas-ui/ui/data/table/detail'

setConditionalFormat(table, [
  { field: 'amount', op: 'gte', value: 100, style: { color: '#b91c1c', className: 'is-high' } },
])
const saved = captureViewState(table)
applyViewState(table, saved)

enableRangeSelection(table)
enableHistory(table)
createMasterDetail(table, { panel, label: 'Details', render: (detail) => `${detail.row.name}` })
```

<DemoBlock title="Pro capabilities: format / view / range / history / detail">
  <div style="width: 100%">
    <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-2)">
      <oas-button id="table-pro-format" size="small">Highlight amount ≥ 100</oas-button>
      <oas-button id="table-pro-reset" size="small">Restore view and clear format</oas-button>
      <oas-button id="table-pro-range" size="small">Select A1:B2</oas-button>
      <oas-button id="table-pro-multi" size="small">Append selection</oas-button>
      <oas-button id="table-pro-cut" size="small">Cut selection</oas-button>
      <oas-button id="table-pro-paste" size="small">Paste & write back</oas-button>
      <oas-button id="table-pro-fill" size="small">Series fill</oas-button>
      <oas-button id="table-pro-save" size="small">Save view</oas-button>
      <oas-button id="table-pro-load" size="small">Restore view</oas-button>
      <oas-button id="table-pro-detail-key" size="small">Select Gamma by key</oas-button>
      <oas-button id="table-pro-detail-close" size="small">Close details</oas-button>
      <oas-button id="table-pro-copy" size="small">Copy range</oas-button>
      <oas-button id="table-pro-undo" size="small">Undo</oas-button>
      <oas-button id="table-pro-redo" size="small">Redo</oas-button>
      <span id="table-pro-status" role="status" aria-live="polite" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)">—</span>
    </div>
    <oas-table
      id="table-pro"
      editable
      row-key="id"
      columns='[{"key":"id","title":"ID","hidden":true},{"key":"name","title":"Name","width":"140px","editable":true},{"key":"team","title":"Team"},{"key":"amount","title":"Amount","align":"right","type":"number"}]'
      data='[{"id":"a","name":"Alpha","team":"Platform","amount":120},{"id":"b","name":"Beta","team":"Data","amount":80},{"id":"c","name":"Gamma","team":"Platform","amount":150},{"id":"d","name":"Delta","team":"Design","amount":40}]'
    ></oas-table>
    <div
      id="table-pro-detail"
      role="region"
      aria-label="Row details"
      aria-live="polite"
      style="margin-top:var(--oas-space-3);min-height:56px;padding:var(--oas-space-3);border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-md);color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)"
    ></div>
  </div>
</DemoBlock>

Rules match the first hit in array order and support field / cell-value / `when` formula conditions plus `applyTo: 'row'`. View state only stores structural state (column visibility/order/width, sort, filter, pagination, grouping), not selection or editing drafts.

### Range selection and clipboard (`table/range`)

```ts
import { copyRange, enableRangeSelection, setRangeSelection } from '@oas-ui/ui/data/table/range'

enableRangeSelection(table) // click / drag selection
setRangeSelection(table, { row: 0, col: 'name' }, { row: 2, col: 'amount' })
const tsv = await copyRange(table) // same as Ctrl/Cmd+C
```

Selection is anchored internally by **row key + column key** (a stable, unique `row-key` is recommended): it follows the original rows across sorting, filtering and re-renders. Public `row` coordinates are always the `data-row-index` display-row number (absolute in windowed mode), matching `oas-cell-click` / `oas-edit`. Rows that leave the windowed slice only stop being decorated — the **logical selection is kept**; copy/cut touches only currently rendered cells, and selection can extend across windows. Local virtual scrolling also keeps offscreen anchors while the display-set structure is unchanged, and pure cell edits do not clear them. After filtering/sorting/pagination/group-collapse/data changes it resolves by row key and clears unresolved anchors; group headers and expand rows use a separate flat scroll coordinate. Supports click, drag, Ctrl/Cmd-appended rectangles, Ctrl+A for currently rendered cells, arrows / Home / End / PageUp / PageDown, `Shift+Arrow` extension (local virtual scrolling or `oas-window-request` at the edge), `Esc` to clear and `Ctrl/Cmd+C` to copy; `Ctrl/Cmd+V` emits `oas-range-paste` (`detail: { start, startKey, rows, text }`). Once enabled the table uses a roving tabindex (only the focus cell is reachable by Tab; with `grid-navigation` the grid keeps its single stop) plus an `aria-live` selection announcement. Under column-virtual, columns scrolled out of the window become empty columns in the TSV; `span-method` merged columns may leave gaps.

```ts
import { addRangeSelection, applyRangePaste, cutRange, fillRange, selectByKey } from '@oas-ui/ui/data/table/range'

selectByKey(table, { key: 'a', col: 'name' }, { key: 'c', col: 'age' }) // select by row key
addRangeSelection(table, { row: 0, col: 'name' }, { row: 1, col: 'age' }) // append a rectangle
const tsv = await cutRange(table) // copy and clear (uncontrolled)
applyRangePaste(table, 'X\t9\nY\t8', { skipEmpty: true }) // write from the active selection's top-left cell
fillRange(table, { mode: 'series', cells: 2 }) // numeric series from the boundary row in the fill direction
```

Multi-selection copy is split into blocks separated by blank lines; `header: true` adds a header only to the first non-empty block. Events: `oas-range-change` (active selection or `null`), `oas-range-copy` (includes `selections`), `oas-range-paste` (includes `startKey`), and `oas-range-write` (`{ kind: 'paste'|'cut'|'fill', changes: [{ key, column, value, oldValue, oldRawValue }] }`, which history merges into one undo transaction). `cutRange` / `applyRangePaste` / `fillRange` and the fill handle write directly to `data` in the default uncontrolled mode; with `edit-controlled`, they only emit `oas-range-write` and let the host decide whether to write back. For selection/copy without writes, use `edit-controlled` or do not call the write APIs.

### Drag fill (fill handle)

Once a range selection is active, a **fill handle** (diamond marker) appears at the **geometric** bottom-right corner of the active selection (regardless of drag direction). Press and drag down / up / left / right — the selection outline expands live as the preview; releasing commits the fill. The commit shares the batch write-back channel with batch paste: one drag dispatches exactly one `oas-range-write` (kind `fill`), which history merges into **a single undo transaction**. Fill semantics are inferred automatically (equivalent to `fillRange(table, { mode: 'auto' })`): **single source value → copy**; **numeric column → linear series by the first difference** (`1,5` dragged two cells yields `9,13`); **dates → step by day** (`2026-01-01, 2026-01-04` dragged one cell yields `2026-01-07`); other text/boolean columns → **cyclic tiling of the source pattern** (`Ann,Bob` dragged two cells yields `Ann,Bob`).

`Esc` cancels (clears the selection without writing); releasing back on the source (no movement) is a no-op. Drag fill **does not auto-scroll** (a deliberate protective trade-off: moving the viewport mid-drag would shift target cells and risk writing to the wrong place). With **local virtual scrolling** (`height` enabled; the full dataset is present locally, only off-window rows are unrendered), only currently rendered rows are written — scroll to the target and drag again to cover more. In **windowed** mode (the server holds only the loaded slice), unloaded regions have no local data and no `oas-window-request` is dispatched during the drag, so only loaded rows are filled and the table is **never silently extended** (row-creating fills need row-template and key-generation semantics — not in the current version). While any cell is being edited the handle is not rendered (drag fill must not trample an in-progress draft). `fill-handle="false"` disables it entirely (on by default, but rendered only while an active selection exists — zero impact on empty tables or when the range capability is not imported). On touch (coarse pointer) the handle's hit area expands to 44px while the diamond visual stays small. Colors are exposed via the `--oas-table-fill-handle-color` / `--oas-table-fill-handle-outline` tokens; defaults are primary color with a surface outline, and dark theme switches automatically. The handle is a **pointer-only** affordance: v1 has no keyboard-equivalent path, so it is `aria-hidden="true"` for assistive technology (a button that cannot be operated by keyboard is not announced; `role` / localized `aria-label` remain as DOM identifiers). A keyboard-equivalent path for drag fill is not provided yet.

<DemoBlock title="Drag fill: date stepping / numeric series / text tiling">
  <div style="width: 100%">
    <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-2)">
      <oas-button id="table-fill-select" size="small">Select first two rows (date / seq / owner)</oas-button>
      <oas-button id="table-fill-off" size="small">Disable fill handle</oas-button>
      <oas-button id="table-fill-on" size="small">Re-enable fill handle</oas-button>
      <span id="table-fill-status" role="status" aria-live="polite" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)">Drag the diamond at the selection's bottom-right corner</span>
    </div>
    <oas-table
      id="table-fill"
      row-key="id"
      columns='[{"key":"id","title":"ID","hidden":true},{"key":"day","title":"Date"},{"key":"seq","title":"Seq","align":"right","type":"number"},{"key":"owner","title":"Owner"}]'
      data='[{"id":"r1","day":"2026-01-01","seq":1,"owner":"Ann"},{"id":"r2","day":"2026-01-04","seq":5,"owner":"Bob"},{"id":"r3","day":"","seq":0,"owner":""},{"id":"r4","day":"","seq":0,"owner":""},{"id":"r5","day":"","seq":0,"owner":""}]'
    ></oas-table>
  </div>
</DemoBlock>

`fillRange(table, { mode: 'auto', direction, cells, source })` is the programmatic channel with the same semantics; the drag handle calls it internally to commit.

### Undo / redo (`table/history`)

```ts
import { enableHistory, redo, undo } from '@oas-ui/ui/data/table/history'

enableHistory(table) // records uncontrolled oas-edit (uses detail.oldValue); Ctrl/Cmd+Z / Shift+Z / Y while focus is inside the table
undo(table)
redo(table)
```

`oas-edit` now includes `oldValue` (string) and `oldRawValue` (pre-edit original shape such as number / boolean / string[], so undo keeps the original type). History locates the data row through `oas-edit.detail.key` (`rowIndex` is a visible-row coordinate that drifts after sorting/filtering), so configure a stable unique `row-key`. Without `row-key`, only unsorted/unfiltered/unpaginated tables can fall back to `rowIndex`; editing the row-key field with non-unique old/new values still pushes an entry, but undo may be unable to locate a unique row (silently no-op). Tree child rows are located recursively via `children`. `edit-controlled` and windowed modes keep data on the host and are not recorded automatically; `enableHistory(table, { windowed: true })` explicitly enables undo within the loaded slice. Emits `oas-history-change` (`detail: { canUndo, canRedo }`).

```ts
import { recordHistory, withHistoryBatch } from '@oas-ui/ui/data/table/history'

recordHistory(table, { undo: () => restoreA(), redo: () => restoreB() }) // explicit record for controlled flows
withHistoryBatch(table, () => {
  recordHistory(table, { undo: undoA, redo: redoA })
  recordHistory(table, { undo: undoB, redo: redoB })
}) // one transaction: undo in reverse, redo in order
```

`oas-range-write` (paste/cut/fill) is merged into a single transaction by default; `options.rangeWrites = false` disables it.

### Master-detail (`table/detail`)

```ts
import { createMasterDetail } from '@oas-ui/ui/data/table/detail'

const detail = createMasterDetail(table, {
  panel: document.querySelector('#order-detail'),
  label: 'Order details',
  emptyText: 'Click a row to see details',
  render: (detail) => `${detail.row.name} · ${detail.row.amount}`,
})
const controller = new AbortController() // cancels the pending wait via controller.abort()
detail.select(0) // select by visible row index; null clears
detail.selectByKey('c') // select by row key (tree children included; kept even when not rendered; no waiting by default)
detail.selectByKey('z', { waitForRow: true, signal: controller.signal }) // explicit wait: a missed key pends until data lands it once
detail.close() // fires onClose once
detail.destroy()
```

Clicking a row renders into the host-provided panel (the helper owns the panel content; keep layout/close buttons outside the panel and prefer one instance per table); the selected row is marked with `tr[data-detail-selected]`. `Enter` opens the focused row and `Esc` closes, returning focus to the row (with range enabled and an active selection, the first Esc inside the table clears the selection). `data` changes (including inline-edit write-backs) refresh the detail by row key, and a vanished selected row clears it (refresh does not emit `oas-detail-change`; only selection changes do). A windowed slice change is not a deletion: selection and panel content stay, and the host calls `close()` for an explicit deletion. With multiple instances, Esc closes only the **most recently activated** instance, then falls back to the previous still-selected instance after close/destroy; `closeOnEscape: false` disables Esc. `onClose` fires only on a real close. `oas-detail-change` (`{ row, key, rowIndex }` or `null`; `rowIndex` is the current rendered-window index, use `key` for stable identity).

Without options, `selectByKey()` keeps the current state when windowed mode is active (the `windowed` attribute is present and `total` is finite and `> 0` after truncation; missing/invalid `total` or a truncated `0` means normal mode) but the key is not loaded: the selection/panel stay untouched and no events fire (no visible wait); in normal mode a missing key still clears the selection. Pass `{ waitForRow: true }` to wait in any mode: a missed key pends until `data` arrives — the pending call does not directly change the selection/panel and emits no `oas-detail-change`; when `data` contains the key it lands once and emits one `oas-detail-change`. While waiting, the existing selection still refreshes with `data` (row object/panel content update; `rowIndex=-1` when off-window), without re-emitting a selection change. The wait has no timeout and no failure event of its own: if the key never arrives, it stays. The wait ends only on a data hit, an explicit cancel, or a `signal` abort — mode, `windowed` attribute and `total` changes as well as MutationObserver batches do not terminate it; a normal-mode `data` deletion of the selected row still fires `onClose` but keeps the wait, and the key still lands when it arrives later. `close()`, `select()`, row/cell clicks, `Enter`, `Esc`, `destroy()`, a `row-key` change, or another `selectByKey()` (a new key replaces the pending one) all cancel the wait, without emitting a selection event for the pending key. Pass `{ signal }` (an `AbortSignal`) to cancel while waiting: an already-aborted signal creates no wait (default semantics apply); aborting mid-wait only cancels the wait — selection/panel stay untouched and no events fire; aborting after a natural landing has no effect. With no selection, only `Esc` **inside this instance's table/panel** cancels the wait (no window-level fallback is registered, and it does not take the multi-instance "most recently activated" slot); it still yields to `defaultPrevented`, input controls and another active instance on the same table. `closeOnEscape: false` disables Esc entirely; with range enabled and an active selection, the first Esc inside the table clears the selection and keeps the wait.

### View-state persistence adapter (`table/view`)

```ts
import { saveViewState, loadViewState } from '@oas-ui/ui/data/table/view'

const adapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
}
saveViewState(table, adapter, 'orders-view') // optional key; writes { version: 1, state }
loadViewState(table, adapter, 'orders-view') // false for missing/bad JSON/version != 1/invalid fields, table untouched
```

The adapter is host-provided (localStorage / sessionStorage / server); saved state contains `{ version: 1, state }` and excludes selection and edit drafts. Saving only requires `setItem`; loading requires `getItem`. Use the third argument to isolate multiple tables. Restore uses a **complete snapshot**: old sorting/filtering/width state absent from the snapshot is cleared. `captureViewState` / `applyViewState` handle structural state capture and restore.

### Windowed data source helper

```ts
import { createWindowedSource } from '@oas-ui/ui/data/table/advanced'

const source = createWindowedSource(table, {
  fetchRows: async ({ start, end, signal }) => api.list({ start, end, signal }),
})
// source.refresh() / source.destroy()
```

Listens to `oas-window-request`, aborts stale requests and fills `data` / `window-start` / `total` per the windowed protocol, with no runtime dependency (requires `height` for virtual scrolling). `windowSize` should not exceed the server's per-request limit; short pages are automatically filled forward within the same window (coverage counts actual returned rows). When `fetchRows` returns a bare array, `total` must be provided (via options or the table `total` attribute), otherwise windowed mode stays inactive. **One source instance per element** — creating a second source on the same element doubles listeners and fetches (warns once per duplicate creation and still returns the new instance); call `destroy()` first and rebuild (rebuilding after `destroy()` is warning-free).

Every `oas-window-request` decides coverage from the table's **current slice** (`window-start` + `data` length, finite, truncated, clamped to a minimum of 0, half-open), with no self-stored loaded range: after the host clears/replaces `data` externally or switches `window-start`, the same-window request is fetched again. In-flight marker dedupe, write echo suppression, forced refetch via `refresh()`, aborting stale requests on `destroy()` and the initial fetch keep their existing behavior. A synchronous `fetchRows` throw and a Promise rejection share one failure path: clear the in-flight marker and emit `oas-window-error` once (`detail: { start, end, error }`, `bubbles` + `composed`), after which the same window can retry; a stale failure does not clear the new request's in-flight marker. No automatic retry, and the table's `oas-window-request` emission is unchanged.

#### Visual adapter (optional `visual`, with the visual protocol)

When the slice contains inline expand content, or expanded rows already exist before the slice start, the event `start` / `end` is only a clamped guess (when the visible window and the slice do not intersect, the actually visible rows are missed). Pass a `visual` adapter to plug the helper into the optional visual protocol (see above), driven by the host's single-source layout:

```ts
import { createWindowedSource } from '@oas-ui/ui/data/table/advanced'

// Host single source: which rows carry expansion slots across the dataset (one every 25 rows)
const EXPANDED = new Set([0, 25, 50, 75, 100])
const DATA_TOTAL = 10000
const slotOf = (i: number) => i + [...EXPANDED].filter((e) => e < i).length

const source = createWindowedSource(table, {
  fetchRows: async ({ start, end, signal }) => api.list({ start, end, signal }),
  total: DATA_TOTAL,
  visual: {
    // Called at init and on every response refill: return the current snapshot (compute fresh; never cache request-time values)
    getGeometry: (dataStart: number) => ({ start: slotOf(dataStart), total: DATA_TOTAL + EXPANDED.size }),
    // Map the visible window's visual range back to a data fetch range (must be finite with end > start)
    getDataRange: (visualStart: number, visualEnd: number) => {
      let lo = Infinity
      let hi = -Infinity
      for (let i = 0; i < DATA_TOTAL; i++) {
        const s = slotOf(i)
        const len = EXPANDED.has(i) ? 2 : 1
        if (s + len <= visualStart || s >= visualEnd) continue
        if (i < lo) lo = i
        if (i + 1 > hi) hi = i + 1
      }
      return { start: Math.max(0, lo - 8), end: Math.min(DATA_TOTAL, hi + 8) }
    },
  },
})
```

Timing contract: `getGeometry(dataStart)` is re-invoked at init and on **every response refill** (if the host changed the expansion layout between request and response, the refill-time snapshot wins); the refill writes `window-start` + `visual-start` + `data` atomically inside the writing window and `total` + `visual-total` after it — one snapshot per response, with echo suppression and no self-fetching. When the request event carries valid `visualStart` / `visualEnd`, the fetch range is the **union** of the `getDataRange` mapping and the event's data range (the event `start` / `end` always carries the keyboard target row and the viewport margin and is never clipped by the mapping or swallowed by coverage; without visual fields or when the protocol is inactive it falls back to the event's `start` / `end`). Once the protocol is active, expansion is fully host-controlled: listen to `oas-expand` and write back `expanded` / `data` / visual attributes (the local toggle only emits the event and does not modify `expanded`); never double-write.

Failure semantics: an invalid mapping (non-finite / end ≤ start / a synchronous `getDataRange` throw) fetches nothing, leaves no in-flight marker, and emits `oas-window-error` once (`detail: { start, end, visualStart, visualEnd, error }`, carrying the visual range and the original data range); invalid geometry (non-finite, start<0, total≤0, start>total, total< data total — the total compared after the same truncation the table uses) writes no wrong visual attributes (stale `visual-start` / `visual-total` are removed and the table falls back to the current model), the data is still refilled, and the same failure event fires — after the fallback the table's requests carry local-scope visual fields only, and the helper stops mapping (fetching by the event's `start` / `end` verbatim instead of pulling wrong rows against the host's global layout). Both failures share the same recovery semantics: a **new-window** event retries; for the **same window** call `source.refresh()` to force a refetch (the table's winReq same-window dedupe and the loaded-coverage check may swallow a same-window retry). An invalid initial configuration throws to the caller (no attributes written, no listener attached). Without `visual`, no visual attributes are ever written — existing behavior is unchanged value for value.

## Choosing between the three usage tiers

The table supports three usage tiers, chosen by "who owns rendering"; do not mix them per-cell:

| Tier | Entry | Best for | Boundary (who owns what) |
| --- | --- | --- | --- |
| Out of the box | Default component `data/table` | Standard UI scenarios: default table look plus the full built-in behavior set (sorting / filtering / pagination / editing / selection / keyboard navigation) | The container and behavior are entirely the component's job — customize the look via column config, theme tokens and existing slots |
| Custom look | `structural-render` seven slots | You need to take over the **structure** (wrap elements, add classes, attach listeners, clear and render your own), while keeping the component's data and behavior | The container and behavior stay with the component: hooks run after default assembly, behavior / A11y / events unchanged — you take over the td/tr/th elements themselves (see [Structural rendering](#structural-rendering-structural-render-entry-registered-l3)) |
| Data and state only | `@oas-ui/ui/data/table/model` | You own rendering entirely (any framework / Canvas / SSR snapshots / workers / programmatic drivers) and only want the row-model computations | **Interactions and A11y are yours**: the component's sort / paginate / expand interactions, keyboard reachability and ARIA sync do not exist — you get the pure-function pipeline output (see [Headless data layer](#headless-data-layer-datatablemodel-helper-l3)) |

All three tiers share the same row-model pipeline (same input → same row set and order); once you have picked a tier, the **data acquisition approach** within the component form (external pagination / server row model / windowed / host-managed) is covered by the [server data approach decision table](#server-data-approach-decision-table) above.

## Structural rendering (structural-render entry, registered L3)

`@oas-ui/ui/data/table/structural-render` provides **structural** cell/row render hooks — the column-level `render` only customizes cell **content**, while this capability takes over the **structure** (the td/tr/th elements themselves): wrap, add classes, attach listeners, or clear and fully customize — the complement to content-level `render` that takes over structure (rationale at the end of the contract). Import on demand to register; the default `table` chain stays untouched:

```ts
import '@oas-ui/ui/data/table/structural-render'
// Then attach hooks to any oas-table instance (property channel, functions never become attributes):
table.structuralRenderers = {
  bodyCell: ({ el: td, row, column, api }) => { /* body data cell: default content + decorator chain done */ },
  bodyRow: ({ el: tr, row, rowIndex, api }) => { /* body data row: default assembly done */ },
  headerCell: ({ el: th, column, api }) => { /* header leaf cells; multi-level group cells not in v1 */ },
  headerRow: ({ el: tr, api }) => { /* every thead row (flat and multi-level) */ },
  empty: ({ el, api }) => { /* empty-state container td: default text assembled; clear and fully customize */ },
  loading: ({ el, text, api }) => { /* loading row tr: default row assembled; text is the built-in label */ },
  pagination: ({ el, current, pageCount, total, pageSize, api }) => { /* paginator: api.gotoPage jumps pages */ },
}
```

### The seven slots at a glance

| Slot | ctx fields | Called when | Unregistered default |
| --- | --- | --- | --- |
| `bodyRow` | `el: HTMLTableRowElement` - `row` - `rowIndex` - `api` | After the body data row is fully assembled (check / drag / expand / cells / row events); full renders + virtual-scroll frames (per windowed row) | Byte-identical behavior |
| `bodyCell` | `el: HTMLTableCellElement` - `row` - `rowIndex` - `column` - `api` | After default content and the decorator chain (edit/format/range); full renders + virtual-scroll frames + paintCell partial restore | Byte-identical behavior |
| `headerRow` | `el: HTMLTableRowElement` - `api` | After each thead row (flat / multi-level) is appended; full renders only | Byte-identical behavior |
| `headerCell` | `el: HTMLTableCellElement` - `column` - `api` | After each header leaf cell is appended (group cells excluded); full renders only | Byte-identical behavior |
| `empty` | `el: HTMLElement` (the empty-state td) - `api` | The empty early-exit (`display` empty, not windowed), after default content (slot="empty" -> `empty-text` -> built-in text) is assembled | Empty state byte-identical |
| `loading` | `el: HTMLTableRowElement` - `text: string` (built-in label, reusable by the host) - `api` | The loading early-exit (host `loading` attribute or server model in-flight), after the default row (`part="loading-row"` + full-width td + spinner + text) is assembled | Loading row byte-identical |
| `pagination` | `el: HTMLElement` (assembled oas-pagination) - `current` - `pageCount` - `total` - `pageSize` - `api` (adds `gotoPage`) | After the paginator assembles on every full render (**including the loading/empty early exits** - pagination is row-data independent); not called when pagination is off; virtual-scroll frames do not re-call it | Paginator byte-identical |

All slots share: **called after default assembly** (default content/events/capability decorations in place; decorators inside, structure outside); **zero calls and zero drift when unregistered** (the attach point short-circuits when the capability is not imported - neither ctx nor the api object is even constructed); throwing hooks are caught by a guard (devWarn once per slot+message, rendering continues).

### ctx.api surface

Every slot's ctx carries `api` (the pagination slot gets `TableStructuralPaginationApi`, adding `gotoPage`) - read-only state queries plus controlled operations, all through the component's existing public/controlled channels (attribute reads, attribute writes, existing events). **No private state is exposed**; reads always return the value at call time (still accurate on patch paths that do not re-run hooks):

```ts
table.structuralRenderers = {
  bodyCell({ el: td, row, column, api }) {
    if (column.key !== 'probe') return
    api.isSelected(String(row.id)) // row selection query, reads the selected attribute live
    api.isEditing(String(row.id)) // inline-edit query, row-scoped
    api.isEditing(String(row.id), 'name') // row + column scoped
    api.toggleExpand(String(row.id)) // toggle tree row (writes expanded + emits oas-expand)
  },
  pagination({ el, current, pageCount, api }) {
    // Writes the current attribute (same channel as the built-in paginator's oas-change);
    // over-page clamp is handled by the component's existing clamp write-back; non-finite input is a no-op
    api.gotoPage(Math.min(current + 1, pageCount))
  },
}
```

Edge quick reference: `isSelected('')` / `isEditing('')` are always false (`isEditing` reads the rendered edit markers, falling back once the edit is cancelled); `toggleExpand('')` is a no-op (no attribute write, no event); `gotoPage` skips the write when the value equals the current attribute, and arguments are truncated to integers (fractional pages truncate down).

### Slot takeover vs. virtual scrolling / editing / selection / printing

- **Virtual scrolling**: `bodyRow` / `bodyCell` re-run per frame as windowed rows are rebuilt (listeners die with their element; keep cross-element state yourself); `empty` / `loading` / `pagination` are only called on full-render exits, never on scroll frames. Replace mode owns a11y: do not remove `role` / `tabindex`.
- **Editing**: entering edit clears the td (structural decorations are destroyed); commit-unchanged / cancel restore via `paintCell`, which re-runs `bodyCell` so decorations come back automatically; td references held outside hooks die with the rebuild (always use `ctx.el`). `api.isEditing` reads the rendered edit markers and stays in sync with enter/exit edit.
- **Selection**: checking goes through a **partial patch** (updates `data-selected` and checkbox state in place, without rebuilding rows or re-running hooks) - selection baked into host-built DOM goes stale; query `api.isSelected` at interaction time instead (live attribute read).
- **Printing**: the loading row is excluded from print by default (the print rule matches `tr:has(td.loading)`) - when taking over the `loading` slot, keep the `loading` class on the td, otherwise the in-flight row will be printed; `empty` / `pagination` takeover content prints as usual (both are part of the terminal output).
- **windowed**: an unloaded window (`display` empty, total > 0) is **not** an empty state (full-size placeholders render instead) - the `empty` slot is not called; under windowed-tree / visual-protocol modes `api.toggleExpand` only emits `oas-expand` intent (host writes state back), same as the built-in toggle.
- **Exceptions**: a throwing hook is caught by the guard, devWarns once (deduped per slot+message), and is skipped; rendering continues (no white screen) and recovers on the next pass once fixed.


**Contract discipline**: hooks run **after the element''s default assembly** (default content, row events, and the edit/format/range decorator chain are all in place 鈥?decorators inside, structure outside; grid semantics/ARIA are finalized at the end of the render pass 鈥?reading `role=gridcell` etc. inside a hook returns empty, which is expected; hooks are invoked after the element is attached to thead/tbody, so `el.parentElement` is available); tr/td are **recreated** as the window scrolls 鈥?listeners die with their element, keep cross-element state yourself; the property is re-read every render pass, so replacing hooks at runtime takes effect next pass (values assigned before the capability is registered activate automatically once it registers 鈥?no need to re-assign); in replace mode (clear `el` and render your own) you must **not remove `role` / `tabindex`** (gridcell semantics); `rowIndex` follows the `data-row-index` convention (absolute data row number under windowed).

**Coverage boundary (negative list)**: `bodyRow` applies to data rows only 鈥?group section headers (group-by), expand content rows, summary, empty/loading/spacer rows are not called; `bodyCell` applies to data-column td only 鈥?the check column, drag-handle column, trailing expand-toggle column, column-virtual placeholder cells, and cells covered by span-method are not called (serial number / actions / tree-toggle first column / merged cells are called); `headerCell` covers leaf columns only (multi-level group cells, drag/check-all/expand th are not called); `headerRow` covers every thead row.

**Interaction notes**: (1) Merged columns 鈥?bodyCell runs before merge swallows covered cells (decorations on swallowed tds are discarded), and same-value grouping is judged by the original display value captured before hooks rewrite the td (host decorations do not affect grouping); (2) editing 鈥?entering edit clears the td; commit-unchanged / cancel restore via paintCell, which re-runs bodyCell afterwards (structural decorations come back automatically); (3) selection patch 鈥?patchSelection only updates `data-selected` in place and does not re-run hooks (reading state from `el` is fresh; state baked into host-built DOM is not refreshed by the patch path); (4) header sort delegation 鈥?thead clicks go straight to the built-in sort, so clickable controls injected by hooks co-fire with it; build your own sort UI with `stopPropagation`; (5) exception policy 鈥?a throwing hook is caught by a guard, devWarns once (deduped per slot+message), and is skipped; rendering continues (no white screen) and recovers automatically on the next pass once fixed. Shape rationale: framework-reconciler "replace the whole component" approaches don''t translate to imperative DOM; the headless-table "host owns rendering" direction is the trend; renderer instance lifecycles are a fine-grained optimization from the heavy-DOM-reuse era 鈥?this library''s tr/td are rebuilt with windowing anyway, and the coarse "call after default assembly + re-read each pass" model covers it equivalently.
<DemoBlock title="Structural rendering: status dot + header hint + row-click badge (import structural-render first to register the capability)">
  <oas-table id="table-structural" height="220" row-height="32" bordered></oas-table>
</DemoBlock>

```ts
// Registered L3: a static import activates it (top-level in your page script)
import '@oas-ui/ui/data/table/structural-render'

const STATUS_COLOR = { ok: 'var(--oas-color-success)', pending: 'var(--oas-color-warning)', off: 'var(--oas-color-text-tertiary)' }

// Actual wiring lives in the page's <script setup> onMounted (excerpted here). Data goes through
// attributes (pre-upgrade safe); structuralRenderers is a property channel — guard with
// whenDefined against expando shadowing on unupgraded elements:
const t = document.getElementById('table-structural')
t.setAttribute('columns', JSON.stringify([
  { key: 'name', title: 'Task' },
  { key: 'owner', title: 'Owner' },
  { key: 'status', title: 'Status' },
]))
t.setAttribute('data', JSON.stringify([
  { name: 'Release prep', owner: 'Alice', status: 'ok' },
  { name: 'Review queue', owner: 'Bob', status: 'pending' },
  { name: 'Archived', owner: 'Carol', status: 'off' },
  { name: 'Regression passed', owner: 'Dave', status: 'ok' },
]))
customElements.whenDefined('oas-table').then(() => {
  t.structuralRenderers = {
  // Structural: wrap the status td with "dot + text" (a td-level wrap content-level render cannot do)
  bodyCell({ el: td, column, row }) {
    if (column.key !== 'status') return
    const dot = document.createElement('i')
    dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${STATUS_COLOR[row.status] ?? 'currentColor'}`
    td.prepend(dot)
  },
  // Header leaf cells get a sort hint
  headerCell({ el: th }) {
    const hint = document.createElement('span')
    hint.textContent = ' ⇅'
    hint.style.opacity = '0.45'
    th.append(hint)
  },
  // Row level: click the first cell to stamp a badge (listener example; the listener dies with the old tr on rebuild)
  bodyRow({ el: tr }) {
    tr.addEventListener('click', () => {
      const cell = tr.querySelector('td')
      if (!cell) return
      const old = cell.querySelector('.row-badge')
      if (old) {
        old.remove()
        return
      }
      const badge = document.createElement('oas-tag')
      badge.className = 'row-badge'
      badge.setAttribute('size', 'small')
      badge.textContent = '✓'
      cell.prepend(badge)
    })
  },
  }
})
```

> Listeners dying with the rebuilt tr is part of the contract (don't expect listeners to survive virtual scrolling); cross-row / cross-render state belongs in table events (`oas-row-click` etc.) or your framework layer.

<DemoBlock title="ctx api queries: bodyCell takes over a 「Row state」 column, the button reads this row's selection/edit state live (isSelected / isEditing)">
  <oas-table id="table-structural-api" checkable editable row-key="id" height="200" row-height="36" bordered></oas-table>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 8px 0 0">
    Last query: <span id="table-structural-api-feedback">-</span> (check rows / double-click the "Task" cell to edit, then click the button - results update live)
  </p>
</DemoBlock>

```ts
// Actual wiring lives in the page's <script setup> onMounted (excerpted here):
// bodyCell takes over the probe column as a "query this row" button - on click it queries
// ctx.api live instead of baking state into the DOM (selection patches do not re-run hooks;
// baked state goes stale, api reads are always fresh)
const t = document.getElementById('table-structural-api')
const fb = document.getElementById('table-structural-api-feedback')
t.setAttribute('columns', JSON.stringify([
  { key: 'name', title: 'Task', editable: true },
  { key: 'owner', title: 'Owner' },
  { key: 'probe', title: 'Row state' },
]))
t.setAttribute('data', JSON.stringify([
  { id: 't1', name: 'Release prep', owner: 'Alice' },
  { id: 't2', name: 'Review queue', owner: 'Bob' },
  { id: 't3', name: 'Regression check', owner: 'Carol' },
]))
customElements.whenDefined('oas-table').then(() => {
  t.structuralRenderers = {
    bodyCell({ el: td, row, column, api }) {
      if (column.key !== 'probe') return
      td.textContent = ''
      const btn = document.createElement('oas-button')
      btn.setAttribute('size', 'small')
      btn.textContent = 'Query row'
      // Results render into a chip container next to the button (the button stays clickable -
      // api re-queries live on every click)
      const result = document.createElement('span')
      result.className = 'probe-result'
      btn.addEventListener('click', () => {
        const key = String(row.id)
        const picked = api.isSelected(key) // live read of the selected attribute
        const editing = api.isEditing(key) // live read of the rendered edit markers
        result.textContent = ''
        const tag = document.createElement('oas-tag')
        tag.setAttribute('type', picked ? 'success' : 'default')
        tag.textContent = picked ? 'selected' : 'not selected'
        result.append(tag, document.createTextNode(' '))
        const editTag = document.createElement('oas-tag')
        editTag.setAttribute('type', editing ? 'warning' : 'default')
        editTag.textContent = editing ? 'editing' : 'not editing'
        result.append(editTag)
        if (fb) fb.textContent = `row ${key}: selected=${picked ? 'yes' : 'no'} - editing=${editing ? 'yes' : 'no'}`
      })
      td.append(btn, result)
    },
  }
})
```

> The api is a **query interface at call time**: checking/editing does not re-run hooks (partial patches / edit clears the td), but `isSelected` / `isEditing` always read the current attributes and render state on the next call - baking state into your own DOM goes stale, querying at interaction time does not.

## Pro helpers (on-demand)

The table's data-processing capabilities also ship as **3 pure-function helper subpaths**: imported on demand, with a runtime closure that contains no component runtime, no core and no i18n, excluded from the L1 / CDN bundles (the default `table` entry and the component itself stay untouched). They only enter your bundle when you import them.

```ts
// Pivot: row/column grouping + aggregation + optional totals
import { pivotMatrix } from '@oas-ui/ui/data/table/pivot'
// Value formatting: number / date / text / custom
import { createFormatter } from '@oas-ui/ui/data/table/value-format'
// Query: filter tree + stable sort + pagination + immutable query state
import { applyQuery, createQueryState } from '@oas-ui/ui/data/table/query'
```

**Choosing between these and `@oas-ui/ui/data/table/advanced`**: `advanced` holds **capabilities registered for the component** (column factories, query builders, formula columns that work alongside `oas-table`); the three helpers above are a **pure-function host-side transform layer** — they never touch a component instance, take plain arrays and return plain data, which suits processing before the data reaches the table (or rendering into charts / exports). They do not depend on each other; import only the layer you need.

**`pivotMatrix(rows, spec, options?)`** returns a UI-agnostic matrix `{ rowHeaders, columnHeaders, cells, valueLabels, grandRow?, grandColumn?, grandTotal? }`. `spec.rows` / `spec.columns` are field-path arrays (dotted `a.b` paths supported, layered in array order); each `spec.values` entry is `{ field, aggregate: 'sum' | 'count' | 'avg' | 'min' | 'max', alias? }`. `totals: true` (`spec.totals` or the third `options.totals`) adds the grand-total row `grandRow` (per leaf column), the grand-total column `grandColumn[rowGroup][valueIndex]` and the overall total `grandTotal[valueIndex]`. A `null` in `cells[rowGroup][leafColumn]` means the combination has no valid data; empty values (`null` / `undefined` / `''`) are ignored by every aggregate, `count` counts non-empty values (including non-numeric strings), and the other aggregates only use finite numbers. Passing `[]` for `rows` / `columns` degenerates that axis (one row group / one summary column). Row and column groups follow first-seen order, value metrics follow `values` order, and neither the input rows nor the spec are mutated.

```ts
const matrix = pivotMatrix(sales, {
  rows: ['region'],
  columns: ['product'],
  values: [
    { field: 'amount', aggregate: 'sum', alias: 'Sales' },
    { field: 'amount', aggregate: 'count', alias: 'Orders' },
  ],
  totals: true,
})
// leaf columns = column combos × metrics (column combos expand first); headers = column field levels + metric level
```

<DemoBlock title="pivot: region × product with total row / column">
  <oas-table id="table-pivot-helper" row-height="32" bordered></oas-table>
</DemoBlock>

**`createFormatter(spec)`** returns `(value, row?) => string`; `spec` is one of:

- `{ type: 'number', precision?, group?, percent?, prefix?, suffix? }`: `precision` fraction digits (0-20, natural precision when omitted), `group` thousands separators, `percent` multiplies by 100 and appends `%` by default
- `{ type: 'date', pattern? }`: preset `YYYY-MM-DD` (default) / `datetime` / `time`, or a token template (`YYYY` `YY` `MM` `DD` `HH` `mm` `ss`, plus `yyyy` / `yy` / `dd`), local time zone; accepts `Date` / epoch milliseconds / ISO strings
- `{ type: 'text', ellipsis? }`: truncates by code point and appends `…`
- `{ type: 'custom', format: (value, row) => string }`: build the text yourself with access to the whole row

Empty values (`null` / `undefined`) always render as an empty string; invalid numbers / dates fall back to `String(value)`; an invalid spec (unknown `type`, wrongly typed options) falls back to `String(value)` with a one-time `devWarn`, and a throwing `custom` formatter warns once per instance and falls back.

<DemoBlock title="value-format: column render integration (money / percent / date / text ellipsis)">
  <oas-table id="table-value-format" row-height="34" bordered></oas-table>
</DemoBlock>

**`applyQuery(rows, query)` / `createQueryState(init?)`**: `query = { filter?, sort?, page? }`, applied in **filter → sort → page** order, returning a new array. `filter` is a recursive `{ combinator: 'and' | 'or', filters }` group; leaf conditions are `{ field, op, value?, caseSensitive? }` with the operators `eq` / `neq` / `contains` / `startsWith` / `endsWith` / `gt` / `gte` / `lt` / `lte` / `in` / `between` / `empty` / `notEmpty` (text matching is case-insensitive by default, numeric comparison never treats `null` as `0`, array fields match when any element matches); an empty `and` group is always true and an empty `or` group is always false. `sort` is `{ field, dir }[]` with explicitly stable ordering and empty values always last. `page = { current, pageSize }`: `current` below 1 is treated as 1, a non-positive `pageSize` disables paging, and out-of-range pages return an empty array. `createQueryState()` provides immutable update helpers (`setFilter` / `addSort` / `setPage`, each returning a new object), and the `state.query` snapshot can be passed straight to `applyQuery`.

```ts
let state = createQueryState({ page: { current: 1, pageSize: 10 } })
state = state
  .setFilter({ combinator: 'and', filters: [{ field: 'amount', op: 'gte', value: 100 }] })
  .addSort('due', 'desc')
const visible = applyQuery(orders, state.query)
```

<DemoBlock title="query: local filter / sort / pagination (applyQuery + createQueryState)">
  <div style="width: 100%">
    <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;align-items:center;margin-bottom:var(--oas-space-2)">
      <oas-button id="table-query-high" size="small" aria-pressed="false">Amount ≥ 300</oas-button>
      <oas-button id="table-query-sort" size="small" aria-pressed="false">Due date desc</oas-button>
      <oas-button id="table-query-next" size="small">Next page</oas-button>
      <span id="table-query-status" role="status" aria-live="polite" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)">—</span>
    </div>
    <oas-table id="table-query-helper" row-height="32" bordered></oas-table>
  </div>
</DemoBlock>

> All three helpers are pure functions (no DOM access, no custom-element registration) and can run in SSR / Node directly. They are independent from the `advanced` entry's `pivot()` / `compileQuery()`: the advanced versions produce `oas-table` `columns` / `data` and the table's internal filter channel, while these subpaths output a matrix, display text and query state respectively. Size (gzip, first band measured 2026-11-03): pivot 1276 B / value-format 1899 B / query 1818 B.

## Headless data layer (data/table/model, helper L3)

When you only want the row-model computations and take over rendering yourself (any framework / Canvas / SSR snapshots / workers / programmatic drivers), import `@oas-ui/ui/data/table/model` on demand: a zero-DOM, side-effect-free pure-function row-model pipeline — **filter → sort → paginate slice → group → flatten → visible set** — computing every derived value in one pass.

**Same source as the component**: the row transforms inside `oas-table` (filter / sort / pagination / grouping / tree expand) call this very implementation (the component shell only reads attributes, writes attributes back and renders DOM). Feed the same `columns` / `data` / filter values / sort state to the component or to `computeRowModel` and you get identical row sets and order — never two divergent computations.

```ts
import { computeRowModel } from '@oas-ui/ui/data/table/model'

const model = computeRowModel({
  data: rows,
  columns: [{ key: 'name' }, { key: 'age', type: 'number' }],
  sorters: [{ key: 'age', order: 'desc' }],          // multi-sort: array order = priority
  filters: { name: 'Zhang' },                        // same semantics as filter-values (filterMatch honored)
  pagination: { current: 1, pageSize: 10 },           // total present = external pagination (sort only, no slice)
  grouping: { by: 'dept' },                           // optional: section rows by field value
  rowKey: 'key',
  expanded: new Set(['n1']),                          // tree expand and inline expand share this set
  collapsedGroups: new Set(),                         // collapsed group keys
})

model.pageRows          // current page slice (full set when pagination is off)
model.roots             // filtered + sorted top-level rows (unsliced)
model.fullRoots         // filtered top-level rows in pre-sort order (differs from roots only in sort order — roots is a sorted copy, fullRoots keeps the post-filter order; input basis for scope=all summaries)
model.total / model.pageCount / model.pageSize   // pageSize is the normalized value (invalid input falls back; returns 10 when pagination is off, i.e. no pagination input)
model.clampedCurrent    // over-page clamp suggestion (pure function writes no state: write your own current back when clamped)
model.flat              // flattened list (data/group/expand rows; section rows carry groupKey/groupLabel/groupCount)
model.visible           // visible set (after expanded / collapsedGroups filtering) — render this directly
```

Notes:

- **Server row-model semantics**: `serverModel: true` skips local filtering and sorting entirely (the server already returned the current page slice for the current conditions, `data` passes through untouched) — all-or-nothing, same as the component's `row-model="server"`
- **Side-effect-free clamping**: when `current` exceeds `pageCount` nothing is written; you only get the `clampedCurrent` suggestion plus the `clamped` flag (the component writes it back to the `current` attribute; in headless usage write it back to your own state)
- **Composable pieces**: `parseFilterValues` / `matchesFilters` / `resolveSorts` / `computeDisplayRoots` / `buildFlat` / `visibleFlat` / `compareRows` are all standalone pure-function exports; i18n strings are injected as parameters (e.g. `groupEmptyLabel`) and the runtime closure contains no component / core / i18n code
- **Environment agnostic**: import directly in node / worker / SSR (zero DOM dependency is guarded by a node-environment test); input arrays are never mutated (pure functions)
- **Windowed-equivalent usage**: pass the host-sliced window as `data` plus `pagination: { current, pageSize, total }` (external pagination: pass-through, no slicing), and omit `sorters` / `filters` — local transforms are skipped entirely (`data` passes through, `total` goes straight to the output). This is the headless equivalent of the component's `windowed` mode (the component-side window request/refill protocol belongs to the component form; in headless usage you manage the window yourself)
- **Naming cross-reference (published API kept as is)**: the component attributes `filter-values` / `sort-key` + `sort-order` correspond to the headless inputs `filters` / `sorters` (a `sorters: [{ key, order }]` array is isomorphic to the component's `multi-sort`); both spellings refer to the same filter/sort semantics; no unification before a major version

<DemoBlock title="Headless: computeRowModel feeds the component renderer (same pipeline as the component)">
  <div style="width: 100%">
    <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;align-items:center;margin-bottom:var(--oas-space-2)">
      <oas-button id="table-headless-sort" size="small" aria-pressed="false">Amount descending</oas-button>
      <oas-button id="table-headless-page" size="small">Next page</oas-button>
      <span id="table-headless-status" role="status" aria-live="polite" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)">—</span>
    </div>
    <oas-table id="table-headless" row-height="32" bordered></oas-table>
  </div>
</DemoBlock>

> Size (gzip, first band measured 2026-11-14): entry shell + pipeline implementation 4.3 KB / 8 files; the component default chain already carries the same implementation (zero extra size for component consumers — wiring is a same-source move, not a duplicate bundle). The entry path itself is not in the L1 / CDN bundles (helper L3, only explicit imports pull it into your build).

**Headless tier: rendering and interactions are yours** (a genuine hand-rolled rendering recipe, no `oas-table` involved): take `model.visible` and assemble the table with native DOM (or any framework's list rendering) — the model only produces row sets and order; structure and interactions belong to the caller:

```ts
import { computeRowModel } from '@oas-ui/ui/data/table/model'

const model = computeRowModel({
  data: rows,
  columns: [{ key: 'name' }, { key: 'age', type: 'number' }],
  sorters: [{ key: 'age', order: 'desc' }],
  pagination: { current: 1, pageSize: 10 },
  rowKey: 'key',
})

// Native DOM rendering (example): dispatch section rows / data rows by kind;
// whether expand content rows render is up to you
const tbody = document.createElement('tbody')
for (const f of model.visible) {
  if (f.kind === 'group') {
    const tr = document.createElement('tr')
    const th = document.createElement('th')
    th.colSpan = 2
    th.textContent = `${f.groupLabel} (${f.groupCount})` // section header: label + row count
    tr.appendChild(th)
    tbody.appendChild(tr)
  } else if (f.kind === 'data') {
    const tr = document.createElement('tr')
    for (const key of ['name', 'age']) {
      const td = document.createElement('td')
      td.textContent = String(f.row[key] ?? '')
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
}
document.querySelector('table')!.appendChild(tbody)

// Sort / paginate / expand / collapse interactions and keyboard reachability (ARIA sync)
// are yours too: change sorters / pagination.current (or expanded / collapsedGroups)
// → recompute the model → re-run the render loop
```

> Difference from the DemoBlock above: that demo computes the row model with `computeRowModel` but still lets `<oas-table>` render and interact (same-source pipeline demo); this recipe is the full headless tier — rendering, interactions, and A11y are all self-managed, and the component itself never enters the runtime closure.

## API

### oas-table

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name of the table (forwarded to the inner table element; `role="grid"` when grid-navigation is on; unset by default) | — | — |
| `bordered` | Full border: draws a grid outline around cells (the outer frame is built in) | — | — |
| `cell-tooltip` | Cell overflow tooltip (on by default, `"false"` to disable): when a plain-text cell overflows (scrollWidth > clientWidth), hover shows the full text in a floating layer — one table-level singleton tooltip (token inverse colors, readable in dark mode), auto-hidden on scroll/re-render; rich-content cells and ellipsis columns with a native title are exempt (no double tooltip) | `string` | `true` |
| `checkable` | Row selection: present = multi-select (checkboxes + select-all header); `="radio"` = single-select (mutually exclusive, click again to deselect, no select-all), oas-check detail.keys ≤1 | `string` | — |
| `column-keys` | Controlled column visibility and order (key array or comma list): header tree and data columns re-order to the effective leaf order (same-ancestor leaves grouped) | `string[] \| string` | `[]` |
| `column-virtual` | Column virtualization (column windowing): only visible-window columns render; off-window columns collapse into placeholder cells (colSpan-summed via colgroup). Constraints: explicit width on all columns recommended; grouped header / span-method / summary rows / active server grouping incompatible (warns and degrades — server grouping wins) | `boolean` | — |
| `columns` | Column config `[{ key, title, sortable?, width?, align?, fixed?, render?, summary?, aggregate?, editable?, editor?, validate?, editOptions?, editComponent?, actions?, type?, currency?, options? }]`, JSON string (declarative attribute channel; property assignment takes precedence); `type` declares the field type (number/currency/select/multi-select/date/checkbox/link/progress/rate) driving default cell rendering and the default editor, `currency` is the currency symbol for currency columns (default ¥), `options` are select/multi-select options `[{ value, label, color? }]`; `aggregate` marks a server-grouping aggregate column (the host-provided aggregate for this column key in group-row `aggregates` renders in the matching column) | `TableColumn[] \| string` | `[]` |
| `current` | Current page (built-in pagination, controlled) | `string` | `1` |
| `data` | Row data `[{ [key]: value, children?, expand? }]`, JSON string (declarative attribute channel; property assignment takes precedence) | `Array<Record<string, unknown>> \| string` | `[]` |
| `edit-controlled` | Controlled editing: does not write back `data` on submit, only fires `oas-edit`; the host listens and updates `data` itself | `boolean` | — |
| `editable` | Inline editing switch (requires `editable: true` on columns; same for the `actions: true` operation column) | `boolean` | — |
| `empty-text` | Empty state text | — | — |
| `expanded` | Set of expanded row keys (comma-separated; shared by tree parent rows and expandable rows) | `string` | — |
| `export-file-name` | Export file name (without extension; path separators and reserved characters are sanitized) | `string` | `export` |
| `export-format` | Export format: `csv` (default) / `excel`, or the comma list `csv,excel` (both buttons); invalid falls back to csv | `string` | `csv` |
| `exportable` | Enables export: renders export buttons in a toolbar above the table (CSV by default, CSV/Excel configurable), and exposes the exportData method | `boolean` | — |
| `fill-handle` | Drag fill handle switch (on by default, `"false"` disables): a diamond marker at the bottom-right corner of the active range selection; drag to preview the extension live and release to commit (single-value copy / numeric first-diff series / date day-step / cyclic tiling otherwise, committed as one oas-range-write transaction of kind fill). Read and consumed by the range capability (data/table/range); without importing it this attribute has no effect | — | — |
| `filter-values` | Controlled column filter values (JSON object: column key → selected scalar value) | `string` | — |
| `grid-navigation` | Keyboard grid navigation: role=grid, single Tab stop for the data region, arrow keys roam cells (Home/End/PageUp-Down, Enter/Space activate in-cell controls) | `boolean` | — |
| `group-by` | Grouped view: render sections by field value (section header = value + row count + collapse arrow, click to collapse/expand, expanded by default); groups ordered by first occurrence, sorting applies within groups; empty values fall into the "(empty)" group; combined with merge columns / span-method / row-draggable it warns once and degrades to plain rendering; works with column-virtual / virtual scrolling (section header spans the full width; under an active server grouping protocol column-virtual degrades to plain rendering). Under row-model="server" this is the host-side grouping protocol: requests carry detail.groupBy and the host returns group rows (kind='group') rendered in host order — no local grouping; disabled under infinite (warns once) | `string` | — |
| `header-align` | Header alignment: `follow` (default, follows the column) / `left` / `center` / `right` / `default` (browser UA centering); per-column `headerAlign` / `<oas-table-column header-align>` wins | `string` | `follow` |
| `height` | Virtual scroll viewport height (px); when set, only visible-window rows plus head/tail placeholders are rendered | `string` | `320` |
| `hover` | Row hover background switch (purely visual), `"false"` disables | — | — |
| `indent-size` | Per-level indent of tree data in px | `string` | `24` |
| `infinite` | Infinite scroll + cursor pagination (server-side data shape): scrolling near the bottom auto-fetches the next chunk via oas-rows-request (reason=load-more, detail.cursor echoes the cursor), and the host refills via appendRows (empty array = end-of-data signal); when combined with `pagination`, pagination wins; with `windowed`, windowed wins (mutual-exclusion warning each); `total` is optional (unknown-total scenes run with totalKnown=false — end-of-data relies on the host empty-chunk signal); capability gates mirror row-model="server" (export/print limited to loaded rows, summary scope=all disabled, group / row-drag / column-drag / merge disabled) | `boolean` | — |
| `loading` | Loading state: shows placeholder rows in the data area (header retained) | `boolean` | — |
| `max-height` | Caps the body scroll area with a sticky header (virtual `height` wins when both set) | `string` | — |
| `multi-sort` | Multi-column sort (JSON array: [{ key, order }], applied in array order) | `string` | — |
| `page-size` | Rows per page (built-in pagination, default 10) | `string` | `10` |
| `pagination` | Built-in pagination switch (footer pager; leave unset when the host paginates) | `boolean` | — |
| `row-auto-height` | Auto row height (boolean, off by default, virtual scrolling only): rows grow with their content — ResizeObserver measures each row, unmeasured rows use the row-height estimate (scrollbar length converges as measurements arrive), and height corrections anchor by (row identity, in-row offset) so the viewport never jumps. Requires importing `@oas-ui/ui/data/table/auto-height` to register the capability; a `wrap: true` column participates in multi-line measurement. Under windowed it uses a mixed model: measured inside the loaded slice, estimated outside | `boolean` | — |
| `row-draggable` | Row drag sorting: renders a drag-handle column and dispatches oas-row-reorder on drop; disabled with a warning under virtual scrolling | `boolean` | — |
| `row-height` | Fixed row height for virtual scrolling (px) | `string` | `40` |
| `row-key` | Unique key field of a row | `string` | `key` |
| `row-model` | Row model: `client` (default, local full dataset: filter/sort/pagination slicing run in-component) / `server` (server row model: pairs with the `total` external-pagination shape — `data` holds the current page slice, local filter/sort are skipped entirely, page turns / sort / filter / group-key changes fetch via oas-rows-request; sort / filter / page-size / group-key changes auto-reset current=1; in-flight requests show built-in loading, failures surface an error bar via reportRowsError; with `group-by` set this becomes the host-side grouping protocol — requests carry detail.groupBy and the host returns group rows rendered in host order). Together with `windowed`, windowed wins (mutual-exclusion warning); together with `infinite`, infinite wins (protocol switches to cursor/load-more with the relaxed total premise); without `total` it falls back to client with a warning | `string` | — |
| `selected` | Set of selected row keys (comma-separated) | `string` | — |
| `show-header` | Toggles the header (default true); with `false` no header row is rendered while column configuration still aligns data cells | `string` | `true` |
| `size` | Density preset: `small` / `medium` (default) / `large` — only changes default cell padding and font size (all via CSS variables; override with `--oas-table-cell-padding-block` / `--oas-table-cell-padding-inline` / `--oas-table-font-size`, which take precedence); invalid values fall back to `medium` with a warning; orthogonal to `row-height` | `string` | `medium` |
| `sort-key` | Controlled sort; `sort-order` is `asc` / `desc` / empty | `string` | — |
| `sort-order` | Controlled sort; `sort-order` is `asc` / `desc` / empty | `SortOrder` | — |
| `sticky-rows` | Number of sticky rows (N): the first N rows stick below the header (coexists with the scroll container and fixed columns) | `string` | — |
| `stripe` | Zebra striping: alternating light background for odd/even rows | `boolean` | — |
| `summary` | Summary config `[{ key, type: 'sum'\|'avg'\|'count', label? }]`, JSON string | `string` | — |
| `summary-scope` | Summary aggregation scope: `all` (default, full dataset) / `page` (current page) | `string` | `all` |
| `table-layout` | Passes the table layout algorithm through (with `fixed`, column widths strictly follow `width`) | `string` | — |
| `total` | Total row count for external (server-side) pagination: pairs with pagination/current/page-size — `data` holds only the current page slice (no internal slicing) and the total feeds the pager directly; page turns emit oas-page-change for the host to swap data; absent or invalid values fall back to internal pagination | `string` | — |
| `visual-start` | Optional visual protocol (only active together with visual-total, windowed only): the visual row number of the current slice's data[0], 0 ≤ visual-start ≤ visual-total. Supports hosts whose slices start after already-expanded rows — when active the render flow starts at visual-start × row-height and offsets by visual row numbers; absolute data row numbers (data-row-index / event rowIndex / ARIA / displaySnapshot) are unaffected. Missing / invalid / only one of the pair: devWarn once and fall back to the current window model entirely | `string` | — |
| `visual-total` | Optional visual protocol (only active together with visual-start, windowed only): total number of visual rows (data rows + inline expand content rows), a finite positive integer (truncated) not smaller than total. When active, rendering and scroll height follow the visual row count and row expansion is fully host-controlled — clicking the local toggle only emits oas-expand with a devWarn and does not modify expanded (the host writes back expanded / data / visual attributes to re-render). Missing / invalid / only one of the pair / smaller than total: devWarn once and fall back to the current window model entirely | `string` | — |
| `window-start` | In windowed mode, the row index of data[0] within the full dataset (absolute row number): the component renders and offsets by absolute row; ignored when not windowed | `string` | `0` |
| `windowed` | Server-side row-window mode (boolean, off by default): with total / window-start the host supplies only the visible window slice and the component holds no full dataset. When enabled the component computes the expected range from the visible row window (8-row buffer on both sides) and, if it is not covered by the loaded range, emits oas-window-request for the host to refill; local sort/filter/group/pagination/tree-expand are the host's responsibility (the component skips them with a devWarn). When the slice contains inline expand rows, the expected range is mapped through the visual slots to cover the actually visible data rows (including expand owner rows). Off by default: behavior unchanged | `boolean` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `setCapabilityOptions` | `setCapabilityOptions(name: string, options: unknown): void` | Pro capability options entry: e.g. `table.setCapabilityOptions('format', rules)`; writes options and triggers a re-render |
| `effectiveColumns` | `effectiveColumns(): TableColumn[]` | Effective columns: filtered and ordered by column-keys (controlled visible set + order); falls back to all leaf columns when column-keys is absent (backward compatible) |
| `getColumns` | `getColumns(): TableColumn[]` | All current column definitions (including group columns; a base table API readable by the capability controller / host) |
| `getDisplaySnapshot` | `getDisplaySnapshot(): TableDisplaySnapshot \| null` | Readonly display-set snapshot for range capabilities: maps row keys to absolute data-row and flat scroll indices (windowed offsets included), with a structural fingerprint and keysByIndex. Built lazily and shared; callers must not mutate the returned maps |
| `translateText` | `translateText(key: string, params?: Record<string, string \| number>): string` | Translate built-in copy (nearest config-provider / locale; the capability controller and external custom templates look up text here) |
| `paintCell` | `paintCell(td: HTMLTableCellElement, col: TableColumn, row: Record<string, unknown>): void` | Repaint the cell as regular display content: clears it and mounts cellNode (respecting rich content from render/cellTemplate) |
| `scrollToRow` | `scrollToRow(key: string): boolean` | `scrollToRow(key: string): boolean`: scroll to the given row (virtual / windowed viewports only; returns false otherwise; non-windowed virtual supports flat data only). Host-recipe anchor for windowed tree lazy-loading: call it after a total-changing refeed to restore the viewport (the anchoring scroll goes through the scroll channel and may emit a reason='scroll' oas-window-request - same semantics as scroll-driven window refills) |
| `notifyEdit` | `notifyEdit(kind: 'edit' \| 'edit-cancel' \| 'edit-invalid', detail: TableEditDetail): void` | Dispatch the edit result event (commit/cancel; detail is assembled by the edit capability). The event name is written as a literal here |
| `setColumnOrder` | `setColumnOrder(keys: string[]): void` | `setColumnOrder(keys: string[])`: Update the column display order (writes back column-keys and re-renders; dispatches oas-column-order so the host can persist it). Not effective under the server row model (order semantics are owned by the server): the write-back is intercepted with a one-time warning, the column panel move buttons are disabled, and programmatic calls (e.g. restoring a persisted order at init) are intercepted as well |
| `columnReorderGate` | `columnReorderGate(): boolean` | `columnReorderGate(): boolean`: column-reorder capability gate (TableColumnSettingsHost contract) — returns true when server row-model or infinite is active; the column-settings panel disables its move buttons accordingly (same source as the setColumnOrder write-block guard); contract is optional, hosts without it fall back to false |
| `setColumnWidth` | `setColumnWidth(key: string, width: number): void` | Update the given column width (writes back the matching width in columns and re-renders; dispatches oas-column-resize). When the property column definitions contain functions, updates the in-memory definition |
| `exportMatrix` | `exportMatrix(): { headers: string[]; rows: string[][] }` | Export matrix: headers (column title / headerTemplate text) + currently visible data rows |
| `exportData` | `exportData(format: ExportFormat, options: { fileName?: string }): string` | Export and trigger a download: generate content → Blob download → dispatch `oas-export` |
| `requestAutoHeightSync` | `requestAutoHeightSync(): void` | Auto-height capability callback: after measure backfill changes the prefix sums, re-anchors row identity and performs a regular update render. |
| `appendRows` | `appendRows(rows: Array<Record<string, unknown>>, options?: { cursor?: string; total?: number; requestId?: number }): void` | `appendRows(rows, options?: { cursor?, total?, requestId? })`: append loaded rows (distinct from the replace semantics of a `data` attribute write, which resets the buffer); `cursor` is recorded and echoed back on the next load-more request via detail.cursor; `total` syncs the total attribute and aria-rowcount; **an empty array signals "no more data"** (stops bottom triggers and shows the end-of-list hint row); passing `requestId` enables sequence guarding (stale late responses dropped silently + duplicate same-id refills idempotently ignored, each with a one-time hint); only effective in infinite mode — elsewhere the call is a silent no-op with a one-time hint |
| `reportRowsError` | `reportRowsError(detail: { requestId: number; reason?: string; error?: unknown }): void` | `reportRowsError(detail: { requestId, reason?, error? })`: host-side failure notification — effective only when requestId equals the current request id (emits oas-rows-error, clears loading, shows the error bar); each requestId should report failure at most once — duplicate reports for the same id are silently dropped as duplicates (one-time hint); stale late failures are silently dropped |
| `refreshRows` | `refreshRows(options?: { purge?: boolean }): void` | `refreshRows(options?: { purge?: boolean })`: force-refetch the current state (reason=refresh, bypassing same-value dedup); `purge: true` reserves cache-clearing semantics — no in-component cache so it equals refresh; in infinite mode refresh resets the loaded buffer (clearing cursor / loaded rows / end-of-data signal) and refetches the first chunk; no-op in client mode |

#### Events

| Event | Description |
| --- | --- |
| `oas-cell-click` | Fired on data-cell click, `detail: { row, column, value, rowIndex, columnIndex }` (suppressed inside interactive controls) |
| `oas-check` | Checkbox selection change, `detail: { keys: string[] }` |
| `oas-column-order` | Fired after column drag reorder, `detail: { keys }` (new column order) |
| `oas-column-resize` | Fired after a column width drag, `detail: { key, width }` |
| `oas-edit` | Inline edit submitted (Enter / blur / operation column save), `detail: { rowIndex, key, column, value, oldValue, oldRawValue }` (`oldValue` is the pre-submit string value, `oldRawValue` keeps the original shape such as number / boolean / string[]); in controlled mode the component does not write back `data` |
| `oas-edit-cancel` | Inline edit cancelled (Esc / operation column cancel / empty submit restores), `detail: { rowIndex, key, column, value, oldValue, oldRawValue }` (`value` / `oldValue` are the original value; `oldRawValue` keeps the original shape) |
| `oas-edit-invalid` | Dispatched when a commit is rejected by the column validate (no commit; the edit state is kept). detail: { rowIndex, key, column, value, message } — message is the validator-returned text (undefined for boolean false); listen for error summaries/logging |
| `oas-expand` | Row expand/collapse (tree child rows or expandable content rows), `detail: { key, expanded }`; when the visual protocol (visual-total + visual-start) is active this is host-channel only (the component does not modify expanded locally) |
| `oas-export` | Export triggered (button or exportData), `detail: { format, fileName, rowCount }` |
| `oas-filter-change` | Fired when a column filter value changes, `detail: { filters }` (filters maps a column key to its selected scalar value) |
| `oas-page-change` | Fired when the built-in page changes, `detail: { page, pageSize }` |
| `oas-row-click` | Row click (also toggles selection when not checkable), `detail: { row, key }` |
| `oas-row-dblclick` | Fired on data-row double-click, `detail: { row, rowIndex }` |
| `oas-row-reorder` | Row reorder via drag or Alt+Arrow; `detail: { from, to, row }` (to is the insertion index after removing the dragged row; the component never mutates data) |
| `oas-rows-error` | Server-side fetch failure (host notifies via reportRowsError; shared by server row-model and infinite), `detail: { requestId, reason, error }`; the component also shows a built-in error bar (role=alert; the retry button calls refreshRows) |
| `oas-rows-request` | Server-side fetch request (shared by server row-model and infinite; reason: init=mount / paginate=page or page-size change / sort=sort change / filter=filter change / group=group-key change / refresh=refreshRows / load-more=infinite bottom-reached next chunk), `detail: { requestId, start, end, sortModel, filterValues, reason, totalKnown, cursor?, groupBy? }` (server: start/end is the half-open current-page range `(current-1)*pageSize ~ current*pageSize`, totalKnown always true, and with `group-by` set groupBy carries the current group key (the host returns group rows accordingly); infinite: start/end is the loaded-row count (range semantics N/A), totalKnown follows the presence of the total attribute, cursor echoes the cursor recorded by the last appendRows (absent on first); requestId increases monotonically in-component — hosts drop stale late responses by it; same-value attribute writes do not re-emit, and a `data` write is a refill, not a new request) |
| `oas-scroll` | Virtual scroll event (rAF throttled), `detail: { scrollTop, start, end }` |
| `oas-sort-change` | Sort change, `detail: { key, order: 'asc' \| 'desc' \| '' }` |
| `oas-window-request` | Emitted in windowed mode when the expected row window is not covered by the loaded range; detail: { start, end, reason, visualStart?, visualEnd } (start/end are half-open absolute DATA row indices and always stay in data coordinates; reason is init / scroll / resize / data). When the slice contains expand rows or the visual protocol is active, the expected range is mapped through the visual slots to cover the actually visible data rows (including expand owner rows), and visualStart / visualEnd carry the visible window's visual coordinates for host-side visual fetching (not the slice's visual-start). The same expected window (including visual fields) is not emitted twice |

#### Slots

| Name | Description |
| --- | --- |
| `template[slot="empty"]` | Rich empty-state content (takes precedence over empty-text and the default empty text) |
| `template[slot="filter-icon"]` | Custom filter trigger icon in filterable column headers |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-table-cell-padding-block` | `var(--oas-space-3)` |
| `--oas-table-cell-padding-inline` | `var(--oas-space-4)` |
| `--oas-table-font-size` | `var(--oas-font-size-md)` |
| `--oas-tooltip-bg` | `var(--oas-color-text-primary)` |
| `--oas-tooltip-color` | `var(--oas-color-bg)` |

### oas-table-column

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions` | Column actions (e.g. save/cancel buttons for row editing) | — | — |
| `align` | Column content alignment (left/center/right) | — | — |
| `currency` | Currency symbol for currency-type columns (default ¥) | — | — |
| `data-key` | Column key (escape channel for the Vue reserved word `key`; plain `key` also works in native HTML — the component reads both) | — | — |
| `editable` | Column editable (double-click a cell to edit) | — | — |
| `editor` | Editor type/configuration (select/input etc.) | — | — |
| `ellipsis` | Single-line truncation with ellipsis for overflowing content (full text on hover title) | — | — |
| `filterable` | Column filterable (filter trigger rendered in the header) | — | — |
| `filters` | Column filter options configuration | — | — |
| `fixed` | Column fixed (left/right pinning) | — | — |
| `hidden` | Column hidden initially (available in the column visibility panel) | — | — |
| `key` | Column key field name (native HTML writes key directly; Vue templates use data-key) | — | — |
| `merge` | Auto-merge adjacent same-value cells in the column | — | — |
| `options` | Display options for select/multi-select columns, JSON `[{ value, label, color? }]` (color falls back to the default token; auto-synced as edit options when type=select) | — | — |
| `serial-number` | Row serial number column (1-based, not from data fields) | — | — |
| `sortable` | Column sortable (header click cycles asc/desc/none) | — | — |
| `summary` | Column participates in the summary row (sum/avg/count) | — | — |
| `title` | Column header title (defaults to the default slot text) | — | — |
| `type` | Column field type (number/currency/select/multi-select/date/checkbox/link/progress/rate; text is the default plain text): drives default cell rendering and the default editor; render/cellTemplate take precedence | — | — |
| `width` | Column width (px or CSS value; fixed columns should declare it explicitly) | — | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Custom cell content (row.field placeholder interpolation inside the template, double-curly syntax) |

> Note: `columns.render` is a function type and can only be assigned via the property from JS — it cannot be expressed as a JSON string. For `fixed` columns it is recommended to declare `width` explicitly (sticky offsets fall back to 100px when omitted). Summary can also be written directly on a column as `summary: 'sum' | 'avg' | 'count'`; `children` (tree child rows) and `expand` (expandable row content) are both row data fields.

The loading placeholder row is exposed as `::part(loading-row)`, the summary row as `::part(summary-row)`, and the expandable content row as `::part(expand-row)`; each can be styled independently.
