---
description: Declarative forms from a JSON schema plus uiSchema. The schema is compiled once into a render plan and mounted on the form family. Value management and field validation stay in the form kernel; error injection, array-level checks and reactions are owned by this component.
---

# SchemaForm Declarative Form

Describe a form with one `schema` (a JSON Schema subset) plus an optional `uiSchema` (UI annotations).
The component compiles it into a render plan and mounts it on the form family. Value management and
field validation state stay in `oas-form`; **error injection, array-level validation, reaction
evaluation and compilation** are owned by this component.

> **Value contract (read first)**: `getValues()` and `oas-submit.detail.values` follow the form
> kernel's string semantics — leaves are always strings (`number` yields `"42"`, `boolean` yields
> `"true"`, arrays yield JSON strings). Before evaluation and validation the component projects values
> by the schema `type` **read-only** (`"42"` → 42), while **submitted values are unchanged**.
> Type-preserving output is planned for a later version.

> Scope: V1 covers declarative compilation, rendering, validation, `whenSchema`-only reactions and
> array add/remove. Expression reactions, controlled `values` / `setValues`, custom widget registration
> and array tables come later (calling them raises a dev warning, never a silent failure). Use
> `oas-questionnaire` for multi-step flows.

## Basic usage

`schema` / `uiSchema` / `initialValues` all support **property + JSON attribute** dual channels (assign
objects in host frameworks; use `schema='{...}'` in static HTML). Field labels come from `title` and help
text from `description`; `required` on a parent object is compiled into child field requirements.

<DemoBlock title="Basic: input / number / switch / enum / email">
  <oas-schema-form id="sf-basic" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-basic-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-basic-submit" type="primary">submit()</oas-button>
    <oas-button id="sf-basic-validate">validate()</oas-button>
    <oas-button id="sf-basic-values">getValues()</oas-button>
    <oas-button id="sf-basic-reset">reset()</oas-button>
  </oas-space>
</DemoBlock>

## Reactions (`whenSchema`)

`reactions` live on the **source field's** uiSchema node. A `whenSchema` condition is a JSON Schema
validation; `scope` defaults to the field itself (`$self`). `fulfill` accepts `visible` / `disabled` /
`required` / `value`; `otherwise` falls back to the static annotation. `visible: false` **unmounts** the field
(its value is not submitted and not validated); inside array rows the key slot is kept as an empty string.
Refresh is directed by a dependency graph — only fields whose conditions depend on the changed path
are re-evaluated.

**Value reactions (`fulfill.value`)**: when the condition holds, the expression result is written into the
`target` field (strings follow the kernel string semantics; numbers / booleans / `null` may also be written
as literals). The `value` expression shares the compiler and dependency graph with `when`; written values
participate in the fixed-point iteration (**8-round cap**, a dev warning keeps the last round when it does not
converge) and drive downstream reactions. When the condition is false, `otherwise.value` is written if
declared; otherwise the current value is **kept**. Writes only apply to visible targets — the hidden /
unmounted semantics of `visible: false` take precedence.

<DemoBlock title="Hide/require fields by country, lock input by plan">
  <oas-schema-form id="sf-react" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-react-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<DemoBlock title="Value reaction: qty × price writes the total, and reaching the threshold unlocks the discount">
  <oas-schema-form id="sf-react-value" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-react-value-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Reactions (`when` expressions)

`when` is the restricted expression track (V1b): the condition is a string, paths use `{path}` placeholders
(dot notation plus `[i]`, array wildcard `[]`) and the source field is `$self`. Frozen syntax: values
(string / number / `true/false/null`), comparisons `== != > >= < <=` (numeric when both sides are numbers,
otherwise string comparison), logic `&& || !` with parentheses, arithmetic `+ - * / %` (numbers only — a
non-numeric operand yields `NaN` at runtime, and `NaN` comparisons are always false), membership `in` /
`contains()`, and a function library of 20: `iif / empty / len / sum / min / max / lower / upper / concat /
join / split / substring / replace / trim / round / abs / floor / ceil / formatDate / dateAdd` (`iif` is lazy;
concatenate strings with `concat(...strings)` — `+` is numeric addition only; `formatDate` freezes the tokens
`yyyy MM dd HH mm ss`, uses the local timezone, prints unknown tokens verbatim with a dev warning; `dateAdd`
supports `day / hour / minute / month` — month arithmetic **clamps to the month end** (Jan 31 + 1 month →
Feb 28, Feb 29 in leap years; negative amounts behave the same) and keeps the time of day; **there is no
`now()`** — non-determinism conflicts with the static recomputation model, feed the current time through a
controlled value instead).
**Assignments / statements / loops / arrow functions / template strings / regex literals / property access
chains are compile-time errors**; syntax errors, unknown fields and unknown functions only disable that single
reaction (dev warning) while the rest keep working. The two tracks differ in expressiveness — they are not
advertised as equivalent; prefer `whenSchema` when you want JSON Schema semantics.

Host functions: after `registerExprFunction(name, fn)` you can call the function by name. Their dependencies
cannot be extracted statically, so reactions using host functions **recompute on every value change**
(everything else still uses the directed dependency graph). Register before setting the schema.
**Host first**: when a host function shares a name with a built-in, the host implementation wins (with a
one-time dev warning) instead of being silently shadowed.

<DemoBlock title="when expression: plan + seats drive invoice visibility and note requirement">
  <oas-schema-form id="sf-expr" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-expr-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Arrays and nesting

Object arrays render through `oas-form-list`: the initial array length drives row creation (one initial
row renders one row), add/remove use the existing row interactions, and row fields are re-indexed.
Array-level validation (`minItems` / `maxItems` / `uniqueItems` / required) runs in this component; errors
are injected into the array path and rendered below the list as `part="array-error"` (`role="alert"`).

<DemoBlock title="Object array: initial rows / add-remove / minItems error">
  <oas-schema-form id="sf-array" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-submit" type="primary">submit()</oas-button>
    <oas-button id="sf-array-reset">reset()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Nested arrays: users → matrix (field names users.N.matrix.M.label)">
  <oas-schema-form id="sf-nested" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-nested-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-nested-values">getValues()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Empty array + minItems: submit shows the array-level error (part=array-error)">
  <oas-schema-form id="sf-array-required" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-required-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-required-submit" type="primary">submit()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Nested array-level validation: inner minItems lands on that row's own error slot">
  <oas-schema-form id="sf-array-nested-error" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-nested-error-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-nested-error-submit" type="primary">submit()</oas-button>
  </oas-space>
