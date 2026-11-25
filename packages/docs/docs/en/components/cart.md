---
description: "Cart list: item selection with select-all and indeterminate state, built-in quantity stepper with stock clamping, delete (button or swipe), and a selected-items total. items JSON drives the data and oas-change reports the total and selected count."
---

# Cart

The shopping-cart list for the checkout flow: item selection, built-in quantity stepper, delete (button / swipe / off), select-all with indeterminate state, and a selected-items subtotal. Data is driven by the `items` JSON attribute; after a user interaction the component writes the result back to `items` and dispatches `oas-change` (`detail` carries `items` / `total` / `selectedCount`) — uncontrolled usage works out of the box, controlled hosts ignore the write-back and re-assign `items` themselves.

## Basic usage

Each entry is `{ id, title, price, quantity?, selected?, spec?, image?, maxQuantity?, disabled? }`; both selection and quantity changes dispatch `oas-change`:

<DemoBlock title="Selection, total and event feedback">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-basic-en"
      items='[{"id":"a","title":"Cotton tee","spec":"White / M","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"Canvas sneakers","spec":"42 / Ivory","price":199,"quantity":1,"image":"/assets/demo-square-2.svg"},{"id":"c","title":"Cotton bucket hat","spec":"One size","price":59,"quantity":1,"image":"/assets/demo-square-3.svg"}]'
    ></oas-cart>
    <p id="cart-basic-out-en" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Select an item or change a quantity to see oas-change feedback.
    </p>
  </div>
</DemoBlock>

## Select-all and indeterminate

The select-all checkbox sits at the start of the summary row: checked when everything is selected, indeterminate when only some items are. Disabled items never participate in select-all and never count towards the total.

<DemoBlock title="Indeterminate state (partial selection)">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-select-en"
      items='[{"id":"a","title":"Cotton tee","spec":"White / M","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"Canvas sneakers","price":199,"quantity":1,"image":"/assets/demo-square-2.svg"},{"id":"c","title":"Free stickers","price":10,"quantity":1,"selected":true,"disabled":true,"image":"/assets/demo-square-6.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## Quantity stepper and stock limit

The stepper and the quantity input clamp automatically: below 1 becomes 1, above `maxQuantity` becomes the limit (the plus button is disabled at the limit). Quantity changes update the total immediately.

<DemoBlock title="Stock limit 3">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-limit-en"
      items='[{"id":"a","title":"Single-origin coffee beans","spec":"200g / medium-light","price":128,"quantity":1,"selected":true,"maxQuantity":3,"image":"/assets/demo-square-4.svg"},{"id":"b","title":"Paper filters, 100 pcs","spec":"V60 02","price":25,"quantity":2,"selected":true,"image":"/assets/demo-square-5.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## Delete

`delete-mode` picks the delete affordance: `button` (default, a trailing delete button) / `swipe` (drag towards the inline start to reveal a delete button — it stays in the tab order, so keyboard users can reach it, and it reveals itself on focus) / `none` (not deletable). A **cancelable** `oas-remove` fires before removal: calling `preventDefault()` vetoes it (hosts can confirm with a dialog and then write `items` themselves). Once a row is revealed, tapping that row's body **collapses** it (no `oas-item-click`); tapping another row's body first collapses the revealed row and still dispatches the event — at most one row is revealed at a time (swiping another row open collapses the previous one).

<DemoBlock title="Button delete / swipe delete / no delete">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-delete-button-en"
      items='[{"id":"a","title":"Button delete mode","price":39,"quantity":1,"selected":true,"image":"/assets/demo-square-1.svg"}]'
    ></oas-cart>
    <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      delete-mode="swipe": drag left on the row to reveal the delete button, then click it (same gesture for mouse and touch).
    </p>
    <oas-cart
      id="cart-delete-swipe-en"
      delete-mode="swipe"
      items='[{"id":"a","title":"Swipe delete mode","price":39,"quantity":1,"selected":true,"image":"/assets/demo-square-2.svg"},{"id":"b","title":"Another product","price":69,"quantity":1,"image":"/assets/demo-square-3.svg"}]'
    ></oas-cart>
    <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      delete-mode="none": read-only list (for example an order review view).
    </p>
    <oas-cart
      delete-mode="none"
      items='[{"id":"a","title":"Not deletable","price":39,"quantity":1,"selected":true,"image":"/assets/demo-square-4.svg"}]'
    ></oas-cart>
    <p id="cart-delete-out-en" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Click a delete button to see oas-remove feedback.
    </p>
  </div>
</DemoBlock>

## Disabled items and missing images

`disabled` items are dimmed, cannot be selected or resized, and never count towards the total — but their **delete button stays enabled** so delisted items can be cleared. A missing or broken `image` renders a dashed placeholder box (the layout never collapses).

<DemoBlock title="Disabled item / missing images">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-disabled-en"
      items='[{"id":"a","title":"Delisted product","spec":"White / M","price":99,"quantity":1,"selected":true,"disabled":true,"image":"/assets/demo-square-5.svg"},{"id":"b","title":"Product without image","price":59,"quantity":1,"selected":true},{"id":"c","title":"Broken image","price":29,"quantity":1,"image":"https://invalid.example.com/missing.png"}]'
    ></oas-cart>
    <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Host-level disabled: the whole cart is read-only (checkout in progress, risk hold, and so on).
    </p>
    <oas-cart
      id="cart-disabled-host-en"
      disabled
      items='[{"id":"a","title":"Cart under checkout","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-6.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## Currency and precision

`currency` / `locale` / `precision` are forwarded to item prices and to the subtotal (same formatter as `oas-price`); `detail.total` from `oas-change` is rounded with the same `precision`.

