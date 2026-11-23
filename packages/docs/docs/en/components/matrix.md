---
description: Matrix question with rows (sub-questions) and columns (options), radio or checkbox mode, JSON attributes plus object properties, row-level / table-level required validation, fieldset + legend row headers and in-row arrow-key navigation.
---

# Matrix

A matrix choice with rows as sub-questions and columns as options: `mode="radio"` (default) selects one option per row, `mode="checkbox"` allows multiple. The value is a JSON object — `{ rowKey: columnKey }` for radio and `{ rowKey: [columnKey] }` for checkbox.

## Basic usage (radio)

Click any cell to select. Both row headers and column headers are part of each control's accessible name.

<DemoBlock title="Satisfaction matrix">
  <oas-matrix
    id="mx-basic"
    label="Rate our service"
    rows='[{"key":"speed","label":"Response speed"},{"key":"quality","label":"Content quality"},{"key":"attitude","label":"Service attitude"}]'
    columns='[{"key":"bad","label":"Poor"},{"key":"ok","label":"Fair"},{"key":"good","label":"Good"},{"key":"great","label":"Great"}]'
  ></oas-matrix>
  <span id="mx-basic-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Not answered yet</span>
</DemoBlock>

## Checkbox mode

Each row accepts multiple options. `required-scope="table"` means at least one row must be answered.

<DemoBlock title="mode=&quot;checkbox&quot;">
  <oas-matrix
    id="mx-check"
    mode="checkbox"
    label="How did you hear about us?"
    rows='[{"key":"online","label":"Online channels"},{"key":"offline","label":"Offline channels"}]'
    columns='[{"key":"search","label":"Search"},{"key":"social","label":"Social media"},{"key":"friend","label":"Friend referral"}]'
    required
    required-scope="table"
  ></oas-matrix>
  <span id="mx-check-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Select at least one option</span>
</DemoBlock>

## Required validation (survey scenario)

`required` defaults to row-level validation (every row must be answered). Clicking "Submit survey" calls `validate()`: failures show an error and dispatch `oas-invalid`; answering later re-checks silently and clears the error once complete.

<DemoBlock title="Row-level required + validate()">
  <oas-matrix
    id="mx-required"
    label="Complete the evaluation"
    rows='[{"key":"speed","label":"Response speed"},{"key":"quality","label":"Content quality"}]'
    columns='[{"key":"bad","label":"Poor"},{"key":"ok","label":"Fair"},{"key":"good","label":"Good"}]'
    required
  ></oas-matrix>
  <oas-button id="mx-required-submit" type="primary">Submit survey</oas-button>
  <span id="mx-required-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Disabled and readonly

`disabled` blocks all interaction; `readonly` keeps the normal appearance and selections but ignores interaction and keeps the value unchanged.

<DemoBlock title="disabled / readonly">
  <oas-space direction="vertical" style="width: 100%">
    <oas-matrix
      rows='[{"key":"a","label":"Disabled row"},{"key":"b","label":"Another row"}]'
      columns='[{"key":"x","label":"Option A"},{"key":"y","label":"Option B"}]'
      value='{"a":"x"}'
      disabled
    ></oas-matrix>
    <oas-matrix
      rows='[{"key":"a","label":"Readonly row"},{"key":"b","label":"Another row"}]'
      columns='[{"key":"x","label":"Option A"},{"key":"y","label":"Option B"}]'
      value='{"a":"y","b":"x"}'
      readonly
    ></oas-matrix>
  </oas-space>
</DemoBlock>

## Inside oas-form (generic form scenario)

A matrix is registered in the `oas-form` collection chain (the `value` channel; the form value is a JSON string), so a named matrix submits with the form and participates in `initial-values` / `reset`. The example below validates the matrix itself and merges its `value` — per-row required errors only show after `validate()`.

<DemoBlock title="Matrix inside a form">
  <oas-form id="mx-form" style="width: 100%; max-width: 620px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="Name"></oas-input>
      <oas-matrix
        id="mx-form-matrix"
        label="Rate our service"
        rows='[{"key":"speed","label":"Response speed"},{"key":"quality","label":"Content quality"}]'
        columns='[{"key":"bad","label":"Poor"},{"key":"ok","label":"Fair"},{"key":"good","label":"Good"}]'
        required
      ></oas-matrix>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit form</oas-button>
    </oas-space>
  </oas-form>
  <span id="mx-form-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Keyboard and accessibility