</DemoBlock>

## Inline-edit table (`array-table`)

Object arrays can also render as an inline-edit table with `uiSchema.widget: 'array-table'`. Row content is
still rendered by this component (each cell is a `form-item`, so value collection / validation / reactions /
error injection all work unchanged); the table only adds the two-dimensional layout, the header row and the
row-action column — it is the same value semantics as `oas-form-list` in a different presentation.

- Columns come from the declaration order of `items.properties`. Column-level annotations live on
  `users[].field`: `width` (numbers are px, strings are used as grid tracks such as `'2fr'`), `align`
  (`left` / `center` / `right`), `hidden` (visually hidden but the cell and its value are kept); a `widget`
  override also applies to cells.
- **Cells do not render their own label** (the header carries it) and the `*` of required fields moves to the
  header; widget widths are constrained to the cell with `max-width: 100%` (fixed-width controls never spill
  into the action column).
- The action column holds remove / duplicate / move-up / move-down; the add button appends below the table.
  Semantics match `oas-form-list` row operations (deep copy / value swap, focus returns by row position,
  `aria-live` announcements).
- **Column resizing**: drag the divider at the right edge of a header (or focus the handle and press
  `←` / `→` for 8px, `Shift` for 24px, `Home` to restore the annotation `width`). The numeric `width` is only
  an initial value; the runtime width is **display state** and is never written back to the uiSchema.
- **Column reordering**: drag a header cell to change the display order (the drop target shows an insertion
  hint). This is display state too: the `items.properties` / uiSchema order remains authoritative, and field
  names, values and validation are untouched.
- **Cross-row paste**: pasting TSV (`\t` separates columns, newlines separate rows) into any cell fills
  right/down from that cell and appends rows as needed. Content beyond `maxItems` is truncated with an
  `aria-live` announcement and a one-time dev warning per instance; hidden columns are skipped; a single-value
  paste is left to the native input. Pasted values go through the existing widget write channel, so type
  mismatches are caught by the validation chain. Paste emits `oas-paste`
  (`detail: { startRow, startColumn, rows, columns, truncated, addedRows }`, where `addedRows` is the number
  of appended rows) and refreshes `dirty` / reactions in the same turn. Error visuals are cleared only for
  **row-appending pastes** (`addedRows > 0`); value-only pastes keep the error state of unfixed fields.
- Events: `oas-add` / `oas-remove` (`detail: { index }`), `oas-duplicate` / `oas-move` (`detail: { from, to }`),
  `oas-paste` (bulk TSV fill).
- Row operations change values but do **not** emit `oas-values-change` (contract preserved); the component
  refreshes `dirty`, reactions and the controlled write baseline in the same turn, so the host only needs to
  follow along in its own `values` (a controlled host write will not roll the operation back).
- Structure changes (`schema` / `uiSchema`) restore the current row counts; rewriting `initialValues` and
  `reset()` go back to the initial row count. Switching between the two widgets keeps the data (row-count and
  value snapshots combined).
- Table semantics use ARIA (`role="table"` / `columnheader` / `row` / `cell`) plus CSS grid for geometry; no
  native `<table>` (slots cannot produce `td`, and row content must stay in light DOM for the form kernel).
- **Virtual scrolling (`virtual`)**: windowed rendering for thousand-row arrays — only the visible window plus
  overscan is mounted (`overscan` adjustable, 5 rows per side by default), row heights are measured and
  calibrated (`estimated-row-height` seeds the initial estimate; the default estimate is overwritten by measured
  self-calibration), and spacers keep the total height stable.
  Row wrappers all stay in the light DOM: `aria-rowcount` always reports the total, and controlled writes /
  validation / name renumbering / row operations / paste semantics are unchanged. When present, the
  `viewport-height` attribute is synced into the container's inline `max-height` (box height and window
  calculation share one source, so tail rows stay reachable when scrolled to the bottom; removing the attribute
  falls back to the CSS default of 320px, with the CSS `--oas-array-table-viewport-height` override); the header
  stays outside the scroll area (naturally sticky), and in virtual mode "add row" scrolls the new row into view
  and focuses its first field.
- Division of labour with the full-featured `oas-table`: this widget targets lightweight forms and does not do
  paging / server-side window fetching / bulk operations / cell merging (large local arrays use `virtual`
  windowed rendering).

<DemoBlock title="Inline-edit table: column annotations + row actions (duplicate / move / remove)">
  <oas-schema-form id="sf-table" style="width: 100%; max-width: 760px"></oas-schema-form>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-table-values">getValues()</oas-button>
    <oas-button id="sf-table-submit" type="primary">submit()</oas-button>
  </oas-space>
  <span id="sf-table-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<DemoBlock title="Resize columns / reorder columns / paste TSV (drag the header divider or header cells; paste multi-line TSV into a cell)">
  <oas-schema-form id="sf-table-enhance" style="width: 100%; max-width: 760px"></oas-schema-form>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-table-enhance-values">getValues()</oas-button>
  </oas-space>
  <span id="sf-table-enhance-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<DemoBlock title="Virtual scrolling (standalone usage: click to fill 300 rows, scroll to watch windowing)">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button id="sf-array-table-virtual-fill" type="button">Fill 300 rows</oas-button>
    <oas-array-table id="sf-array-table-virtual" name="users" virtual viewport-height="240" overscan="4" style="width: 100%; max-width: 560px"></oas-array-table>
    <span id="sf-array-table-virtual-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </oas-space>
</DemoBlock>

## Layout: grid / group / tabs

`layout.span` (1–24) occupies grid columns when the form uses `layout="grid"`. `layout.type="group"`
renders an object node as a group container; `layout.type="tabs"` with `tabs: [{ key, title, fields }]`
renders tabs (`role=tablist`, arrow keys / Home / End switch tabs). Fields omitted from every tab are
merged into the first tab with a dev warning (never silently dropped).

<DemoBlock title="Group + tabs + grid span">
  <oas-schema-form id="sf-layout" layout="grid" style="width: 100%; max-width: 760px"></oas-schema-form>
</DemoBlock>

## Error injection (server validation)

`setErrors([{ path, message, severity? }])` injects server errors. Paths are normalized by
`parseNamePath` (`users[0].name` equals `users.0.name`). **Injected errors take precedence over rule
errors until the field value changes again.** `severity: 'warning'` only informs (`role="status"`,
no `aria-invalid`); an error on the same path takes exclusive precedence.

