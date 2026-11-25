---
description: "Order list container: status tabs (tabs JSON dual-channel + keyboard roving tabindex) + order-card list slot (host supplies order-card / custom cards) + bottom-reached load-more (sentinel protocol) + empty state; a light container with no built-in card rendering."
---

# OrderList

Light container: status tabs (`tabs` JSON dual-channel `[{ key, label, count?, disabled? }]`) + order-card list **slot** (the host places `oas-order-card` / custom cards — no built-in card rendering; card content, styling and click behavior are fully owned by the host) + load-more (aligned with the goods-list sentinel protocol: sentinel + pending dedupe + slot-change release + hidden-container guard) + empty state. Tab switches fire `oas-tab-change` (detail `{ key, label }`).

Two delivery options: the container (this component — tabs, bottom-reached loading and empty state out of the box) or the recipe (hand-assemble `oas-tabs` + `oas-order-card`, see “Assembly recipe” below).

## Tabs + order-card slot

`active` is the current tab key (user clicks / keyboard activation write it back and fire; host writes are silent); `count` renders a badge and the accessible name derives from visible content (label + badge as continuous text). On switch the host swaps the slot content by key (the demo uses light cards as stand-ins):

<DemoBlock title="Status tabs + order-card slot (switch swaps content)">
  <oas-order-list id="ol-basic" active="pending"
    tabs='[{"key":"all","label":"All","count":8},{"key":"pending","label":"Pending","count":2},{"key":"shipped","label":"Shipped","count":4},{"key":"done","label":"Done"}]'
  ></oas-order-list>
  <p id="ol-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click a tab to see the oas-tab-change feedback and the list swap.
  </p>
</DemoBlock>

## Load more (bottom-reached protocol)

Reaching the bottom fires `oas-load-more` (the sentinel triggers 240px early); the host sets `loading` to show the spinner + loading text, and **appending order cards (slot change) releases the pending state**; `no-more` shows “No more orders” and stops triggering:

<DemoBlock title="Bottom-reached load more (demo button simulates) + end state">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-order-list id="ol-more" tabs='[{"key":"all","label":"All orders"}]'>
      <div style="padding: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg)">Order card 1: cotton tee (to ship)</div>
    </oas-order-list>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="ol-load" size="small" type="primary">Simulate bottom (append cards)</oas-button>
      <oas-button id="ol-done" size="small">Set no-more</oas-button>
      <span id="ol-more-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

## Empty state

With no cards in the slot the empty state renders; the `empty` slot replaces it entirely (default i18n “No orders yet”):

<DemoBlock title="Empty state (empty slot)">
  <oas-order-list tabs='[{"key":"done","label":"Done"}]'>
    <div slot="empty" style="display: grid; gap: var(--oas-space-2); justify-items: center; padding: var(--oas-space-6)">
      <span>Done orders only go back six months — check All orders</span>
      <oas-button size="small">View all orders</oas-button>
    </div>
  </oas-order-list>
</DemoBlock>

## Assembly recipe (tabs + order-card, hand-assembled)

The container-free alternative — assemble `oas-tabs` + `oas-order-card` (for order pages that already own state management and only want the primitives):

```html
<oas-tabs id="order-status" items='[{"key":"all","label":"All"},{"key":"pending","label":"Pending"}]'></oas-tabs>
<div id="order-cards">
  <oas-order-card order-no="NO.20261125001" status="pending" total="129">
    <oas-button slot="actions" size="small" type="primary">Pay now</oas-button>
  </oas-order-card>
</div>
<script>
  document.getElementById('order-status').addEventListener('oas-change', (e) => {
    // filter the order-cards children by e.detail.value
  })
</script>
```

Container and recipe are **either-or**: choose the container for tab keyboard nav / bottom-reached protocol / empty state out of the box; choose the recipe when you already own state management and want minimal dependencies.

## Keyboard & accessibility

- Tabs use `role="tablist"` + `role="tab"` (`aria-selected`; accessible names derive from visible content — label + badge continuous text, no aria-label wrapping); each tab's `aria-controls` points at the card area `role="tabpanel"` (id derived from the tabs input, unique per page instance).
- Keyboard roving tabindex: arrow keys move focus, Home / End jump to the edges; **manual activation** — arrows move focus only, Enter / Space activates; disabled tabs are unreachable and inert.
- Empty / loading / sentinel live outside the tabpanel semantics; the loading area is a `role="status"` + `aria-live="polite"` live region.
- RTL mirrors via logical properties; colors are token-based (dark theme follows).

## Custom styling notes

`::part(tablist)` is the horizontal tab strip (overflow-x scroll, scrollbar hidden); `::part(tab)` pills (selected background uses `--oas-color-primary`, targetable via `[aria-selected='true']`); `::part(count)` badge; card area `::part(body)` is a vertical flex (slot gap `--oas-space-3`); bottom area `::part(more)` + `::part(spinner)`. Slot cards never enter the shadow — card styling is owned by the host / `oas-order-card`.

