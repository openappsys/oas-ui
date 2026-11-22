---
description: "Coupon component: coupon card (amount / minimum spend / validity / status colors) plus a selection sheet; expired, used and minimum-spend-unmet states are fully covered and selection dispatches oas-select."
---

# Coupon

Both forms share the same card rendering:

- **Coupon card** (default): amount, minimum spend, validity and status colors;
- **Selection sheet** (when `list` is present): a trigger button plus a bottom sheet; available coupons can be picked, expired / used / minimum-spend-unmet coupons are disabled, and picking dispatches `oas-select` and closes the sheet.

## Coupon card

`amount` is the face value, `threshold` the minimum spend (0 or absent = no minimum) and `start` / `end` the validity (or `validity` text to take over the display entirely):

<DemoBlock title="Available coupons">
  <oas-coupon amount="30" threshold="199" start="2026-01-01" end="2026-02-28"></oas-coupon>
  <oas-coupon amount="10" threshold="0" validity="No expiry" style="margin-top: var(--oas-space-2)"></oas-coupon>
</DemoBlock>

## Status semantics

`status="expired|used"` uses a muted surface and disabled text; `status="unavailable"` pairs with `reason` to explain why (minimum spend unmet etc.):

<DemoBlock title="Expired / used / not eligible">
  <oas-coupon amount="20" threshold="99" status="expired"></oas-coupon>
  <oas-coupon amount="20" threshold="99" status="used" style="margin-top: var(--oas-space-2)"></oas-coupon>
  <oas-coupon amount="50" threshold="299" status="unavailable" reason="Requires a 299 order" style="margin-top: var(--oas-space-2)"></oas-coupon>
</DemoBlock>

## Selection sheet

`list` takes the coupon array; the trigger opens a bottom sheet (`role="dialog"`, focus moved in, Esc / backdrop closes). Picking an available coupon dispatches `oas-select` and closes the sheet; the selected amount is shown on the trigger.

<DemoBlock title="Select a coupon + event feedback">
  <oas-coupon
    id="cp-select-en"
    list='[{"code":"a","amount":30,"threshold":199,"start":"2026-01-01","end":"2026-02-28"},{"code":"b","amount":10,"threshold":0,"validity":"No expiry"},{"code":"c","amount":50,"threshold":299,"status":"unavailable","reason":"Requires a 299 order"},{"code":"d","amount":20,"status":"expired"}]'
  ></oas-coupon>
  <p id="cp-select-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click the trigger to select a coupon.
  </p>
</DemoBlock>

## Imperative open/close

Controlled `open` attribute plus `open()` / `close()` methods: host attribute writes are silent, while interactions and imperative calls dispatch `oas-open-change`.

<DemoBlock title="open() / close()">
  <oas-coupon id="cp-api-en" list='[{"code":"x","amount":15,"threshold":0,"validity":"No expiry"}]'></oas-coupon>
  <oas-button id="cp-open-en" size="small" style="margin-top: var(--oas-space-2)">Open sheet</oas-button>
</DemoBlock>

## API

### oas-coupon

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `amount` | Face value (number, required in card mode) | — | — |
| `code` | Coupon identifier returned in event details | — | — |
| `currency` | ISO 4217 currency, default `CNY` | `string` | `CNY` |
| `end` | Validity end (`YYYY-MM-DD`) | — | — |
| `list` | Selection list JSON array `[{ code, amount, threshold?, start?, end?, validity?, status?, reason? }]`; switches to the sheet form | — | — |
| `locale` | Amount and date formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `open` | Sheet open state (controlled; host writes are silent, interaction/imperative changes dispatch `oas-open-change`) | — | — |
| `reason` | Reason text shown when `status="unavailable"` | — | — |
| `selected` | Selected marker for outer layout composition | `boolean` | — |
| `start` | Validity start (`YYYY-MM-DD`) | — | — |
| `status` | Status: `available` (default) / `expired` / `used` / `unavailable` (minimum spend unmet, etc.) | `string` | `available` |
| `threshold` | Minimum spend (number, 0 or absent = no minimum) | — | — |
| `trigger-text` | Trigger label (defaults to i18n `coupon.select`; shows the selected amount once picked) | — | — |
| `validity` | Validity text override (e.g. "No expiry"), wins over the formatted start/end | — | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `open` | `open(): void` | Opens the sheet (no-op when already open) and dispatches `oas-open-change` |
| `close` | `close(): void` | Closes the sheet (no-op when already closed) and dispatches `oas-open-change` |

#### Events

| Event | Description |
| --- | --- |
| `oas-open-change` | Dispatched on interaction or imperative open/close with `{ open }` (attribute writes are silent), `detail: { open: true } satisfies CouponOpenChangeDetail \| { open: false } satisfies CouponOpenChangeDetail` |
| `oas-select` | Dispatched when an available coupon is selected with `{ code, coupon }`, then the sheet closes, `detail: { code: coupon.code, coupon } satisfies CouponSelectDetail` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-coupon').then(() => {
    const out = document.getElementById('cp-select-out-en')
    document.getElementById('cp-select-en')?.addEventListener('oas-select', (e) => {
      out.textContent = 'oas-select: coupon ' + e.detail.code + ', amount ' + e.detail.coupon.amount
    })
    const api = document.getElementById('cp-api-en')
    document.getElementById('cp-open-en')?.addEventListener('click', () => {
      api?.open()
    })
    api?.addEventListener('oas-open-change', (e) => {
      out.textContent = 'oas-open-change: open=' + e.detail.open
    })
  })
})
</script>