<DemoBlock title="setErrors / clearErrors / warning">
  <oas-schema-form id="sf-errors" style="width: 100%; max-width: 640px"></oas-schema-form>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-errors-server">Inject server error</oas-button>
    <oas-button id="sf-errors-warning">Inject warning</oas-button>
    <oas-button id="sf-errors-clear">clearErrors()</oas-button>
    <oas-button id="sf-errors-validate">validate()</oas-button>
  </oas-space>
  <span id="sf-errors-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Controlled `values` and dirty state

In controlled mode the `values` property is the source of truth: it acts as the baseline on mount, and each
later change is written as a **leaf-level diff** (only changed paths, no DOM rebuild, no focus loss). A value
tree node that **exactly matches a rendered field name** is written as a whole value — array-valued fields
(`array of enum` → a single `oas-checkbox-group`) accept `{ tags: ['a', 'b'] }` directly, while object-array
container keys still descend to row fields. Keys removed by the host clear the corresponding field. Host
writes never emit `oas-values-change` (no echo loop); only user interaction does. Arrays grow via `min` (rows
are never removed by this channel — row removal stays with form-list). `setValues(patch)` is the method form
of the same channel; `dirty` compares against the component-held pristine snapshot (a small explicit piece
outside the kernel). When both `values` and `initialValues` are provided, `values` wins.

<DemoBlock title="Controlled values: host change → diff write; setValues() and dirty">
  <oas-schema-form id="sf-controlled" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-controlled-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-controlled-next" type="primary">Host writes new values</oas-button>
    <oas-button id="sf-controlled-clear">Clear email</oas-button>
    <oas-button id="sf-controlled-clear-tags">Clear tags</oas-button>
    <oas-button id="sf-controlled-dirty">dirty?</oas-button>
  </oas-space>
</DemoBlock>

## Custom widgets

