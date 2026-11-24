---
description: "Order card: order number plus a configurable status badge (semantic tone mapping), item summary, amount area (paid / struck-through original / saved amount), collapsible details and an actions slot."
---

# OrderCard

A high-frequency card for order lists and order detail pages: the header pairs the order number with a status badge, followed by an item summary (image + name + spec × quantity), the amount area (paid / struck-through original / saved amount), an actions slot at the bottom, and an optional collapsible details region. Both the badge copy and its colour semantics are fully declared through `status-map`.

## Basic usage

`status` is the status key and `status-map` maps keys to copy plus a semantic tone; `items` is the item summary and the `actions` slot holds the action buttons:

<DemoBlock title="Pending order with actions">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-order-card
      id="oc-basic-en"
      order-id="NO-20241124001"
      status="pending"
      status-map='{"pending":{"label":"Pending payment","tone":"warning"}}'
      items='[{"title":"Cotton tee","spec":"White / M","quantity":2,"image":"/assets/demo-square-1.svg"},{"title":"Canvas sneakers","spec":"42 / Ivory","quantity":1,"image":"/assets/demo-square-2.svg"}]'
      payable="297"
      original="357"
      discount="60"
    >
      <oas-button slot="actions" size="small">Cancel</oas-button>
      <oas-button slot="actions" size="small" type="primary">Pay now</oas-button>
    </oas-order-card>
    <p id="oc-basic-out-en" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Actions come from the host (the card dispatches no business events); see the details demo below.
    </p>
  </div>
</DemoBlock>

## Status semantics

`status-map` is `{ key: { label, tone } }` and also accepts a plain string (equivalent to `tone: 'default'`). Five tones are available: `default` / `primary` / `success` / `warning` / `danger`. A `status` that is not mapped is shown as-is so hosts can adopt it gradually.

<DemoBlock title="Five tones plus shorthand">
  <div style="display: grid; gap: var(--oas-space-2)">
    <oas-order-card
      order-id="NO-1001"
      status="pending"
      status-map='{"pending":{"label":"Pending payment","tone":"warning"},"shipped":{"label":"Shipped","tone":"primary"},"done":{"label":"Completed","tone":"success"},"refund":{"label":"Refunding","tone":"danger"},"canceled":"Canceled"}'
      items='[{"title":"Limited mug","quantity":1}]'
      payable="89"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1002"
      status="shipped"
      status-map='{"pending":{"label":"Pending payment","tone":"warning"},"shipped":{"label":"Shipped","tone":"primary"},"done":{"label":"Completed","tone":"success"},"refund":{"label":"Refunding","tone":"danger"},"canceled":"Canceled"}'
      items='[{"title":"Coffee beans","spec":"200g","quantity":2}]'
      payable="256"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1003"
      status="done"
      status-map='{"pending":{"label":"Pending payment","tone":"warning"},"shipped":{"label":"Shipped","tone":"primary"},"done":{"label":"Completed","tone":"success"},"refund":{"label":"Refunding","tone":"danger"},"canceled":"Canceled"}'
      items='[{"title":"Canvas sneakers","spec":"42","quantity":1}]'
      payable="199"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1004"
      status="refund"
      status-map='{"pending":{"label":"Pending payment","tone":"warning"},"shipped":{"label":"Shipped","tone":"primary"},"done":{"label":"Completed","tone":"success"},"refund":{"label":"Refunding","tone":"danger"},"canceled":"Canceled"}'
      items='[{"title":"Bucket hat","quantity":1}]'
      payable="59"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1005"
      status="canceled"
      status-map='{"pending":{"label":"Pending payment","tone":"warning"},"shipped":{"label":"Shipped","tone":"primary"},"done":{"label":"Completed","tone":"success"},"refund":{"label":"Refunding","tone":"danger"},"canceled":"Canceled"}'
      items='[{"title":"Sticker sheet","quantity":1}]'
      payable="0"
    ></oas-order-card>
  </div>
</DemoBlock>

## Amount area

`payable` is the amount paid, `original` the pre-discount amount (rendered struck through) and `discount` the saved amount; when all three are absent the whole amount area hides. `currency` / `locale` / `precision` are forwarded to the nested price component.

<DemoBlock title="Paid + struck-through original + saved (USD / one decimal)">
  <oas-order-card
    order-id="NO-2001"
    status="done"
    status-map='{"done":{"label":"Completed","tone":"success"}}'
    items='[{"title":"Wool scarf","spec":"Charcoal","quantity":1,"image":"/assets/demo-square-4.svg"}]'
    payable="59.9"
    original="79.9"
    discount="20"
    currency="USD"
    locale="en-US"
    precision="1"
  ></oas-order-card>
