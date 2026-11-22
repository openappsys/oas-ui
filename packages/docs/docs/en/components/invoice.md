---
description: "Invoice form: personal/company title switching, tax ID validation, invoice content selection and a saved-title picker popup."
---

# Invoice

Invoice information form: title-type switching, title and tax ID validation, invoice content selection and a saved-title popup. All data is host-injected (`contents` / `save-titles`); the component stores nothing.

## Basic usage

A personal title only needs the title text; `contents` injects invoice content options.

<DemoBlock title="Personal title">
  <oas-invoice
    title="Zhang San"
    contents='[{"value":"goods","label":"Goods"},{"value":"services","label":"Services"},{"value":"other","label":"Other"}]'
  ></oas-invoice>
</DemoBlock>

## Company title and tax ID validation

`type="company"` shows the tax ID field; the tax ID must be 15–20 letters or digits. A failed submit emits `oas-invalid` and focuses the first invalid field.

<DemoBlock title="Company title">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-invoice
      id="invoice-company-demo"
      type="company"
      title="Example Technology Co., Ltd."
      tax-id="91330100MA2AB1234X"
      contents='[{"value":"goods","label":"Goods"},{"value":"services","label":"Services"}]'
    ></oas-invoice>
    <oas-tag type="success" id="invoice-company-info">Waiting for submit</oas-tag>
  </oas-space>
</DemoBlock>

## Saved-title popup

`save-titles` injects historical titles: the trigger opens a `role="listbox"` popup with `↑` / `↓` navigation, `Enter` to pick, `Esc` to close and return focus, and outside click to close. Picking fills type / title / tax ID and emits `oas-title-select`.

<DemoBlock title="Pick a saved title">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-invoice
      id="invoice-saved-demo"
      contents='[{"value":"goods","label":"Goods"},{"value":"services","label":"Services"}]'
      save-titles='[{"id":"t1","type":"company","title":"Example Technology Co., Ltd.","taxId":"91330100MA2AB1234X"},{"id":"t2","type":"personal","title":"Zhang San"},{"id":"t3","type":"company","title":"Example Trading Co., Ltd.","taxId":"91330200MA2CD5678Y"}]'
    ></oas-invoice>
    <oas-tag type="primary" id="invoice-saved-info">No saved title selected</oas-tag>
  </oas-space>
</DemoBlock>

## Title-type switching

The type switch is a radio group (`role="radiogroup"`) supporting `←` / `→`. Switching keeps the typed title draft and emits `oas-change` (`detail { field: 'type', value }`).

<DemoBlock title="Type switch">
  <oas-invoice
    type="personal"
    contents='[{"value":"goods","label":"Goods"},{"value":"services","label":"Services"}]'
  ></oas-invoice>
</DemoBlock>

## Data contract

- `contents`: `[{ "value": string, "label": string }]`; the content field is hidden when absent or invalid
- `save-titles`: `[{ "id"?: string, "type": "personal" | "company", "title": string, "taxId"?: string }]`; the entry is hidden when absent or invalid
- Submitted value: `{ type, title, taxId, content }` via `detail.value` of `oas-submit`

## Accessibility

- Inputs are label-associated; errors use `aria-invalid` / `aria-describedby`
- Saved-title popup: trigger has `aria-haspopup="listbox"` + `aria-expanded`; the listbox has an accessible name
- With `disabled` / `readonly`, inputs, popup trigger and submit are disabled

<DemoBlock title="Disabled">
  <oas-invoice disabled title="Zhang San" type="personal"></oas-invoice>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const company = document.getElementById('invoice-company-demo')
  const companyInfo = document.getElementById('invoice-company-info')
  company?.addEventListener('oas-invalid', (e) => {
    companyInfo.textContent = `Invalid: ${e.detail.fields.join(' / ')}`
  })
  company?.addEventListener('oas-submit', (e) => {
    companyInfo.textContent = `Submitted: ${e.detail.value.title}`
  })
  const saved = document.getElementById('invoice-saved-demo')
  const savedInfo = document.getElementById('invoice-saved-info')
  saved?.addEventListener('oas-title-select', (e) => {
    savedInfo.textContent = `Picked: ${e.detail.value.title}`
  })
})
</script>

## API

### oas-invoice

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `content` | Selected invoice content (controlled); must match a value in contents | `string` | — |
| `contents` | Invoice content options (host-injected): JSON array [{ value, label }]; the content field is hidden when absent or invalid | `string` | — |
| `disabled` | Disables all inputs, the popup entry and submit | `boolean` | — |
| `readonly` | Read-only: focusable and copyable, but cannot edit / select / submit | `boolean` | — |
| `save-titles` | Saved titles (host-injected): JSON array [{ id?, type, title, taxId? }]; the popup entry is hidden when absent or invalid | `string` | — |
| `tax-id` | Tax ID (controlled); validated as 15–20 letters or digits for company titles | `string` | — |
| `title` | Invoice title (controlled); typing emits oas-change and a successful submit writes it back | `string` | — |
| `type` | Title type: personal (default) / company; company shows and validates the tax ID | `string` | `personal` |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted on field or title-type change; detail { field, value } (field: type / title / taxId / content / saved) |
| `oas-invalid` | Emitted when submit validation fails; detail { fields }, marks errors and focuses the first invalid field |
| `oas-submit` | Emitted when validation passes; detail { value } ({ type, title, taxId, content }) |
| `oas-title-select` | Emitted when a saved title is picked; detail { id, value } (value already applied to the form) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-invoice-width` | `100%` |
