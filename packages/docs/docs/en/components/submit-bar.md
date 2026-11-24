---
description: "Submit bar: a sticky bottom bar with an extra-content area, formatted total amount and a primary action button covering loading, disabled and danger states."
---

# SubmitBar

A bottom action bar for pages or sections: extra area (default slot for agreements, notes, etc.) + total amount + primary action button. The total is rendered by the nested `oas-price`, and the button covers loading, disabled and danger states.

## Basic usage

`total` is the amount and `action-text` the button label; clicking dispatches `oas-submit` with `{ total, currency }`.

<DemoBlock title="Total + primary action + event feedback">
  <oas-submit-bar id="sb-basic-en" total="1299" action-text="Place order"></oas-submit-bar>
  <p id="sb-basic-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click the action button to see oas-submit feedback.
  </p>
</DemoBlock>

## Extra content

The default slot renders before the total — useful for agreement checkboxes or discount notes; it collapses when empty so the amount is never squeezed.

<DemoBlock title="Agreement checkbox">
  <oas-submit-bar id="sb-slot-en" total="2688" label="Payable" action-text="Pay now">
    <label style="display: inline-flex; align-items: center; gap: var(--oas-space-1)">
      <input type="checkbox" id="sb-agree-en"> I have read and accept the terms
    </label>
  </oas-submit-bar>
</DemoBlock>

## Loading / disabled / danger

`loading` disables the button, shows a spinner and sets `aria-busy="true"`; `disabled` keeps the visuals but blocks the event; `danger` switches the primary button to the danger color.

<DemoBlock title="States">
  <oas-submit-bar id="sb-loading-en" total="99" action-text="Submitting" loading></oas-submit-bar>
  <oas-submit-bar id="sb-disabled-en" total="99" action-text="Unavailable" disabled></oas-submit-bar>
  <oas-submit-bar id="sb-danger-en" total="99" action-text="Delete order" danger></oas-submit-bar>
</DemoBlock>

## Tip line

`tip` renders a notice line above the main row (shipping fee / invoice notes and similar), and `tip-icon` takes a registered icon name (unregistered names warn once in dev and skip the icon; the text stays readable):

<DemoBlock title="Shipping-fee tip">
  <oas-submit-bar
    id="sb-tip-en"
    total="86"
    action-text="Checkout"
    tip="Shipping 8, free over 99"
    tip-icon="info"
  ></oas-submit-bar>
  <oas-submit-bar
    total="129"
    action-text="Checkout"
    tip="E-invoice supported"
    style="margin-top: var(--oas-space-2)"
  ></oas-submit-bar>
</DemoBlock>

## Safe area and placeholder