<script setup lang="ts">
import { onMounted } from 'vue'

// Demo script conventions (do not move): ① must be a page-level script setup — inside DemoBlock
// VitePress does not extract it and the raw text breaks the page (imports fail / hydration mismatch);
// ② placed before `## API`: that section is the api:gen generated region, business scripts must not live there.
onMounted(() => {
  customElements.whenDefined('oas-order-list').then(() => {
    const basic = document.getElementById('ol-basic')!
    const basicOut = document.getElementById('ol-basic-out')!
    const pool: Record<string, Array<{ title: string; status: string }>> = {
      all: [
        { title: 'Cotton tee', status: 'To ship' },
        { title: 'Canvas sneakers', status: 'Shipped' },
        { title: 'Commuter bag', status: 'Done' },
      ],
      pending: [{ title: 'Cotton tee (unpaid)', status: 'Pay now' }],
      shipped: [
        { title: 'Canvas sneakers (in transit)', status: 'Track' },
        { title: 'Running shoes (in transit)', status: 'Track' },
      ],
      done: [{ title: 'Commuter bag (done)', status: 'Buy again' }],
    }
    const renderCards = (key: string): void => {
      basic.querySelectorAll('[data-demo-card]').forEach((n) => n.remove())
      for (const card of pool[key] ?? []) {
        const div = document.createElement('div')
        div.dataset.demoCard = ''
        div.style.cssText =
          'display:flex;justify-content:space-between;gap:8px;align-items:center;padding:12px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-lg)'
        const title = document.createElement('span')
        title.textContent = card.title
        const btn = document.createElement('oas-button')
        btn.setAttribute('size', 'small')
        btn.textContent = card.status
        div.append(title, btn)
        basic.appendChild(div)
      }
    }
    renderCards('pending')
    basic.addEventListener('oas-tab-change', (e) => {
      const d = (e as CustomEvent).detail
      renderCards(d.key)
      basicOut.textContent = `oas-tab-change: ${d.key} (${d.label}) — host swapped the cards`
    })

    const more = document.getElementById('ol-more')!
    const moreOut = document.getElementById('ol-more-out')!
    let page2 = 0
    more.addEventListener('oas-load-more', () => {
      more.setAttribute('loading', '')
      moreOut.textContent = 'oas-load-more: loading next page…'
      setTimeout(() => {
        page2 += 1
        for (let i = 0; i < 2; i++) {
          const div = document.createElement('div')
          div.style.cssText =
            'padding:12px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-lg)'
          div.textContent = `Order card ${1 + page2 * 2 + i}: page-2 order (appending releases the pending state)`
          more.appendChild(div)
        }
        more.removeAttribute('loading')
        moreOut.textContent = 'oas-load-more: appended 2 cards (the sentinel also triggers for real on scroll)'
      }, 400)
    })
    document.getElementById('ol-load')?.addEventListener('click', () => {
      more.scrollIntoView({ block: 'end' })
      document.dispatchEvent(new Event('scroll'))
    })
    document.getElementById('ol-done')?.addEventListener('click', () => {
      more.setAttribute('no-more', '')
      moreOut.textContent = 'no-more set: end state shown and triggering stops'
    })
  })
})
</script>

## API

### oas-order-list

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Current tab key: user clicks / keyboard activation write it back and fire oas-tab-change; host writes are silent; defaults to the first tab | `string` | — |
| `loading` | Load-more loading state: the host sets it after receiving oas-load-more (spinner + loading text; setting it releases the pending bottom-reached state) | `boolean` | — |
| `no-more` | End state: shows “No more orders” and stops triggering | `boolean` | — |
| `tabs` | Tab config JSON array `[{ key, label, count?, disabled? }]` (entries missing key or label are ignored; invalid JSON warns once and hides the tablist) | `OrderTab[] \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Current tab key: get+set dual channel, writes reflect the `active` attribute (silent; only user interaction fires) | `string` | — |
| `tabs` | Tab config: get+set dual channel (array or JSON string), writes reflect the `tabs` attribute | `OrderTab[] \| string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-load-more` | Fires when the sentinel enters the viewport (240px early) unless loading / no-more; after firing the component waits for the host to set `loading` or change slot content (appending cards); if the host does neither it stops triggering, `detail: {}` |
| `oas-tab-change` | Fires after the user activates a tab, `detail: { key, label }`; re-clicking the active tab does not re-fire; host writes to `active` do not fire |

#### Slots

| Name | Description |
| --- | --- |
| default | Order card list: the host places oas-order-card / custom cards (cards stay in light DOM, never moved; content, styling and clicks are fully owned by the host) |
| `empty` | Empty state content (renders when the slot has no cards; default “No orders yet” text) |