</DemoBlock>

## Collapsible details

`expandable` turns on the details toggle; the expanded region renders the `details` slot — when the slot is empty the toggle is not rendered at all (no blank panel). A user click writes the `expanded` attribute back and dispatches `oas-toggle`; hosts may also set `expanded` directly to preset the state (controlled, no event).

<DemoBlock title="Collapsed / preset expanded / event feedback">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-order-card
      id="oc-expand-en"
      order-id="NO-3001"
      status="shipped"
      status-map='{"shipped":{"label":"Shipped","tone":"primary"}}'
      items='[{"title":"Light down jacket","spec":"Navy / L","quantity":1,"image":"/assets/demo-square-5.svg"}]'
      payable="399"
      expandable
    >
      <div slot="details" style="display: grid; gap: var(--oas-space-1)">
        <span>Ordered: 2024-11-24 10:20</span>
        <span>Delivery: SF Express, free shipping · expected 11-26</span>
        <span>Recipient: Mr. Zhang · 138****0000</span>
      </div>
      <oas-button slot="actions" size="small">Track shipment</oas-button>
    </oas-order-card>
    <oas-order-card
      order-id="NO-3002"
      status="shipped"
      status-map='{"shipped":{"label":"Shipped","tone":"primary"}}'
      items='[{"title":"Preset expanded order","quantity":1}]'
      payable="129"
      expandable
      expanded
    >
      <div slot="details">Ordered 2024-11-23 21:05 · dispatched</div>
    </oas-order-card>
    <p id="oc-expand-out-en" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Click the details toggle to see oas-toggle feedback.
    </p>
  </div>
</DemoBlock>

## Empty items

When `items` is missing or empty the card renders "No items"; give it only amounts to use it as a lightweight bill card.

<DemoBlock title="No items">
  <oas-order-card order-id="NO-4001" status="canceled" status-map='{"canceled":"Canceled"}' payable="0"></oas-order-card>
</DemoBlock>

## Styling notes

`::part(card)` is a column flex: `head` → `items` → `amount` → `details` → `foot`. Inside `::part(foot)` the toggle is pushed to the inline start by `margin-inline-end: auto` while the `actions` slot stays at the inline end; overriding `justify-content` on `::part(foot)` affects both. The card itself is not clickable — wrap it in an `<a>` when the entire card should navigate.

## API

### oas-order-card

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `currency` | ISO 4217 currency, default `CNY` | `string` | `CNY` |
| `discount` | Saved amount (non-negative number) shown with the i18n `orderCard.discount` copy | — | — |
| `expandable` | Turns on the details toggle (the toggle is not rendered when the `details` slot is empty) | `boolean` | — |
| `expanded` | Expanded state: written back by the component after a user click; hosts may set it to preset the state (controlled, no `oas-toggle`) | `boolean` | — |
| `items` | Item summary JSON array `[{ image?, title, spec?, quantity? }]`; entries without `title` are ignored and `quantity` defaults to 1 | `OrderCardItem[] \| string` | — |
| `locale` | Amount formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `order-id` | Order number shown in the header (omitted leaves the slot empty) | — | — |
| `original` | Pre-discount amount rendered struck through (uses the nested `oas-price` original channel) | — | — |
| `payable` | Amount paid (non-negative number); when `original` and `discount` are absent too the whole amount area hides | — | — |
| `precision` | Amount decimal places, default 2 | — | — |
| `status` | Status key looked up in `status-map`; unmapped keys are shown as-is | — | — |
| `status-map` | Status semantics JSON object `{ key: { label, tone } }`, or the shorthand `{ key: "copy" }` (same as `tone: default`). Five tones: default / primary / success / warning / danger; invalid tones fall back to default and warn once | `OrderStatusMap \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `items` | Item summary: get+set accessor (array or JSON string) reflecting the `items` attribute | `OrderCardItem[] \| string` | — |
| `statusMap` | Status semantics: get+set accessor (object or JSON string) reflecting the `status-map` attribute | `OrderStatusMap \| string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-toggle` | Fired after a user toggles the details, `detail: { expanded, orderId }`; host-side `expanded` writes do not fire it |

#### Slots

| Name | Description |
| --- | --- |
| `actions` | Action buttons (pay, track shipment, buy again, …) |
| `details` | Collapsible details content (order number, placed time, shipping info, …); no content means no toggle |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-order-card').then(() => {
    const out = document.getElementById('oc-expand-out-en')
    document.getElementById('oc-expand-en')?.addEventListener('oas-toggle', (e) => {
      out.textContent = 'oas-toggle: ' + e.detail.orderId + ' details ' + (e.detail.expanded ? 'expanded' : 'collapsed')
    })
  })
})
</script>
