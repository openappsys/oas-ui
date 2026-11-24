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

## Currency, coupon code and selected marker

`currency` / `locale` control amount and date formatting; `code` is the coupon identifier returned in the `oas-select` detail for host bookkeeping; `selected` is only a selected-state marker (used by outer layout composition, it does not drive selection logic):

<DemoBlock title="Multi-currency + coupon code + selected state">
  <oas-coupon amount="20" threshold="199" currency="USD" locale="en-US" code="usd-20"></oas-coupon>
  <oas-coupon
    amount="15"
    validity="No expiry"
    selected
    code="local-15"
    style="margin-top: var(--oas-space-2)"
  ></oas-coupon>
</DemoBlock>

## Selection sheet

`list` takes the coupon array; the trigger opens a bottom sheet (`role="dialog"`, focus moved in, Esc / backdrop closes). Picking an available coupon dispatches `oas-select` and closes the sheet; the selected amount is shown on the trigger and `trigger-text` overrides the trigger label (shown while nothing is picked):

> The sheet follows the shared overlay stacking protocol: opening it locks page scrolling (a cross-component reference-counted lock that restores the host's original value when the last overlay closes), and Esc is resolved by the shared layer stack — topmost first. With `oas-modal` / `oas-drawer` open at the same time, one Esc closes only the top layer. Re-attaching the host while open re-acquires both.

<DemoBlock title="Select a coupon + event feedback">
  <oas-coupon
    id="cp-select-en"
    list='[{"code":"a","amount":30,"threshold":199,"start":"2026-01-01","end":"2026-02-28"},{"code":"b","amount":10,"threshold":0,"validity":"No expiry"},{"code":"c","amount":50,"threshold":299,"status":"unavailable","reason":"Requires a 299 order"},{"code":"d","amount":20,"status":"expired"}]'
  ></oas-coupon>
  <oas-coupon
    id="cp-trigger-text-en"
    trigger-text="My coupons"
    list='[{"code":"e","amount":5,"threshold":0,"validity":"No expiry"}]'
    style="margin-top: var(--oas-space-2)"
  ></oas-coupon>
  <p id="cp-select-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click the trigger to select a coupon.
  </p>
</DemoBlock>

## Groups, counts and the "No coupon" exit

The sheet list renders two groups — available / unavailable (titles via i18n; empty groups are skipped); `show-count` adds a count pill to each group title. A fixed "No coupon" exit sits at the top of the list: clicking it dispatches `oas-clear`, then an **empty-selection** `oas-select` (single-mode detail `{ code: '', coupon: null }`), and closes the sheet — the host receives both events and can use either:

<DemoBlock title="Groups + counts + exit">
  <oas-coupon
    id="cp-group-en"
    show-count
    list='[{"code":"g1","amount":30,"threshold":199},{"code":"g2","amount":10},{"code":"g3","amount":50,"status":"unavailable","reason":"Requires a 299 order"},{"code":"g4","amount":20,"status":"expired"}]'
  ></oas-coupon>
  <p id="cp-group-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Open the sheet to see the groups; click "No coupon" to see oas-clear feedback.
  </p>
</DemoBlock>

## Multiple selection

`multiple` turns the options into checkboxes: every toggle dispatches `oas-select` with an array detail (`{ codes, coupons }`), and the sheet **stays open** (the host decides when to close it); the trigger shows how many coupons are picked. The default single-select behavior is unchanged (radio + close on pick):

<DemoBlock title="Stacking multiple coupons">
  <oas-coupon
    id="cp-multi-en"
    multiple
    list='[{"code":"m1","amount":10},{"code":"m2","amount":20,"threshold":99},{"code":"m3","amount":5,"status":"expired"}]'
  ></oas-coupon>
  <p id="cp-multi-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Open the sheet and pick several coupons; each toggle shows the array detail.
  </p>
</DemoBlock>

## Imperative open/close and selection reset

`open` is a controlled attribute (host attribute / property writes are silent); `openOverlay()` / `closeOverlay()` are the imperative calls (they dispatch `oas-open-change`), and `clearSelection()` clears the picked coupon silently for hosts that need to reset the selection. `z-index` adds a numeric level on top of `--oas-z-index-base` (the default keeps the `--oas-z-modal` step, same shape as modal / drawer); the demo below uses 1300.

<DemoBlock title="openOverlay() / closeOverlay() / clearSelection()">
  <oas-coupon id="cp-api-en" list='[{"code":"x","amount":15,"threshold":0,"validity":"No expiry"}]' z-index="1300"></oas-coupon>
  <div style="margin-top: var(--oas-space-2); display: flex; gap: var(--oas-space-2)">
    <oas-button id="cp-open-en" size="small">Open sheet</oas-button>
    <oas-button id="cp-clear-en" size="small">Clear selection</oas-button>
  </div>
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
| `list` | Selection list JSON array `[{ code, amount, threshold?, start?, end?, validity?, status?, reason? }]`; switches to the sheet form | `CouponData[] \| string` | — |
| `locale` | Amount and date formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `multiple` | Multiple mode: options become checkboxes; every toggle dispatches an array detail `{ codes, coupons }` and the sheet stays open; default single-select unchanged | `boolean` | — |
| `open` | Sheet open state (controlled: host attribute / property writes are silent; user interaction and openOverlay() / closeOverlay() dispatch oas-open-change) | `boolean \| string` | — |
| `reason` | Reason text shown when `status="unavailable"` | — | — |
| `selected` | Selected marker for outer layout composition | `boolean` | — |
| `show-count` | Adds a count pill to the available / unavailable group titles | `boolean` | — |
| `start` | Validity start (`YYYY-MM-DD`) | — | — |
| `status` | Status: `available` (default) / `expired` / `used` / `unavailable` (minimum spend unmet, etc.) | `string` | `available` |
| `threshold` | Minimum spend (number, 0 or absent = no minimum) | — | — |
| `trigger-text` | Trigger label (defaults to i18n `coupon.select`; shows the selected amount once picked) | — | — |
| `validity` | Validity text override (e.g. "No expiry"), wins over the formatted start/end | — | — |
| `z-index` | Overlay stacking level (numeric value added on top of `--oas-z-index-base`; default keeps the `--oas-z-modal` step, same shape as modal / drawer) | — | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `openOverlay` | `openOverlay(): void` | Opens the sheet (no-op when already open) and dispatches oas-open-change |
| `closeOverlay` | `closeOverlay(): void` | Closes the sheet (no-op when already closed) and dispatches oas-open-change |
| `clearSelection` | `clearSelection(): void` | Clears the selected coupon and the amount on the trigger (silent, no events) |

#### Events

| Event | Description |
| --- | --- |
| `oas-clear` | Dispatched when the No-coupon exit is clicked (immediately followed by an empty-selection oas-select; the two events come as a pair) |
| `oas-open-change` | Dispatched on interaction or imperative open/close with `{ open }` (attribute writes are silent), `detail: { open: true } satisfies CouponOpenChangeDetail \| { open: false } satisfies CouponOpenChangeDetail` |
| `oas-select` | Dispatched when an available coupon is picked. Single mode (default) detail `{ code, coupon }` and the sheet closes; multiple mode detail `{ codes, coupons }` (arrays, sheet stays open); the No-coupon exit dispatches an empty selection — single `{ code: empty string, coupon: null }` / multiple `{ codes: [], coupons: [] }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-coupon').then(() => {
    const out = document.getElementById('cp-select-out-en')
    document.getElementById('cp-select-en')?.addEventListener('oas-select', (e) => {
      // The no-coupon exit dispatches an empty selection: coupon is null, guard required
      const coupon = e.detail.coupon
      out.textContent = coupon
        ? 'oas-select: coupon ' + e.detail.code + ', amount ' + coupon.amount
        : "oas-select empty: { code: '', coupon: null }"
    })
    const group = document.getElementById('cp-group-en')
    const groupOut = document.getElementById('cp-group-out-en')
    group?.addEventListener('oas-clear', () => {
      groupOut.textContent = 'oas-clear: no coupon (an empty-selection oas-select follows)'
    })
    group?.addEventListener('oas-select', (e) => {
      if (!e.detail.code) groupOut.textContent = 'oas-select empty: { code: \'\', coupon: null }'
    })
    const multi = document.getElementById('cp-multi-en')
    const multiOut = document.getElementById('cp-multi-out-en')
    multi?.addEventListener('oas-select', (e) => {
      multiOut.textContent = 'oas-select array: [' + e.detail.codes.join(', ') + ']'
    })
    const api = document.getElementById('cp-api-en')
    document.getElementById('cp-open-en')?.addEventListener('click', () => {
      api?.openOverlay()
    })
    document.getElementById('cp-clear-en')?.addEventListener('click', () => {
      api?.clearSelection()
      out.textContent = 'clearSelection: selection cleared'
    })
    api?.addEventListener('oas-open-change', (e) => {
      out.textContent = 'oas-open-change: open=' + e.detail.open
    })
  })
})
</script>