`registerSchemaWidget(name, tag, { reader, writer })` maps a **registration name** to a custom element; the
schema only references the name (`uiSchema.widget: 'score'`). It calls `registerFormControl` internally (the
kernel's only value-collection extension point), so `reader` / `writer` must follow the kernel contract
(read a string, write the controlled value).

> **Hard constraint**: non-custom-element widgets (Vue / React components or native tags) cannot take part in
> value collection — the kernel matches value channels by element tag. A tag without a hyphen is rejected with
> a dev warning. Register before setting the schema.

<DemoBlock title="Custom widget: five-level score control (custom element + reader/writer)">
  <oas-schema-form id="sf-widget" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-widget-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Value transforms (`convert` / `transform`)

Both directions have a hook (bare keys; the host registers implementations and the schema only references the
name):

- `convert` (inbound): applied once **before writing into the component** on the three inbound channels —
  `initialValues` backfill, controlled `values`, `setValues()`. Typing, snapshot restore after a structure
  change and schema `default` never pass through it (otherwise values would be converted twice). Empty values
  are not passed to the hook. The hook **may return a Promise** (e.g. an exchange-rate lookup): the field keeps
  the host value until it resolves (documented stale window), late results are discarded by a per-path
  sequence guard, a user edit supersedes an in-flight conversion, and a rejection only logs a dev warning while
  keeping the host value. `transform` remains synchronous (an async transform is ignored with a dev warning).
- `transform` (outbound): applied to `getValues()` and to the `oas-submit` / `oas-validate-fail` /
  `oas-values-change` payloads (**`detail.values` / `detail.value` are rewritten in place**, bubbling continues,
  `target` unchanged).
- Signature `(value, fieldPath, wholeValues) => value`; only **leaf fields** are eligible (declaring it on a
  container warns and is ignored); array rows use wildcard paths (`users[].price`). A throwing or unregistered
  hook produces a dev warning and falls back to identity — values are never silently rewritten.
- Internal dirty state / snapshots / controlled write baseline always use the raw kernel values, so outbound
  transforms never change the "has it been edited" verdict.
- Register with `registerSchemaConverter(name, fn)` / `registerSchemaTransformer(name, fn)` (separate registry —
  expression functions must not be able to call value transforms, and names cannot collide).

<DemoBlock title="Value transforms: host passes yuan, the component collects cents (convert in / transform out)">
  <oas-schema-form id="sf-transform" style="width: 100%; max-width: 640px"></oas-schema-form>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-transform-submit" type="primary">submit()</oas-button>
    <oas-button id="sf-transform-values">getValues()</oas-button>
  </oas-space>
  <span id="sf-transform-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<DemoBlock title="Async conversion: convert returns a Promise (simulated exchange-rate call; the field keeps the host value until it lands)">
  <oas-schema-form id="sf-transform-async" style="width: 100%; max-width: 640px"></oas-schema-form>
  <oas-button id="sf-transform-async-rerun" style="margin-top: 12px">Write new values (re-convert)</oas-button>
  <span id="sf-transform-async-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Async options (`options.source`)

Options of option widgets (`oas-select` / `oas-radio-group` / `oas-checkbox-group`) can come from an async
function:

- `options.source = '<name>'`: register it with
  `registerSchemaOptionSource(name, (values, path) => Promise<Option[]>)`; `Option` is
  `{ label, value, disabled?, description? }` (same shape as the static `options` channel).
- `options.sourceDeps = ['<path>']`: declare value dependencies; when one of them changes the options reload
  automatically ("A changes → reload B"), otherwise no request is made.
- **Channel priority**: `enum` / `const` (data schema) > `options.options` (static list) > `options.source`;
  when several channels are declared the higher one wins with a one-time dev warning (the other channel is not
  silently dropped).
- **Races**: a per-field request sequence guard discards stale responses, identical requests during a rebuild are
  de-duplicated, and responses landing after unmount are dropped. Failure shows a status block below the widget
  (message + retry button, i18n); an empty result shows an empty-state text; loading is carried by the widgets'
  `loading` state (`oas-select` reuses its existing `loading`, `oas-radio-group` / `oas-checkbox-group` gained a
  `loading` boolean attribute that renders a spinner). `reloadOptions(path?)` lets the host refresh manually.
- When the default mapping would be a plain text input, a field declaring `options.source` is upgraded to
  `oas-select` (an options channel needs an option widget).
- The first SSR frame has no options: it renders the empty state (no skeleton), and data arrives after mount.

<DemoBlock title="Async options: province → city (sourceDeps) + failure retry">
  <oas-schema-form id="sf-options" style="width: 100%; max-width: 640px"></oas-schema-form>
  <oas-button id="sf-options-reload" style="margin-top: 12px">reloadOptions()</oas-button>
  <span id="sf-options-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Question widgets (matrix / rank) via uiSchema

Question widgets are part of the built-in widget table: set `widget: 'oas-matrix'` or `'oas-rank'` and inject
their data through the `options` channel — `rows` (array → JSON) for matrix sub-questions, `columns` (accepted
only by matrix and custom widgets) for matrix columns, and an `options` array for the rank items. Values are
still collected with the form core's string contract (JSON strings).

<DemoBlock title="matrix / rank driven by plain JSON">
  <oas-schema-form id="sf-question-types" style="width: 100%; max-width: 640px"></oas-schema-form>
  <oas-button id="sf-question-types-submit" type="primary" style="margin-top: 8px">Submit</oas-button>
  <span id="sf-question-types-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Composing with Questionnaire

The component implements the duck-typed contract (`getValues()` / `validate()` and emits
`oas-values-change`), so it can be used directly as questionnaire step content — the whole questionnaire
is driven by JSON while the questionnaire only handles step navigation and cross-step aggregation.

<DemoBlock title="A schema-form inside every questionnaire step">
  <oas-questionnaire id="sf-questionnaire" style="width: 100%; max-width: 560px" steps='[{"key":"base","title":"Basics"},{"key":"extra","title":"Extra"},{"key":"done","title":"Done"}]'>
    <oas-schema-form slot="step-base" style="width: 100%"></oas-schema-form>
    <oas-schema-form slot="step-extra" style="width: 100%"></oas-schema-form>
    <div slot="step-done" style="color: var(--oas-color-text-secondary)">Review the answers, then finish to submit the questionnaire.</div>
  </oas-questionnaire>
  <span id="sf-questionnaire-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Empty states

A missing or invalid `schema`, a non-object root, or zero fields all render a placeholder (never an
empty block). Compile error details are written to the placeholder `title`; empty arrays show a "no items"
hint. Every `uiSchema` path must exist in the data schema (use `users[].name` wildcards for arrays);
typos raise a dev warning.

<DemoBlock title="Empty states (no schema / invalid schema / no fields)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-schema-form id="sf-empty-none" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
    <oas-schema-form id="sf-empty-bad" schema='{bad json' style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
    <oas-schema-form id="sf-empty-fields" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../../.vitepress/theme/when-defined'

onMounted(() => {
  onUpgraded(document.getElementById('sf-basic'), () => {
    const basic = document.getElementById('sf-basic')
    basic.schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', title: 'Name', minLength: 2 },
        age: { type: 'integer', title: 'Age' },
        vip: { type: 'boolean', title: 'Member' },
        plan: { type: 'string', title: 'Plan', enum: ['basic', 'pro', 'team'] },
        mail: { type: 'string', title: 'Email', format: 'email' },
      },
    }
    basic.initialValues = { vip: true, plan: 'basic' }
    const out = document.getElementById('sf-basic-output')
    basic.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    basic.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.values(e.detail.errors).join('; ')}`
    })
    document.getElementById('sf-basic-submit')?.addEventListener('click', () => basic.submit())
    document.getElementById('sf-basic-validate')?.addEventListener('click', async () => {
      out.textContent = `validate() → ${(await basic.validate()) ? 'passed' : 'failed'}`
    })
    document.getElementById('sf-basic-values')?.addEventListener('click', () => {
      out.textContent = `getValues(): ${JSON.stringify(basic.getValues())}`
    })
    document.getElementById('sf-basic-reset')?.addEventListener('click', () => {
      basic.reset()
      out.textContent = 'reset(): back to initial values'
    })
  })

  onUpgraded(document.getElementById('sf-react'), () => {
    const react = document.getElementById('sf-react')
    react.schema = {
      type: 'object',
      required: ['plan'],
      properties: {
        plan: { type: 'string', title: 'Plan', enum: ['free', 'pro'] },
        country: { type: 'string', title: 'Country', enum: ['CN', 'US'] },
        province: { type: 'string', title: 'Province (required for CN)' },
        state: { type: 'string', title: 'State (visible for US)' },
        note: { type: 'string', title: 'Note (pro only)' },
      },
    }
    react.initialValues = { plan: 'free', country: 'CN' }
    react.uiSchema = {
      country: {
        reactions: [
          { whenSchema: { schema: { const: 'CN' } }, target: 'province', fulfill: { required: true } },
          { whenSchema: { schema: { const: 'CN' } }, target: 'state', fulfill: { visible: false } },
          { whenSchema: { schema: { const: 'US' } }, target: 'state', fulfill: { required: true } },
          { whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { visible: false } },
        ],
      },
      plan: {
        reactions: [{ whenSchema: { schema: { const: 'free' } }, target: 'note', fulfill: { disabled: true } }],
      },
    }
    const out = document.getElementById('sf-react-output')
    react.addEventListener('oas-values-change', (e) => {
      out.textContent = `Current values: ${JSON.stringify(e.detail.values)}`
    })
  })

  onUpgraded(document.getElementById('sf-react-value'), () => {
    const form = document.getElementById('sf-react-value')
    form.schema = {
      type: 'object',
      properties: {
        qty: { type: 'integer', title: 'Quantity' },
        price: { type: 'integer', title: 'Unit price' },
        total: { type: 'integer', title: 'Total (computed)' },
        discount: { type: 'string', title: 'Discount (unlocked at total ≥ 100)' },
      },
    }
    form.uiSchema = {
      qty: {
        reactions: [{ when: '{qty} > 0', target: 'total', fulfill: { value: '{qty} * {price}' } }],
      },
      price: {
        reactions: [
          { when: '{total} >= 100', target: 'discount', fulfill: { visible: true }, otherwise: { visible: false } },
        ],
      },
    }
    form.initialValues = { qty: 2, price: 30 }
    const out = document.getElementById('sf-react-value-output')
    form.addEventListener('oas-values-change', (e) => {
      out.textContent = `Current values: ${JSON.stringify(e.detail.values)}`
    })
  })

  onUpgraded(document.getElementById('sf-array'), () => {
    const array = document.getElementById('sf-array')
    array.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['nick'],
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              mail: { type: 'string', title: 'Email', format: 'email' },
            },
          },
        },
      },
    }
    array.initialValues = { users: [{ nick: 'Alice' }] }
    const out = document.getElementById('sf-array-output')
    array.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    array.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.entries(e.detail.errors).map(([k, v]) => `${k}=${v}`).join('; ')}`
    })
    document.getElementById('sf-array-submit')?.addEventListener('click', () => array.submit())
    document.getElementById('sf-array-reset')?.addEventListener('click', () => {
      array.reset()
      out.textContent = 'reset(): back to initial rows'
    })
  })

  onUpgraded(document.getElementById('sf-nested'), () => {
    const nested = document.getElementById('sf-nested')
    nested.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members',
          items: {
            type: 'object',
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              matrix: {
                type: 'array',
                title: 'Label groups',
                items: { type: 'object', properties: { label: { type: 'string', title: 'Label' } } },
              },
            },
          },
        },
      },
    }
    nested.initialValues = { users: [{ nick: 'Alice', matrix: [{ label: 'A' }, { label: 'B' }] }] }
    const out = document.getElementById('sf-nested-output')
    document.getElementById('sf-nested-values')?.addEventListener('click', () => {
      out.textContent = `getValues(): ${JSON.stringify(nested.getValues())}`
    })
  })

  onUpgraded(document.getElementById('sf-array-required'), () => {
    const arrayRequired = document.getElementById('sf-array-required')
    arrayRequired.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members (at least 1)',
          minItems: 1,
          items: {
            type: 'object',
            required: ['nick'],
            properties: { nick: { type: 'string', title: 'Nickname' } },
          },
        },
      },
    }
    const out = document.getElementById('sf-array-required-output')
    arrayRequired.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.entries(e.detail.errors).map(([k, v]) => `${k}=${v}`).join('; ')}`
    })
    arrayRequired.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    document.getElementById('sf-array-required-submit')?.addEventListener('click', () => arrayRequired.submit())
  })

  // ---- inline-edit table (array-table) ----
  onUpgraded(document.getElementById('sf-table'), () => {
    const table = document.getElementById('sf-table')
    table.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members (inline-edit table)',
          items: {
            type: 'object',
            required: ['nick'],
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              age: { type: 'integer', title: 'Age' },
              role: { type: 'string', title: 'Role', enum: ['dev', 'ops', 'pm'] },
            },
          },
        },
      },
    }
    table.uiSchema = {
      users: { widget: 'array-table' },
      'users[].nick': { width: 160, align: 'left' },
      'users[].age': { width: 96, align: 'right' },
    }
    table.initialValues = {
      users: [
        { nick: 'Alice', age: 28, role: 'dev' },
        { nick: 'Bob', age: 32, role: 'ops' },
      ],
    }
    const tableOut = document.getElementById('sf-table-output')
    const reportTable = (label) => {
      tableOut.textContent = `${label}: ${JSON.stringify(table.getValues())} (dirty=${table.dirty})`
    }
    table.addEventListener('oas-duplicate', (e) => reportTable(`oas-duplicate row ${e.detail.from + 1} → ${e.detail.to + 1}`))
    table.addEventListener('oas-move', (e) => reportTable(`oas-move row ${e.detail.from + 1} → ${e.detail.to + 1}`))
    table.addEventListener('oas-remove', (e) => reportTable(`oas-remove row ${e.detail.index + 1}`))
    table.addEventListener('oas-add', () => reportTable('oas-add appended'))
    document.getElementById('sf-table-values')?.addEventListener('click', () => reportTable('getValues()'))
    document.getElementById('sf-table-submit')?.addEventListener('click', () => table.submit())
    table.addEventListener('oas-submit', (e) => {
      tableOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    table.addEventListener('oas-validate-fail', (e) => {
      tableOut.textContent = `oas-validate-fail: ${Object.entries(e.detail.errors).map(([k, v]) => `${k}=${v}`).join('; ')}`
    })
  })

  onUpgraded(document.getElementById('sf-table-enhance'), () => {
    const table = document.getElementById('sf-table-enhance')
    table.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members (resizable / reorderable / paste-enabled)',
          maxItems: 6,
          items: {
            type: 'object',
            required: ['nick'],
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              age: { type: 'integer', title: 'Age' },
              role: { type: 'string', title: 'Role', enum: ['dev', 'ops', 'pm'] },
            },
          },
        },
      },
    }
    table.uiSchema = {
      users: { widget: 'array-table' },
      'users[].nick': { width: 160 },
      'users[].age': { width: 96, align: 'right' },
      'users[].role': { width: 120 },
    }
    table.initialValues = {
      users: [
        { nick: 'Alice', age: 28, role: 'dev' },
        { nick: 'Bob', age: 32, role: 'ops' },
      ],
    }
    const out = document.getElementById('sf-table-enhance-output')
    const report = (label) => {
      out.textContent = `${label}: ${JSON.stringify(table.getValues())} (dirty=${table.dirty})`
    }
    table.addEventListener('oas-paste', (e) => {
      const detail = e.detail
      report(
        `oas-paste from row ${detail.startRow + 1}, column ${detail.startColumn + 1}: filled ${detail.rows} rows × ${detail.columns} columns` +
          (detail.truncated ? ' (truncated to maxItems)' : ''),
      )
    })
    document.getElementById('sf-table-enhance-values')?.addEventListener('click', () => report('getValues()'))
  })

  // ---- array-table virtual scrolling (standalone usage): columns + row template via JS + 300-row windowing ----
  const virtualTable = document.getElementById('sf-array-table-virtual')
  onUpgraded(virtualTable, () => {
    if (!virtualTable) return
    virtualTable.columns = [
      { key: 'nick', label: 'Nickname', width: 200 },
      { key: 'age', label: 'Age', width: 96, align: 'right' },
    ]
    const tpl = document.createElement('template')
    tpl.innerHTML =
      '<oas-form-item data-schema-key="field:users.[].nick"><oas-input name="nick"></oas-input></oas-form-item>' +
      '<oas-form-item data-schema-key="field:users.[].age"><oas-input-number name="age"></oas-input-number></oas-form-item>'
    virtualTable.appendChild(tpl)
  })
  document.getElementById('sf-array-table-virtual-fill')?.addEventListener('click', () => {
    if (!virtualTable) return
    virtualTable.setRowCount(300)
    const mounted = virtualTable.shadowRoot?.querySelectorAll('.row-frame').length ?? 0
    const ariaRows = virtualTable.shadowRoot?.querySelector('[role="table"]')?.getAttribute('aria-rowcount') ?? '-'
    const out = document.getElementById('sf-array-table-virtual-output')
    if (out) out.textContent = `Filled: ${virtualTable.rowCount} rows total · ${mounted} frames mounted in the viewport · aria-rowcount=${ariaRows} (total never windowed)`
  })

  onUpgraded(document.getElementById('sf-layout'), () => {
    const layout = document.getElementById('sf-layout')
    layout.schema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          title: 'Profile',
          properties: {
            nickname: { type: 'string', title: 'Nickname' },
            mail: { type: 'string', title: 'Email', format: 'email' },
            phone: { type: 'string', title: 'Phone' },
          },
        },
        advanced: {
          type: 'object',
          title: 'Advanced',
          properties: {
            region: { type: 'string', title: 'Region', enum: ['cn', 'us', 'eu'] },
            quota: { type: 'integer', title: 'Quota' },
            remark: { type: 'string', title: 'Remark' },
          },
        },
      },
    }
    layout.uiSchema = {
      profile: { layout: { span: 12, type: 'group', title: 'Profile' } },
      advanced: {
        layout: {
          span: 12,
          type: 'tabs',
          title: 'Advanced',
          tabs: [
            { key: 'region', title: 'Region', fields: ['region'] },
            { key: 'quota', title: 'Quota', fields: ['quota', 'remark'] },
          ],
        },
      },
      'profile.nickname': { layout: { span: 12 } },
      'profile.phone': { layout: { span: 12 } },
    }
  })

  onUpgraded(document.getElementById('sf-errors'), () => {
    const errors = document.getElementById('sf-errors')
    errors.schema = {
      type: 'object',
      properties: {
        account: { type: 'string', title: 'Account' },
        mail: { type: 'string', title: 'Email', format: 'email' },
      },
    }
    errors.initialValues = { account: 'alice', mail: 'alice@example.com' }
    const out = document.getElementById('sf-errors-output')
    document.getElementById('sf-errors-server')?.addEventListener('click', () => {
      errors.setErrors([
        { path: 'account', message: 'Server: account is taken' },
        { path: 'mail', message: 'Server: email is registered' },
      ])
      out.textContent = 'Two server errors injected (they fall back to rule errors after edits)'
    })
    document.getElementById('sf-errors-warning')?.addEventListener('click', () => {
      errors.clearErrors()
      errors.setErrors([{ path: 'mail', message: 'Consider a corporate email', severity: 'warning' }])
      out.textContent = 'Warning injected: informational, validate() still passes'
    })
    document.getElementById('sf-errors-clear')?.addEventListener('click', () => {
      errors.clearErrors()
      out.textContent = 'clearErrors(): injected errors cleared'
    })
    document.getElementById('sf-errors-validate')?.addEventListener('click', async () => {
      out.textContent = `validate() → ${(await errors.validate()) ? 'passed' : 'failed'}`
    })
  })

  onUpgraded(document.getElementById('sf-questionnaire'), () => {
    const q = document.getElementById('sf-questionnaire')
    const [base, extra] = q.querySelectorAll('oas-schema-form')
    base.schema = {
      type: 'object',
      required: ['nickname'],
      properties: {
        nickname: { type: 'string', title: 'Nickname', minLength: 2 },
        mail: { type: 'string', title: 'Email', format: 'email' },
      },
    }
    extra.schema = {
      type: 'object',
      properties: {
        role: { type: 'string', title: 'Role', enum: ['dev', 'ops', 'pm'] },
        tags: { type: 'array', title: 'Skills', items: { enum: ['css', 'js', 'docs'] } },
      },
    }
    const out = document.getElementById('sf-questionnaire-output')
    q.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
  })

  onUpgraded(document.getElementById('sf-empty-fields'), () => {
    const emptyFields = document.getElementById('sf-empty-fields')
    emptyFields.schema = { type: 'object', properties: {} }
  })

  // ---- when expression track ----
  onUpgraded(document.getElementById('sf-expr'), () => {
    const expr = document.getElementById('sf-expr')
    expr.schema = {
      type: 'object',
      properties: {
        plan: { type: 'string', title: 'Plan', enum: ['free', 'pro', 'team'] },
        seats: { type: 'integer', title: 'Seats' },
        invoice: { type: 'string', title: 'Invoice title' },
        note: { type: 'string', title: 'Note (required unless free)' },
      },
    }
    expr.initialValues = { plan: 'free', seats: 3 }
    expr.uiSchema = {
      plan: {
        reactions: [
          {
            when: "$self != 'free' && {seats} >= 5",
            target: 'invoice',
            fulfill: { visible: true },
            otherwise: { visible: false },
          },
          { when: "$self != 'free'", target: 'note', fulfill: { required: true } },
        ],
      },
    }
    const out = document.getElementById('sf-expr-output')
    expr.addEventListener('oas-values-change', (e) => {
      out.textContent = `values: ${JSON.stringify(e.detail.values)} (expression track refreshes via the dependency graph)`
    })
  })

  // ---- nested array-level validation ----
  onUpgraded(document.getElementById('sf-array-nested-error'), () => {
    const nestedError = document.getElementById('sf-array-nested-error')
    nestedError.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members',
          items: {
            type: 'object',
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              tags: {
                type: 'array',
                title: 'Tags (at least 1)',
                minItems: 1,
                items: { type: 'object', properties: { label: { type: 'string', title: 'Tag' } } },
              },
            },
          },
        },
      },
    }
    nestedError.initialValues = { users: [{ nick: 'Alice', tags: [] }] }
    const out = document.getElementById('sf-array-nested-error-output')
    nestedError.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.entries(e.detail.errors)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`
    })
    nestedError.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    document.getElementById('sf-array-nested-error-submit')?.addEventListener('click', () => nestedError.submit())
  })

  // ---- controlled values ----
  onUpgraded(document.getElementById('sf-controlled'), () => {
    const controlled = document.getElementById('sf-controlled')
    controlled.values = { name: 'Alice', mail: 'alice@example.com', level: 'basic', tags: ['a', 'b'] }
    controlled.schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        mail: { type: 'string', title: 'Email', format: 'email' },
        level: { type: 'string', title: 'Level', enum: ['basic', 'pro'] },
        // array of enum → a single oas-checkbox-group: array-valued field written as a whole
        tags: { type: 'array', title: 'Tags', items: { enum: ['a', 'b', 'c'] } },
      },
    }
    const out = document.getElementById('sf-controlled-output')
    const report = (label) => {
      out.textContent = `${label}: values=${JSON.stringify(controlled.values)}; dirty=${controlled.dirty}`
    }
    report('Mounted (host values are the baseline)')
    controlled.addEventListener('oas-values-change', () => report('After user edit (event still fires)'))
    document.getElementById('sf-controlled-next')?.addEventListener('click', () => {
      controlled.values = { name: 'Bob', mail: 'bob@example.com', level: 'pro', tags: ['c'] }
      report('Host writes new values → diff write')
    })
    document.getElementById('sf-controlled-clear')?.addEventListener('click', () => {
      const next = { ...controlled.values }
      delete next.mail
      controlled.values = next
      report('Removed mail key → field cleared')
    })
    document.getElementById('sf-controlled-clear-tags')?.addEventListener('click', () => {
      const next = { ...controlled.values }
      delete next.tags
      controlled.values = next
      report('Removed tags key → array-valued field cleared')
    })
    document.getElementById('sf-controlled-dirty')?.addEventListener('click', () => report('dirty check'))
  })

  // ---- value transforms (convert / transform) ----
  onUpgraded(document.getElementById('sf-transform'), () => {
    void import('@oas-ui/ui/form/schema-form').then(({ registerSchemaConverter, registerSchemaTransformer }) => {
      registerSchemaConverter('yuanToCents', (value) => String(Math.round(Number(value) * 100)))
      registerSchemaTransformer('centsToYuan', (value) => (Number(value) / 100).toFixed(2))
      const transform = document.getElementById('sf-transform')
      transform.schema = {
        type: 'object',
        properties: {
          price: { type: 'number', title: 'Amount (yuan)' },
          vip: { type: 'boolean', title: 'Member price' },
        },
      }
      transform.uiSchema = { price: { convert: 'yuanToCents', transform: 'centsToYuan' } }
      transform.initialValues = { price: 19.9, vip: true }
      const out = document.getElementById('sf-transform-output')
      document.getElementById('sf-transform-submit')?.addEventListener('click', () => transform.submit())
      document.getElementById('sf-transform-values')?.addEventListener('click', () => {
        out.textContent = `getValues() (after transform): ${JSON.stringify(transform.getValues())}`
      })
      transform.addEventListener('oas-submit', (e) => {
        out.textContent = `oas-submit (after transform): ${JSON.stringify(e.detail.values)}`
      })
    })
  })

  // ---- async conversion (convert returns a Promise) ----
  onUpgraded(document.getElementById('sf-transform-async'), () => {
    void import('@oas-ui/ui/form/schema-form').then(({ registerSchemaConverter }) => {
      // Simulated rate API: resolves after 600ms; the field keeps the host value during the stale window
      registerSchemaConverter(
        'asyncRate',
        (value) => new Promise((resolve) => setTimeout(() => resolve(String(Math.round(Number(value) * 7.2))), 600)),
      )
      const form = document.getElementById('sf-transform-async')
      form.schema = { type: 'object', properties: { usd: { type: 'number', title: 'USD amount (converted to cents)' } } }
      form.uiSchema = { usd: { convert: 'asyncRate' } }
      form.initialValues = { usd: 10 }
      const out = document.getElementById('sf-transform-async-output')
      out.textContent = 'Converting… (the field temporarily shows the host value)'
      setTimeout(() => {
        out.textContent = `Converted: ${JSON.stringify(form.getValues())}`
      }, 900)
      document.getElementById('sf-transform-async-rerun')?.addEventListener('click', () => {
        out.textContent = 'Converting… (the new value lands after 600ms)'
        form.setValues({ usd: Math.round(Math.random() * 90 + 10) })
        setTimeout(() => {
          out.textContent = `Converted: ${JSON.stringify(form.getValues())}`
        }, 900)
      })
    })
  })

  // ---- async options (options.source / sourceDeps) ----
  onUpgraded(document.getElementById('sf-options'), () => {
    void import('@oas-ui/ui/form/schema-form').then(({ registerSchemaOptionSource }) => {
      let flakyAttempt = 0
      const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 350))
      registerSchemaOptionSource('provinces', () =>
        wait([
          { label: 'Zhejiang', value: 'zj' },
          { label: 'Jiangsu', value: 'js' },
        ]),
      )
      registerSchemaOptionSource('cities', (values) => {
        const map = {
          zj: [
            { label: 'Hangzhou', value: 'hz' },
            { label: 'Ningbo', value: 'nb' },
          ],
          js: [
            { label: 'Nanjing', value: 'nj' },
            { label: 'Suzhou', value: 'sz' },
          ],
        }
        return wait(map[values.province] ?? [])
      })
      // fails once, then succeeds: demonstrates the failure state + retry button
      registerSchemaOptionSource('flakyPlans', () => {
        flakyAttempt += 1
        return flakyAttempt === 1
          ? Promise.reject(new Error('demo network error'))
          : wait([{ label: 'Standard', value: 'std' }])
      })
      const options = document.getElementById('sf-options')
      options.schema = {
        type: 'object',
        properties: {
          province: { type: 'string', title: 'Province (async options)' },
          city: { type: 'string', title: 'City (depends on province)' },
          plan: { type: 'string', title: 'Plan (fails on first load, retryable)' },
        },
      }
      options.uiSchema = {
        province: { options: { source: 'provinces' } },
        city: { options: { source: 'cities', sourceDeps: ['province'] } },
        plan: { options: { source: 'flakyPlans' } },
      }
      const out = document.getElementById('sf-options-output')
      out.textContent = 'Province and plan are loading (select loading); city loads after a province is chosen.'
      document.getElementById('sf-options-reload')?.addEventListener('click', () => {
        options.reloadOptions()
        out.textContent = 'reloadOptions(): every option source re-requested'
      })
      options.addEventListener('oas-values-change', (e) => {
        out.textContent = `Current values: ${JSON.stringify(e.detail.values)}`
      })
    })
  })

  // ---- question widgets (matrix / rank): data travels through uiSchema.options ----
  onUpgraded(document.getElementById('sf-question-types'), () => {
    const types = document.getElementById('sf-question-types')
    types.schema = {
      type: 'object',
      properties: {
        review: { type: 'object', title: 'Service review (matrix)' },
        priority: { type: 'array', title: 'Priority (ranking)', items: { type: 'string' } },
      },
    }
    types.uiSchema = {
      review: {
        widget: 'oas-matrix',
        options: {
          rows: [
            { key: 'speed', label: 'Response speed' },
            { key: 'quality', label: 'Content quality' },
          ],
          columns: [
            { key: 'bad', label: 'Poor' },
            { key: 'ok', label: 'Fair' },
            { key: 'good', label: 'Good' },
          ],
        },
      },
      priority: {
        widget: 'oas-rank',
        options: {
          options: [
            { key: 'urgent', label: 'Urgent' },
            { key: 'normal', label: 'Normal' },
            { key: 'low', label: 'Can wait' },
          ],
        },
      },
    }
    const typesOut = document.getElementById('sf-question-types-output')
    types.addEventListener('oas-values-change', (e) => {
      typesOut.textContent = `Current values: ${JSON.stringify(e.detail.values)}`
    })
    types.addEventListener('oas-submit', (e) => {
      typesOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    document.getElementById('sf-question-types-submit')?.addEventListener('click', () => types.submit())
  })

  // ---- custom widget ----
  onUpgraded(document.getElementById('sf-widget'), () => {
    // 组件入口含 HTMLElement 依赖（SSG 阶段没有该全局）→ 页内按需动态 import
    void import('@oas-ui/ui/form/schema-form').then(({ registerSchemaWidget }) => {
    if (!customElements.get('x-score-input')) {
      customElements.define(
        'x-score-input',
        class extends HTMLElement {
          static get observedAttributes() {
            return ['value']
          }
          connectedCallback() {
            this.render()
          }
          attributeChangedCallback() {
            this.render()
          }
          render() {
            if (!this.shadowRoot) this.attachShadow({ mode: 'open' })
            const current = this.getAttribute('value') ?? ''
            const root = this.shadowRoot
            root.textContent = ''
            for (let score = 1; score <= 5; score++) {
              const button = document.createElement('button')
              const active = current === String(score)
              button.type = 'button'
              button.textContent = String(score)
              button.setAttribute('aria-pressed', String(active))
              button.style.cssText = [
                'margin-inline-end: 4px',
                'padding: 2px 8px',
                'border-radius: var(--oas-radius-sm)',
                'border: 1px solid ' + (active ? 'var(--oas-color-primary)' : 'var(--oas-color-border)'),
                'background: ' + (active ? 'var(--oas-color-bg-hover)' : 'transparent'),
                'color: var(--oas-color-text-primary)',
                'font-weight: ' + (active ? '600' : '400'),
                'cursor: pointer',
              ].join(';')
              button.addEventListener('click', () => {
                this.setAttribute('value', String(score))
                this.dispatchEvent(
                  new CustomEvent('oas-change', { bubbles: true, composed: true, detail: { value: String(score) } }),
                )
              })
              root.appendChild(button)
            }
          }
        },
      )
    }
    registerSchemaWidget('score', 'x-score-input', {
      reader: (element) => element.getAttribute('value') ?? '',
      writer: (element, value) => element.setAttribute('value', value),
    })
    const widget = document.getElementById('sf-widget')
    widget.schema = {
      type: 'object',
      properties: {
        score: { type: 'integer', title: 'Satisfaction (1-5)' },
        comment: { type: 'string', title: 'Comment' },
      },
    }
    widget.uiSchema = { score: { widget: 'score' } }
    widget.values = { score: 4 }
    const out = document.getElementById('sf-widget-output')
    widget.addEventListener('oas-values-change', (e) => {
      out.textContent = `values: ${JSON.stringify(e.detail.values)} (custom widget reads through its reader)`
    })
    })
  })
})
</script>