- Each row is a `fieldset` with a `legend` row header; options are native `input[type=radio|checkbox]` whose accessible name combines the row header and column header
- Radio rows use roving tabindex (one tab stop per row); arrow keys move and select within a row, Home / End jump to the first / last column, and left/right mirror under RTL
- Required hints and error text are linked with `aria-describedby`; invalid options carry `aria-invalid`

## Validation semantics

- `required` makes the question required; `required-scope="row"` (default) requires every row, `required-scope="table"` requires at least one answered row
- `validate()` returns whether it passed; failures show the error and dispatch `oas-invalid` (`detail: { reason, scope, missingRows, value }`)
- Disabled rows and rows where every column is disabled are excluded from required checks

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  const read = (el) => JSON.stringify(el.value)

  const basic = document.getElementById('mx-basic')
  basic?.addEventListener('oas-change', (event) => {
    text('mx-basic-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
  })

  const check = document.getElementById('mx-check')
  check?.addEventListener('oas-change', (event) => {
    text('mx-check-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
  })

  const required = document.getElementById('mx-required')
  document.getElementById('mx-required-submit')?.addEventListener('click', () => {
    const ok = required.validate()
    if (ok) text('mx-required-out', `Passed: ${read(required)}`)
  })
  required?.addEventListener('oas-invalid', (event) => {
    text('mx-required-out', `oas-invalid: ${event.detail.missingRows.length} row(s) missing (${event.detail.missingRows.join(', ')})`)
  })

  const form = document.getElementById('mx-form')
  const formMatrix = document.getElementById('mx-form-matrix')
  form?.addEventListener('oas-submit', (event) => {
    const ok = formMatrix.validate()
    if (!ok) {
      text('mx-form-out', 'Please complete the matrix first (every row is required)')
      return
    }
    text('mx-form-out', `oas-submit: ${JSON.stringify({ ...event.detail.values, review: formMatrix.value })}`)
  })
})
</script>

## API

### oas-matrix

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `columns` | Options (columns) as a JSON array, same shape as `rows` | `MatrixColumn[] \| string` | — |
| `disabled` | Disable every row and column (per-row / per-column `disabled` still applies) | `boolean` | — |
| `label` | Question text (rendered as a caption and used as the group accessible name) | `string` | — |
| `mode` | In-row selection mode: `radio` (default) or `checkbox`; invalid values fall back to `radio` with a warning | `string` | `radio` |
| `readonly` | Readonly: keeps the appearance and selections but ignores interaction | `boolean` | — |
| `required` | Required: combined with `required-scope` for row-level or table-level semantics | `boolean` | — |
| `required-scope` | Required scope: `row` every row (default) / `table` at least one answered row | `string` | `row` |
| `rows` | Sub-questions (rows) as a JSON array `[{ key, label?, disabled? }]`; string items collapse to `key=label` | `MatrixRow[] \| string` | — |
| `value` | Value JSON object: radio `{ rowKey: columnKey }` / checkbox `{ rowKey: [columnKey] }` (written back on user interaction) | `MatrixValue \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `columns` | Option (column) list: get+set channel (array or JSON string); assignment applies immediately without events | `MatrixColumn[] \| string` | — |
| `rows` | Row (sub-question) list: get+set channel (array or JSON string); assignment applies immediately without events | `MatrixRow[] \| string` | — |
| `value` | Current value: get+set channel (object or JSON string); assignment applies immediately without events | `MatrixValue \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `validate` | `validate(): boolean` | Validate the required semantics and sync the visible error; returns whether it passed (dispatches `oas-invalid` on failure) |
| `clear` | `clear(): void` | Clear all selections (dispatches `oas-change`) |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Dispatched when the user changes a selection, `detail: { value, rowKey, columnKey, checked }` |
| `oas-invalid` | Dispatched when `validate()` fails, `detail: { reason, scope, missingRows, value }` |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-matrix-label-width` | Row label column width (default `34%`) | `34%` |
