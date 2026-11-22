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