The bar's block-end padding uses `max(spacing, env(safe-area-inset-bottom))` (notches and gesture bars are avoided automatically). The bar is `position: sticky` by default (it already occupies the flow, so no spacer is needed). When the host overrides it to `fixed` with CSS, **the spacer is the host's responsibility** — add `padding-bottom` to the page tail and align it with `--oas-submit-bar-height` (the bar's min-height token, default `--oas-control-height-xl`). Note the token is a **minimum**: in the default theme the bar without a `tip` renders at ≈57px (vertical padding 16 + main row 40 + top border 1), so a 57px fallback in the recipe is closer to reality; with a `tip` line, stack its rendered height on top (a single-line tip measures ≈27.5px; wrapped copy is taller — go by the actual render):

<DemoBlock title="Fixed-layout spacer recipe (host padding-bottom)">
  <oas-submit-bar total="66" action-text="Checkout"></oas-submit-bar>
  <pre style="margin: var(--oas-space-2) 0 0; padding: var(--oas-space-3); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); font-size: var(--oas-font-size-sm); overflow: auto"><code>/* Host-side style example */
.checkout-page oas-submit-bar {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
}
.checkout-page {
  /* Tail spacer aligned with the bar's rendered height: the min-height token
     (default 48px) is only the floor — the bar actually renders ≈57px
     (vertical padding 16 + main row 40 + top border 1);
     with a tip line, stack its rendered height (single line ≈27.5px) */
  padding-bottom: var(--oas-submit-bar-height, 57px);
}</code></pre>
</DemoBlock>

## Currency and precision

The total is formatted by the same code path as `oas-price`: `currency` switches the currency, `locale` decides symbol placement and grouping and `precision` sets the decimal places.

<DemoBlock title="Multi-currency / no decimals">
  <oas-submit-bar id="sb-usd-en" total="99.5" currency="USD" locale="en-US" action-text="Pay"></oas-submit-bar>
  <oas-submit-bar
    id="sb-precision-en"
    total="1299.6"
    precision="0"
    action-text="Place order"
    style="margin-top: var(--oas-space-2)"
  ></oas-submit-bar>
</DemoBlock>

## Toggling state

Hosts can toggle loading by writing the attribute; no `oas-submit` fires while loading.

<DemoBlock title="Toggle loading">
  <oas-submit-bar id="sb-toggle-en" total="399" action-text="Pay now"></oas-submit-bar>
  <oas-button id="sb-toggle-btn-en" size="small" style="margin-top: var(--oas-space-2)">Toggle loading</oas-button>
</DemoBlock>

## Styling notes

`::part(bar)` is a **two-layer column flex** — the `::part(tip)` line stacks above the `::part(row)` main row. Overriding `flex-direction` on `::part(bar)` squeezes the tip and the main row onto one line; if you need a different layout, take `::part(tip)` / `::part(row)` into account together. For fixed-layout spacing see the "Safe area and placeholder" recipe above (align with `--oas-submit-bar-height`).

## API

### oas-submit-bar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `action-text` | Primary button text; when omitted no button renders (amount + extra area only) | — | — |
| `currency` | ISO 4217 currency, default `CNY` | `string` | `CNY` |
| `danger` | Primary button uses the danger color (destructive main actions) | `boolean` | — |
| `disabled` | Disables the button (honours config-provider injected disabled) | `boolean` | — |
| `label` | Total label, defaults to the i18n `submitBar.total` | — | — |
| `loading` | Loading: button disabled + spinner + `aria-busy`, no events dispatched | `boolean` | — |
| `locale` | Amount formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `precision` | Amount decimal places, default 2 | `string` | `2` |
| `tip` | Tip line text (shipping fee / invoice notices shown above the main row) | — | — |
| `tip-icon` | Tip icon name (resolved through the icon registry, custom registration wins); unregistered names warn once in dev and skip the icon, the text stays readable | — | — |
| `total` | Total amount (numeric string); omitted renders no amount | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-submit` | Dispatched on primary button click (not loading / disabled) with `{ total, currency }`, `detail: { total: this.totalValue(), currency: this.getAttr('currency', 'CNY').trim().toUpperCase() \|\| 'CNY', } satisfies SubmitBarDetail` |

#### Slots

| Name | Description |
| --- | --- |
| default | Extra content before the total (agreement checkboxes, notes, etc.) |
| `total` | Overrides the default amount rendering |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-submit-bar-height` | `var(--oas-control-height-xl, 48px)` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-submit-bar').then(() => {
    const out = document.getElementById('sb-basic-out-en')
    document.getElementById('sb-basic-en')?.addEventListener('oas-submit', (e) => {
      out.textContent = 'oas-submit: total ' + e.detail.total + ' ' + e.detail.currency
    })
    const toggle = document.getElementById('sb-toggle-en')
    const btn = document.getElementById('sb-toggle-btn-en')
    btn?.addEventListener('click', () => {
      const loading = toggle.hasAttribute('loading')
      if (loading) toggle.removeAttribute('loading')
      else toggle.setAttribute('loading', '')
      btn.textContent = loading ? 'Toggle loading' : 'Restore'
    })
  })
})
</script>
