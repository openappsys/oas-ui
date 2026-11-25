---
description: "Product spec picker: specs + skus data contract, exact SKU matching for the selected combination, sold-out options greyed out, path hints during partial selection and a quantity stepper capped by stock. One panel with two carriers: inline and bottom sheet."
---

# SKU

Product spec picker: `specs` describes spec groups and options, `skus` maps combinations to price / stock / image. Once every group is selected the SKU is located and its price shown; during partial selection each option is checked for "can this lead to an in-stock combination" and disabled with a "Sold out" marker when it cannot (path hint). The quantity stepper caps at the matched SKU's stock. Two carriers share one panel: an inline panel on wide screens and a bottom sheet (`layout="popup"`, or automatically at ≤480px).

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

## Popup (bottom sheet)

`layout="popup"` hands the **same panel** to a bottom sheet (`oas-bottom-sheet`: drag down / tap the backdrop / Esc to close, focus moves into the panel on open and Tab cycles inside it). When `layout` is omitted the form follows the viewport: ≤480px wide uses the sheet, wider stays inline; an explicit value is never overridden by the viewport, and crossing the breakpoint re-evaluates immediately (no reload).

Opening follows the bottom-sheet protocol: `open` is a controlled attribute (host writes apply silently), the sheet's close request arrives as `oas-close` (with `reason`) and the component collapses itself; interactive and imperative open/close dispatch `oas-open-change`:

<DemoBlock title="layout=popup + trigger button">
  <oas-sku
    id="sku-popup-en"
    layout="popup"
    specs='[{"key":"color","label":"Color","values":["Obsidian","Mist"]},{"key":"size","label":"Size","values":["S","M"]}]'
    skus='[{"id":"black-s","specs":{"color":"Obsidian","size":"S"},"price":299,"stock":5},{"id":"black-m","specs":{"color":"Obsidian","size":"M"},"price":319,"stock":0},{"id":"white-s","specs":{"color":"Mist","size":"S"},"price":309,"stock":3},{"id":"white-m","specs":{"color":"Mist","size":"M"},"price":329,"stock":1}]'
  ></oas-sku>
  <div style="display: flex; gap: var(--oas-space-2); align-items: center; margin: var(--oas-space-2) 0 0">
    <oas-button id="sku-popup-open-en" size="small">Choose specs</oas-button>
    <span id="sku-popup-out-en" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Sheet closed</span>
  </div>
</DemoBlock>

> In the inline form `openOverlay()` / `closeOverlay()` only warn once (no ghost open state); the `open` attribute applies to the popup form only.

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

## Multiple spec groups (apparel)

Real apparel categories commonly show 6 selling dimensions at once (color / size / collar / sleeve / shawl / material): the component renders one group per `specs` entry in order, and the SKU table only needs the combinations actually sold (288 in the full cartesian product, 31 here). Impossible combinations cannot be reached by interaction — pick "V-neck" and "With shawl" greys out immediately. When a **host-preset `value` falls outside the table** (deep link / stale cache), the component greys out every other option that cannot reach an in-stock combination and marks it "Sold out" — the selected options themselves included — while options in the same group that still lead to stock (e.g. "Crew") stay selectable, so users can re-pick in place to exit. Narrow viewports switch to the sheet by default; this demo pins `layout="embedded"` to show the multi-group inline layout:

<DemoBlock title="Multiple spec groups (apparel)">
  <oas-sku
    id="sku-multi-en"
    layout="embedded"
    specs='[{"key":"color","label":"Color","values":["Black","White","Ivory"]},{"key":"size","label":"Size","values":["S","M","L","XL"]},{"key":"collar","label":"Collar","values":["Crew","V-neck","Polo"]},{"key":"sleeve","label":"Sleeve","values":["Long","Short"]},{"key":"shawl","label":"Shawl","values":["None","With"]},{"key":"material","label":"Material","values":["Cotton","Poly"]}]'
    skus='[{"specs":{"color":"Black","size":"S","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":12},{"specs":{"color":"Black","size":"M","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":7},{"specs":{"color":"Black","size":"L","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":5},{"specs":{"color":"Black","size":"XL","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":0},{"specs":{"color":"White","size":"S","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":8},{"specs":{"color":"White","size":"M","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":6},{"specs":{"color":"White","size":"L","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":4},{"specs":{"color":"White","size":"XL","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":199,"stock":0},{"specs":{"color":"Ivory","size":"M","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":209,"stock":3},{"specs":{"color":"Ivory","size":"L","collar":"Crew","sleeve":"Long","shawl":"None","material":"Cotton"},"price":209,"stock":2},{"specs":{"color":"Black","size":"M","collar":"Crew","sleeve":"Long","shawl":"None","material":"Poly"},"price":159,"stock":1},{"specs":{"color":"Black","size":"M","collar":"Crew","sleeve":"Short","shawl":"None","material":"Cotton"},"price":129,"stock":9},{"specs":{"color":"Black","size":"L","collar":"Crew","sleeve":"Short","shawl":"None","material":"Cotton"},"price":129,"stock":6},{"specs":{"color":"Black","size":"XL","collar":"Crew","sleeve":"Short","shawl":"None","material":"Cotton"},"price":129,"stock":3},{"specs":{"color":"White","size":"S","collar":"Crew","sleeve":"Short","shawl":"None","material":"Cotton"},"price":129,"stock":7},{"specs":{"color":"White","size":"M","collar":"Crew","sleeve":"Short","shawl":"None","material":"Cotton"},"price":129,"stock":5},{"specs":{"color":"Black","size":"M","collar":"V-neck","sleeve":"Short","shawl":"None","material":"Cotton"},"price":139,"stock":4},{"specs":{"color":"Black","size":"L","collar":"V-neck","sleeve":"Short","shawl":"None","material":"Cotton"},"price":139,"stock":3},{"specs":{"color":"Black","size":"S","collar":"V-neck","sleeve":"Short","shawl":"None","material":"Poly"},"price":119,"stock":2},{"specs":{"color":"White","size":"M","collar":"V-neck","sleeve":"Short","shawl":"None","material":"Poly"},"price":119,"stock":1},{"specs":{"color":"Black","size":"M","collar":"Polo","sleeve":"Short","shawl":"None","material":"Poly"},"price":169,"stock":5},{"specs":{"color":"Black","size":"L","collar":"Polo","sleeve":"Short","shawl":"None","material":"Poly"},"price":169,"stock":4},{"specs":{"color":"Black","size":"XL","collar":"Polo","sleeve":"Short","shawl":"None","material":"Poly"},"price":169,"stock":2},{"specs":{"color":"White","size":"M","collar":"Polo","sleeve":"Short","shawl":"None","material":"Poly"},"price":169,"stock":3},{"specs":{"color":"White","size":"L","collar":"Polo","sleeve":"Short","shawl":"None","material":"Poly"},"price":169,"stock":0},{"specs":{"color":"Ivory","size":"L","collar":"Polo","sleeve":"Long","shawl":"None","material":"Cotton"},"price":219,"stock":1},{"specs":{"color":"Black","size":"M","collar":"Crew","sleeve":"Long","shawl":"With","material":"Cotton"},"price":259,"stock":3},{"specs":{"color":"Black","size":"L","collar":"Crew","sleeve":"Long","shawl":"With","material":"Cotton"},"price":259,"stock":2},{"specs":{"color":"Ivory","size":"M","collar":"Crew","sleeve":"Long","shawl":"With","material":"Cotton"},"price":269,"stock":1},{"specs":{"color":"White","size":"L","collar":"Crew","sleeve":"Long","shawl":"With","material":"Cotton"},"price":259,"stock":0},{"specs":{"color":"Black","size":"L","collar":"Polo","sleeve":"Long","shawl":"None","material":"Poly"},"price":189,"stock":0}]'
  ></oas-sku>
  <p id="sku-multi-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Pick specs to see combination linkage.
  </p>
</DemoBlock>

## Selling dimensions vs descriptive attributes

