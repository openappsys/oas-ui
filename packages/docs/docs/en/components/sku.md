---
description: "Product spec picker panel: specs + skus data contract, exact SKU matching for the selected combination, sold-out options greyed out, path hints during partial selection and a quantity stepper capped by stock."
---

# SKU

Product spec picker (desktop inline panel): `specs` describes spec groups and options, `skus` maps combinations to price / stock / image. Once every group is selected the SKU is located and its price shown; during partial selection each option is checked for "can this lead to an in-stock combination" and disabled with a "Sold out" marker when it cannot (path hint). The quantity stepper caps at the matched SKU's stock.

## Basic usage

`value` is the selected combination (JSON object) and `quantity` the amount; user selections write both attributes back and dispatch `oas-change`:

<DemoBlock title="Specs + price linkage + event feedback">
  <oas-sku
    id="sku-basic-en"
    specs='[{"key":"color","label":"Color","values":["Obsidian","Mist"]},{"key":"size","label":"Size","values":["S","M","L"]}]'
    skus='[{"id":"black-s","specs":{"color":"Obsidian","size":"S"},"price":299,"stock":5},{"id":"black-m","specs":{"color":"Obsidian","size":"M"},"price":319,"stock":0},{"id":"black-l","specs":{"color":"Obsidian","size":"L"},"price":339,"stock":2},{"id":"white-s","specs":{"color":"Mist","size":"S"},"price":309,"stock":3},{"id":"white-m","specs":{"color":"Mist","size":"M"},"price":329,"stock":1},{"id":"white-l","specs":{"color":"Mist","size":"L"},"price":349,"stock":0}]'
  ></oas-sku>
  <p id="sku-basic-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Pick a color and size to see price and stock feedback.
  </p>
</DemoBlock>

## Sold out and path hints

After choosing "Obsidian", size M has no stock for that color — it is greyed out and marked "Sold out"; "Mist" still has one M left, so switching colors makes it selectable. When no combination has stock, every option is disabled.

<DemoBlock title="Path hints">
  <oas-sku
    id="sku-path-en"
    value='{"color":"Obsidian"}'
    specs='[{"key":"color","label":"Color","values":["Obsidian","Mist"]},{"key":"size","label":"Size","values":["S","M"]}]'
    skus='[{"id":"black-s","specs":{"color":"Obsidian","size":"S"},"price":299,"stock":2},{"id":"black-m","specs":{"color":"Obsidian","size":"M"},"price":319,"stock":0},{"id":"white-s","specs":{"color":"Mist","size":"S"},"price":309,"stock":0},{"id":"white-m","specs":{"color":"Mist","size":"M"},"price":329,"stock":1}]'
  ></oas-sku>
</DemoBlock>

## Quantity and stock cap

The quantity cap equals the matched SKU's stock; the plus button disables at the cap and typed values above stock are clamped. Sold-out combinations disable the quantity controls:

<DemoBlock title="Quantity stepper (stock 2)">
  <oas-sku
    id="sku-qty-en"
    value='{"color":"Mist","size":"M"}'
    quantity="1"
    specs='[{"key":"color","label":"Color","values":["Mist"]},{"key":"size","label":"Size","values":["M"]}]'
    skus='[{"id":"w-m","specs":{"color":"Mist","size":"M"},"price":329,"stock":2}]'
  ></oas-sku>
  <p id="sku-qty-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The plus button disables at the stock cap.
  </p>
</DemoBlock>

## Currency and precision

The price inside the panel is rendered by an embedded `oas-price`, so `currency` / `locale` / `precision` behave exactly like the price component:

<DemoBlock title="Multi-currency / no decimals">
  <oas-sku
    value='{"color":"Obsidian","size":"M"}'
    currency="USD"
    locale="en-US"
    precision="0"
    specs='[{"key":"color","label":"Color","values":["Obsidian"]},{"key":"size","label":"Size","values":["M"]}]'
    skus='[{"id":"usd","specs":{"color":"Obsidian","size":"M"},"price":49.9,"stock":4}]'
  ></oas-sku>
</DemoBlock>

## Fully disabled

`disabled` makes every option and the quantity controls unavailable (amount and sold-out hints stay readable); handy for delisted products or campaigns that have not started:

<DemoBlock title="Disabled state">
  <oas-sku
    disabled
    value='{"color":"Mist","size":"S"}'
    specs='[{"key":"color","label":"Color","values":["Obsidian","Mist"]},{"key":"size","label":"Size","values":["S","M"]}]'
    skus='[{"id":"w-s","specs":{"color":"Mist","size":"S"},"price":309,"stock":3}]'
  ></oas-sku>
</DemoBlock>

## API

### oas-sku

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `currency` | ISO 4217 currency, default `CNY` | `string` | `CNY` |
| `disabled` | Disables everything (honours config-provider injected disabled) | `boolean` | — |
| `locale` | Price formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `precision` | Price decimal places, default 2 | — | — |
| `quantity` | Quantity (default 1; capped by the matched SKU stock) | `number \| string` | — |
| `skus` | SKU JSON array `[{ id?, specs: { [key]: value }, price?, stock?, image?, imageAlt? }]` | `SkuItem[] \| string` | — |
| `specs` | Spec group JSON array `[{ key, label?, values: (string \| { value, label? })[] }]` | `SkuSpecGroup[] \| string` | — |
| `value` | Selected combination JSON object `{ [specKey]: value }` (controlled; user picks write back) | `Record<string, string> \| string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Dispatched on spec or quantity change with `{ value, quantity, sku, change: 'spec' \| 'quantity' }` (sku is the matched object or null), `detail: { value: { ...this.selected }, quantity: qty, sku, change: 'quantity', } satisfies SkuChangeDetail \| { value: { ...this.selected }, quantity, sku, change, } satisfies SkuChangeDetail` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-sku').then(() => {
    const out = document.getElementById('sku-basic-out-en')
    document.getElementById('sku-basic-en')?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || 'incomplete'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      out.textContent = 'oas-change: ' + combo + ' x ' + d.quantity + ', unit price ' + price
    })
    const qtyOut = document.getElementById('sku-qty-out-en')
    document.getElementById('sku-qty-en')?.addEventListener('oas-change', (e) => {
      qtyOut.textContent = 'Quantity: ' + e.detail.quantity + ' (' + e.detail.change + ')'
    })
  })
})
</script>