## API

### oas-schema-form

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disables the whole form through the kernel form chain (fields and array add/remove buttons). | — | — |
| `initial-values` | Uncontrolled one-time baseline (nested object). Deep-merged over schema `default` with host values winning; the initial array length drives row creation. | `Record<string, unknown> \| string` | — |
| `label-align` | Forwarded to the inner oas-form label alignment (top / left / right). | — | — |
| `label-width` | Forwarded to the inner oas-form label width. | — | — |
| `layout` | Forwarded to the inner oas-form layout (with `grid`, fields occupy columns by `layout.span`). | — | — |
| `schema` | Data schema (a JSON Schema subset). Dual channel: property (object, preferred) and attribute (JSON string); an attribute changed after the property invalidates the property (drift guard). | `unknown` | — |
| `size` | Forwarded to the inner oas-form size. | — | — |
| `ui-schema` | UI annotation layer (bare keys: `widget` / `layout` / `options` / `reactions` / `keepValueOnHidden` / `convert` / `transform` / column-level `width` / `align` / `hidden`). Dual channel; every path is verified against the data schema at compile time. | `unknown` | — |
| `validate-trigger` | Forwarded to the inner oas-form field validation trigger (input / change / blur). | — | — |
| `values` | Controlled values (V1b): object property plus JSON-string attribute channel. Acts as the baseline on mount, then each change is written as a leaf-level diff (no DOM rebuild, no focus loss); a node that exactly matches a rendered field name is written as a whole value (array-valued fields such as `array of enum` → `oas-checkbox-group` take `["a","b"]` directly, while object-array container keys still descend to row fields); host writes never emit `oas-values-change` (no echo loop); wins over `initialValues` when both are provided. | `Record<string, unknown> \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `submit` | `submit(): void` | Submit: evaluates reactions, runs kernel field validation, then array-level validation and injects its errors, and finally delegates to the kernel (design order: kernel first, array-level second; oas-submit / oas-validate-fail are dispatched by the kernel and bubble out, failure payload = field errors ∪ array-level errors). |
| `validate` | `validate(): Promise<boolean>` | Validate: reactions → kernel field validation → array-level validation (union of errors); returns whether everything passes. |
| `getValues` | `getValues(): Record<string, unknown>` | Current form values using the kernel string semantics (leaves are always strings, arrays are JSON strings); fields configured with `transform` are mapped back to host semantics. |
| `reloadOptions` | `reloadOptions(path?: string): void` | Manually reload async options (`options.source`): omit the path to reload everything. Shares the race guards with automatic loading (sequence / de-duplication / drop after unmount); a manual call always starts a fresh request. |
| `setValues` | `setValues(patch: Record<string, unknown>): void` | Controlled write channel (V1b): writes field values by nested path through the kernel `oas-form.setValues` and the control writer registry; a path that exactly matches a rendered field name is written as a whole value (array-valued fields are not split into index paths), container keys still descend; only rendered fields are written, no events are emitted and no DOM is rebuilt; unrendered paths are skipped (row count stays with form-list). |
| `setErrors` | `setErrors(list: FormError[]): void` | Inject errors (for server validation). Path normalization and precedence are handled by the form kernel. |
| `clearErrors` | `clearErrors(paths?: string[]): void` | Clear injected errors (omit paths to clear all); affected fields fall back to rule errors. |
| `reset` | `reset(): void` | Reset: back to initial values, clear errors, array rows back to their initial length (no events). |