`specs` is for **selling dimensions** only — attributes that split SKU combinations and stock (color / size / collar / sleeve / shawl). The test: "can price or stock differ between spec combinations?". **Descriptive attributes do not belong in `specs`**: info shared by every combination (origin, brand, fabric content) never varies within one product, and putting it in `specs` multiplies the SKU table by its option count — 3 groups of 3 options already start at 27 combinations; adding one 2-option descriptive dimension yields 54 `skus` entries with identical price and stock (pure data bloat, zero business meaning). Descriptive attributes belong in the host's product detail area (outside the component); keep the SKU table to combinations that are actually purchasable and can differ in price or stock. There is no need to fill the full cartesian product — combinations absent from the table are greyed out automatically as unreachable.

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

    // Popup form: imperative open; oas-close is passed through from the sheet (the component already
    // collapses itself — listen only for observation / analytics)
    const popup = document.getElementById('sku-popup-en')
    const popupOut = document.getElementById('sku-popup-out-en')
    document.getElementById('sku-popup-open-en')?.addEventListener('click', () => popup?.openOverlay())
    popup?.addEventListener('oas-open-change', (e) => {
      popupOut.textContent = e.detail.open ? 'Sheet open (Esc / backdrop / drag down to close)' : 'Sheet closed'
    })
    popup?.addEventListener('oas-close', (e) => {
      popupOut.textContent = 'Close reason: ' + e.detail.reason
    })
    popup?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || 'incomplete'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      popupOut.textContent = 'Picked in sheet: ' + combo + ' x ' + d.quantity + ', unit price ' + price
    })

    // Multiple spec groups: combination linkage feedback — exact match on full selection,
    // path hints during partial selection
    const multiOut = document.getElementById('sku-multi-out-en')
    document.getElementById('sku-multi-en')?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || 'incomplete'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      multiOut.textContent = 'oas-change: ' + combo + ' x ' + d.quantity + ', unit price ' + price
    })
  })
})
</script>

## API

### oas-sku

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `currency` | ISO 4217 currency, default `CNY` | `string` | `CNY` |
| `disabled` | Disables everything (honours config-provider injected disabled) | `boolean` | — |
| `layout` | Carrier form: `embedded` (inline panel) / `popup` (bottom sheet, bottom-sheet protocol); defaults to viewport-based (sheet at ≤480px); invalid values warn and fall back to embedded | — | — |
| `locale` | Price formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `open` | Sheet open state (controlled: host writes apply silently; popup form only). Interactive and `openOverlay()` / `closeOverlay()` changes dispatch `oas-open-change` | `boolean \| string` | — |
| `precision` | Price decimal places, default 2 | — | — |
| `quantity` | Quantity (default 1; capped by the matched SKU stock) | `number \| string` | — |
| `skus` | SKU JSON array `[{ id?, specs: { [key]: value }, price?, stock?, image?, imageAlt? }]` | `SkuItem[] \| string` | — |
| `specs` | Spec group JSON array `[{ key, label?, values: (string \| { value, label? })[] }]` | `SkuSpecGroup[] \| string` | — |
| `value` | Selected combination JSON object `{ [specKey]: value }` (controlled; user picks write back) | `Record<string, string> \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `open` | Sheet open state (controlled: reads/writes mirror the `open` attribute silently; popup form only). Switching popup (while open) back to embedded writes false and dispatches once — the sheet is hidden, so `open` never lingers stale. A write while embedded is kept as a pending intent (no event) and the sheet opens automatically when the layout switches back to popup | `boolean \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `openOverlay` | `openOverlay(): void` | Open the sheet imperatively (idempotent; dispatches `oas-open-change`; warns once on the inline form) |
| `closeOverlay` | `closeOverlay(): void` | Close the sheet imperatively (idempotent; dispatches `oas-open-change`; warns once on the inline form) |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Dispatched on spec or quantity change with `{ value, quantity, sku, change: 'spec' \| 'quantity' }` (sku is the matched object or null), `detail: { value: { ...this.selected }, quantity: qty, sku, change: 'quantity', } satisfies SkuChangeDetail \| { value: { ...this.selected }, quantity, sku, change, } satisfies SkuChangeDetail` |
| `oas-close` | Close request **passed through** from `oas-bottom-sheet` (drag down / backdrop / Esc), `detail: { reason }`; the component already collapses itself, so hosts need no handler (listen only for observation) |
| `oas-open-change` | Sheet open state changed (interactive / imperative / layout-switch settle), `detail: { open }`; attribute writes stay silent |
