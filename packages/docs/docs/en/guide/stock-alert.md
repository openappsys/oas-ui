---
description: "Low-stock alert recipe: oas-price + oas-tag threshold tiers — in-stock / low / critical / sold-out copy and semantic colors, pure host logic (components have no stock concept), plus product-card stock slots."
---

# Low-stock alerts (scenario recipe)

> A **pure host-logic** demo for the price and stock hint slot: `oas-price` (price display) + `oas-tag` (semantic badge) + a small tier function. No stock component exists — and none is needed: stock is a number; copy and semantic color are the host's presentation policy.

## Threshold tiers

| Tier | Condition (units) | Tag form | Copy policy |
| --- | --- | --- | --- |
| In stock | `> 100` | `type="success"` "In stock" | Plenty (N units) — no artificial scarcity |
| Low | `20 < n ≤ 100` | `type="warning"` "Only N left" | Stock running low, only N left |
| Critical | `0 < n ≤ 20` | `type="danger"` "Only N left" | Only N left, act fast |
| Sold out | `= 0` | `type="default"` "Sold out" | Sold out, check similar items + buy entry disabled |

The thresholds are business parameters — 100 / 20 above are examples; substitute your own operations policy.

## Threshold linkage demo

<DemoBlock title="Change the stock number and watch the hint slot react (stepper / quick tiers / typing all work)">
  <div class="sa-goods">
    <div class="sa-goods-head">
      <div class="sa-goods-main">
        <p class="sa-title">Smartwatch Pro (45mm aluminium)</p>
        <oas-price value="1299" original="1699" size="lg"></oas-price>
      </div>
      <oas-tag id="sa-tag-en" type="success" variant="solid">In stock</oas-tag>
    </div>
    <p id="sa-text-en" class="sa-text" role="status">Plenty in stock (528 units)</p>
  </div>
  <div class="sa-ctrl">
    <label class="sa-label" for="sa-stock-en">Stock units</label>
    <oas-input-number id="sa-stock-en" value="528" min="0" max="999" step="1" label="Stock units" style="width: 160px"></oas-input-number>
    <div class="sa-quick">
      <oas-button class="sa-quick-btn" size="small" data-stock="528">528 (plenty)</oas-button>
      <oas-button class="sa-quick-btn" size="small" data-stock="48">48 (low)</oas-button>
      <oas-button class="sa-quick-btn" size="small" data-stock="3">3 (critical)</oas-button>
      <oas-button class="sa-quick-btn" size="small" data-stock="0">0 (sold out)</oas-button>
    </div>
  </div>
  <p id="sa-out-en" class="sa-out" role="status">Change the stock to see the tiers: &gt;100 in stock / ≤100 low / ≤20 critical / 0 sold out.</p>
</DemoBlock>

**Key points**:

1. **Components have no stock concept**: `oas-price` handles price, `oas-tag` handles the semantic badge, and the tier function is a dozen lines of host code — the abstraction you need is a policy, not a container.
2. **Semantic colors switch only `type`, never hard-coded values**: the four tiers map to theme tokens (dark variants included) and survive theme switches automatically.
3. **Announcements ride `role="status"`**: on tier switches screen-reader users hear "only 3 left, act fast" — stock hints are accessibility information, not just decoration.
4. **Sold out is a behavior tier, not just a color tier**: in real business a sellout also disables the buy entry (`disabled` on the submit-bar / goods-action button), as shown in the cards below.

## Stock slots on product cards

<DemoBlock title="product-card tags slot: in stock / only N left / sold out">
  <div class="sa-cards">
    <oas-product-card image="/assets/demo-square-2.svg" title="Cotton T-shirt, unisex" price="99" original-price="129">
      <oas-tag slot="tags" size="sm" type="success" variant="solid">In stock</oas-tag>
      <oas-button slot="actions" size="small" type="primary" block>Add to cart</oas-button>
    </oas-product-card>
    <oas-product-card image="/assets/demo-square-3.svg" title="Canvas sneakers, off-white low-top" price="199">
      <oas-tag slot="tags" size="sm" type="danger" variant="solid">Only 3 left</oas-tag>
      <oas-button slot="actions" size="small" block>Add to cart</oas-button>
    </oas-product-card>
    <oas-product-card image="/assets/demo-square-4.svg" title="Wool scarf, turmeric" price="59">
      <oas-tag slot="tags" size="sm" type="default">Sold out</oas-tag>
      <oas-button slot="actions" size="small" disabled block>Sold out</oas-button>
    </oas-product-card>
  </div>
</DemoBlock>

**Key points**:

1. The `tags` slot is free content — drop in the `oas-tag` produced by the tier function and you have a stock slot; one tier function serves both the detail page and card walls.
2. The sold-out card's button uses `disabled`: visually readable (gray retained) but untriggerable, matching the "buy entry closed" business semantics.

## Key code

```ts
// tag / text are element references from the demo above (#sa-tag / #sa-text, getElementById on this page)
// Threshold tiers (host policy, copy-ready; replace 100 / 20 with your own policy)
function stockTier(n: number) {
  if (n <= 0) return { tag: 'Sold out', type: 'default', text: 'Sold out, check similar items', buyable: false }
  if (n <= 20) return { tag: `Only ${n} left`, type: 'danger', text: `Only ${n} left, act fast`, buyable: true }
  if (n <= 100) return { tag: `Only ${n} left`, type: 'warning', text: `Running low, ${n} left`, buyable: true }
  return { tag: 'In stock', type: 'success', text: `Plenty in stock (${n.toLocaleString()} units)`, buyable: true }
}

function renderStock(n: number) {
  const t = stockTier(n)
  tag.setAttribute('type', t.type)
  // Strong states (success / warning / danger) stay solid; the sold-out weak state falls back to soft, matching the static "Sold out" card below
  if (t.type === 'default') tag.removeAttribute('variant')
  else tag.setAttribute('variant', 'solid')
  tag.textContent = t.tag
  text.textContent = t.text
  // The host disables the buy entry on sold-out (submit-bar / goods-action button):
  // buyButton.toggleAttribute('disabled', !t.buyable) // presence attribute → toggleAttribute
}
```

## Notes

1. **Tier switching is host logic**: stock changes arrive from polling / push / API responses; the host calls `renderStock(n)` once per new number — components stay unaware.
2. **`toLocaleString` for thousands**: keep the stock number formatting consistent with the price (thousands built into `oas-price`).
3. **Avoid flicker at boundaries**: near a threshold (100 ↔ 101) copy and color can flip rapidly — add hysteresis host-side if needed (e.g. only return to "in stock" below 90 once "low" has engaged).
4. **Dark and high-contrast themes**: all four semantic colors ride tokens and switch automatically in dark mode; do not override `type` semantic colors with arbitrary custom colors unless you have re-checked contrast.

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Components register late (theme dynamic import): wire everything after customElements.whenDefined (first-frame race discipline)
  Promise.all(['oas-price', 'oas-tag', 'oas-input-number', 'oas-button'].map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    const tag = el('sa-tag-en')
    const text = el('sa-text-en')
    const stock = el('sa-stock-en')
    const out = el('sa-out-en')
    if (tag && text && stock && out) {
      const tier = (n) => {
        if (n <= 0) return { tag: 'Sold out', type: 'default', text: 'Sold out, check similar items (buy entry disabled)' }
        if (n <= 20) return { tag: 'Only ' + n + ' left', type: 'danger', text: 'Only ' + n + ' left, act fast' }
        if (n <= 100) return { tag: 'Only ' + n + ' left', type: 'warning', text: 'Running low, only ' + n + ' left' }
        return { tag: 'In stock', type: 'success', text: 'Plenty in stock (' + n.toLocaleString() + ' units)' }
      }
      const render = (n) => {
        const t = tier(n)
        tag.setAttribute('type', t.type)
        // Strong states (success / warning / danger) stay solid; the sold-out weak state falls back to soft, matching the static "Sold out" card below
        if (t.type === 'default') tag.removeAttribute('variant')
        else tag.setAttribute('variant', 'solid')
        tag.textContent = t.tag
        text.textContent = t.text
        out.textContent = 'Now ' + n + ' units → tag=' + t.type + ' "' + t.tag + '".'
      }
      stock.addEventListener('oas-change', (e) => {
        render(Math.max(0, Number(e.detail.value) || 0))
      })
      document.querySelectorAll('.sa-quick-btn').forEach((btn) => {
        btn.addEventListener('oas-click', () => {
          const n = Number(btn.dataset.stock)
          stock.setAttribute('value', String(n)) // the input is the source of truth; quick tiers only write values
          render(n)
        })
      })
    }
  })
})
</script>

<style>
.sa-goods {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
}
.sa-goods-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--oas-space-3);
}
.sa-goods-main {
  min-width: 0;
}
.sa-title {
  margin: 0 0 var(--oas-space-1);
  font-weight: 600;
}
.sa-text {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.sa-ctrl {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-3);
  margin-top: var(--oas-space-3);
}
.sa-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.sa-quick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.sa-out {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.sa-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--oas-space-3);
  width: 100%;
}
</style>