<DemoBlock title="USD / no decimals">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      currency="USD"
      locale="en-US"
      precision="0"
      items='[{"id":"a","title":"Cotton Tee","spec":"White / M","price":19.9,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"Canvas Shoes","price":49.5,"quantity":1,"selected":true,"image":"/assets/demo-square-2.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## Empty cart

An empty `items` hides the list and the summary row and renders the empty state; the `empty` slot replaces it with onboarding copy and a call to action.

<DemoBlock title="Empty state (default copy / custom slot)">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart id="cart-empty-default-en" items="[]"></oas-cart>
    <oas-cart id="cart-empty-slot-en" items="[]">
      <div slot="empty" style="display: flex; flex-direction: column; align-items: center; gap: var(--oas-space-2)">
        <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Your cart is empty</span>
        <oas-button size="small">Start shopping</oas-button>
      </div>
    </oas-cart>
  </div>
</DemoBlock>

## Composing with the submit bar

This component only owns the list and the subtotal: put checkout buttons in the `actions` slot, or feed `detail.total` into `oas-submit-bar`. The demo below does both (the submit bar mirrors the cart total):

<DemoBlock title="actions slot + oas-submit-bar sync">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-checkout-en"
      items='[{"id":"a","title":"Cotton tee","spec":"White / M","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"Canvas sneakers","price":199,"quantity":1,"selected":true,"image":"/assets/demo-square-2.svg"}]'
    >
      <oas-button slot="actions" size="small">Manage</oas-button>
    </oas-cart>
    <oas-submit-bar id="cart-submit-bar-en" total="397" action-text="Checkout"></oas-submit-bar>
    <p id="cart-checkout-out-en" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Change a selection or a quantity; the submit bar total follows.
    </p>
  </div>
</DemoBlock>

## Styling notes

A row is `::part(item)` (the `li`) → `::part(item-inner)` (the content layer) plus, in swipe mode, `::part(swipe-remove)`. The content layer paints its own background above the delete button, so when overriding the `::part(item)` background or radius keep the swipe reveal (which shows `::part(swipe-remove)`) in mind. Clicking an item body (title / spec / price) dispatches `oas-item-click` with `{ id, item }` — use it to open the product page.

## API

### oas-cart

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `currency` | ISO 4217 currency, default `CNY` (forwarded to the nested `oas-price`) | `string` | `CNY` |
| `delete-mode` | Delete affordance: `button` (default, trailing delete button) / `swipe` (drag towards the inline start to reveal the delete button, which stays in the tab order) / `none` (not deletable); invalid values fall back to `button` and warn once | — | — |
| `disabled` | Disables the whole cart (honours config-provider injected disabled): selection, stepper, delete and select-all are all inert | `boolean` | — |
| `items` | Item JSON array `[{ id, image?, title, spec?, price, quantity?, selected?, maxQuantity?, disabled? }]`; entries without `id` are ignored, an invalid `price` counts as 0 (warns once), `quantity` defaults to 1 and is clamped to `[1, maxQuantity]`, `selected` defaults to false, and `disabled` items never count towards the total | `CartItem[] \| string` | — |
| `locale` | Amount formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `precision` | Amount decimal places, default 2 (the total in `detail` is rounded with it) | — | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `items` | Items: get+set accessor (accepts an array or a JSON string and reflects the `items` attribute). After a user interaction the component writes the result back and dispatches `oas-change`; controlled hosts ignore the write-back and re-assign their own state | `CartItem[] \| string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Fired after selecting, select-all, a quantity change or a deletion with `detail: { items, total, selectedCount, allSelected, indeterminate }` |
| `oas-item-click` | Fired when an item body (title / spec / price) is clicked, `detail: { id, item }` — use it to open the product page |
| `oas-remove` | Fired before removal (cancelable) with `detail: { item, items, total, selectedCount }` (`items` is the list after removal); calling `preventDefault()` vetoes the removal so hosts can confirm first |

#### Slots

| Name | Description |
| --- | --- |
| `actions` | Extra area at the end of the summary row (checkout button, discounts, …); the whole row is hidden for an empty cart |
| `empty` | Empty-state content (defaults to the i18n `cart.empty` copy) |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-cart').then(() => {
    const out = document.getElementById('cart-basic-out-en')
    document.getElementById('cart-basic-en')?.addEventListener('oas-change', (e) => {
      out.textContent =
        'oas-change: total ' + e.detail.total + ' · ' + e.detail.selectedCount + ' selected · all selected: ' + (e.detail.allSelected ? 'yes' : 'no')
    })
    document.getElementById('cart-basic-en')?.addEventListener('oas-item-click', (e) => {
      out.textContent = 'oas-item-click: ' + e.detail.id + ' (' + e.detail.item.title + ')'
    })

    const delOut = document.getElementById('cart-delete-out-en')
    for (const id of ['cart-delete-button-en', 'cart-delete-swipe-en']) {
      document.getElementById(id)?.addEventListener('oas-remove', (e) => {
        delOut.textContent = 'oas-remove: ' + e.detail.item.title + ' · ' + e.detail.items.length + ' left'
      })
    }

    const cart = document.getElementById('cart-checkout-en')
    const bar = document.getElementById('cart-submit-bar-en')
    const checkoutOut = document.getElementById('cart-checkout-out-en')
    cart?.addEventListener('oas-change', (e) => {
      bar.setAttribute('total', String(e.detail.total))
      checkoutOut.textContent = 'oas-change: total ' + e.detail.total + ' (synced to the submit bar)'
    })
  })
})
</script>
