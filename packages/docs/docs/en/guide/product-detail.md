---
description: "Product detail page skeleton recipe: oas-sku (popup form) + oas-goods-action + oas-submit-bar + oas-product-card assembled at page level — gallery / info / variant / action bar / recommendations layout template with linkage."
---

# Product detail skeleton (scenario recipe)

> A page-level assembly demo: five blocks built entirely from existing components — `oas-carousel` (gallery) + `oas-price` (price) + `oas-sku` (variant popup) + `oas-goods-action` (mobile action bar) + `oas-submit-bar` (checkout variant) + `oas-product-card` (recommendations). No new component API; the page skeleton and linkage logic are all host code.

## Page structure and roles

| Block | Components | Notes |
| --- | --- | --- |
| Gallery | `oas-carousel` + `oas-image` | Main image slider with `indicators` dots |
| Info | Title + `oas-price` + `oas-tag` | Price follows the chosen variant (`oas-change` → write `value`) |
| Variants | `oas-sku` (`layout="popup"`) | Bottom sheet variant picker; `specs` / `skus` contract on the component page |
| Action bar | `oas-goods-action` | Icon group (favorite / shop / cart badge) + main buttons |
| Recommendations | `oas-product-card` (horizontal) | "You may also like", `layout="horizontal"` leading-image form |

## Detail page skeleton

<DemoBlock title="Five blocks: open the variant sheet → price and summary follow → cart badge increments">
  <div class="pd-page">
    <section class="pd-gallery" aria-label="Product gallery">
      <oas-carousel indicators>
        <div class="pd-slide"><oas-image src="/assets/demo-square-1.svg" alt="Product photo: front" fit="cover"></oas-image></div>
        <div class="pd-slide"><oas-image src="/assets/demo-square-2.svg" alt="Product photo: side" fit="cover"></oas-image></div>
        <div class="pd-slide"><oas-image src="/assets/demo-square-3.svg" alt="Product photo: detail" fit="cover"></oas-image></div>
      </oas-carousel>
    </section>
    <section class="pd-info">
      <h4 class="pd-title">Canvas sneakers, classic low-top</h4>
      <div class="pd-price-row">
        <oas-price id="pd-price-en" value="329" original="459" size="lg"></oas-price>
        <oas-tag type="danger" variant="solid">Limited offer</oas-tag>
      </div>
      <p class="pd-meta">12k sold monthly · SF Express · ships within 48h</p>
      <div class="pd-sku-row">
        <span class="pd-label">Variants</span>
        <span id="pd-sku-summary-en" class="pd-summary">No variant picked · 1 unit</span>
        <oas-button id="pd-sku-open-en" size="small">Choose</oas-button>
      </div>
    </section>
    <section class="pd-recs" aria-label="You may also like">
      <p class="pd-label">You may also like</p>
      <div class="pd-recs-row">
        <oas-product-card layout="horizontal" image="/assets/demo-square-5.svg" title="Light down jacket, navy L" price="399" original-price="599">
          <oas-button slot="actions" size="small" block>Add to cart</oas-button>
        </oas-product-card>
        <oas-product-card layout="horizontal" image="/assets/demo-square-6.svg" title="Pour-over coffee beans 200g" price="128">
          <oas-button slot="actions" size="small" block>Buy again</oas-button>
        </oas-product-card>
      </div>
    </section>
    <oas-goods-action
      id="pd-action-en"
      label="Product actions"
      items='[{"key":"favorite"},{"key":"shop"},{"key":"cart","badge":2}]'
      actions='[{"key":"add","text":"Add to cart"},{"key":"buy","text":"Buy now","primary":true}]'
    ></oas-goods-action>
  </div>
  <oas-sku
    id="pd-sku-en"
    layout="popup"
    specs='[{"key":"color","label":"Color","values":["Obsidian","Off-white"]},{"key":"size","label":"Size","values":["39","40","41"]}]'
    skus='[{"id":"bk-39","specs":{"color":"Obsidian","size":"39"},"price":329,"stock":5},{"id":"bk-40","specs":{"color":"Obsidian","size":"40"},"price":329,"stock":8},{"id":"bk-41","specs":{"color":"Obsidian","size":"41"},"price":339,"stock":0},{"id":"wh-39","specs":{"color":"Off-white","size":"39"},"price":339,"stock":3},{"id":"wh-40","specs":{"color":"Off-white","size":"40"},"price":349,"stock":6},{"id":"wh-41","specs":{"color":"Off-white","size":"41"},"price":349,"stock":4}]'
  ></oas-sku>
  <p id="pd-out-en" class="pd-out" role="status">Press "Choose" to open the variant sheet; pressing "Add to cart" without a complete selection redirects you there first.</p>
</DemoBlock>

**Key points**:

1. **The sku popup is one component, two forms**: `layout="popup"` pins the bottom sheet (the same panel DOM node is carried over, not rebuilt); below 480px viewport width auto-switches to the sheet and wide screens embed automatically — this page declares `popup` explicitly to demo the mobile form.
2. **Open/close is a controlled protocol**: `openOverlay()` opens; drag / backdrop / Esc inside the sheet are handled by the component (it removes `open` internally and fires `oas-open-change`) — the host does not take over closing.
3. **Price and summary hang off `oas-change`**: detail `{ value, quantity, sku, change }` — `sku` is the fully matched object (or `null` on partial selection); write back to `oas-price`'s `value` only on a match; the summary text is assembled by the host (variant values + quantity).
4. **The cart badge is a data write-back**: `oas-action-click` (detail `{ key, source }`) → host mutates the cart item's `badge` in `items` → rewrites the whole `items` attribute; the favorite item likewise writes back `active` (`aria-pressed` follows automatically).
5. **The incomplete-selection guard lives in the host**: when "Add to cart / Buy now" is pressed with an incomplete combination, the host opens the variant sheet to guide completion — business rules stay out of the component.

## Checkout variant: agree-to-terms gating

<DemoBlock title="submit-bar + terms checkbox: disabled until agreed, loading on submit">
  <oas-submit-bar id="pd-bar-en" total="329" label="Total" action-text="Place order" disabled>
    <label class="pd-agree">
      <input type="checkbox" id="pd-agree-en"> I have read and agree to the terms
    </label>
  </oas-submit-bar>
  <p id="pd-bar-out-en" class="pd-out" role="status">Agree to unlock "Place order"; the button enters loading while submitting.</p>
</DemoBlock>

**Key points**:

1. **The terms checkbox goes in the default slot** (the extension area left of the total) — a native `checkbox` is enough; no switch component needed. The host listens for `change` and writes `disabled`.
2. **Submit feedback in three beats**: `oas-submit` → set `loading` (built-in click lock + spinner + `aria-busy`) → remove it on success and surface the order feedback.
3. **goods-action and submit-bar are two page forms**: detail pages use goods-action (multiple entries + favorite), checkout / confirmation pages use submit-bar (total + one main button) — pick by page role; do not stack two action bars on one screen.

## Key code

```html
<!-- Page skeleton (five blocks; copy and swap the data) -->
<div class="pd-page">
  <section class="pd-gallery" aria-label="Product gallery">
    <oas-carousel indicators>
      <div class="pd-slide"><oas-image src="…" alt="…" fit="cover"></oas-image></div>
    </oas-carousel>
  </section>
  <section class="pd-info">
    <oas-price id="price" value="329" original="459" size="lg"></oas-price>
    <div class="pd-sku-row">
      <span id="sku-summary">No variant picked</span>
      <oas-button id="sku-open">Choose</oas-button>
    </div>
  </section>
  <oas-goods-action id="action" items="…" actions="…"></oas-goods-action>
</div>
<oas-sku id="sku" layout="popup" specs="…" skus="…"></oas-sku>
```

```ts
// Three linkages (host side)
skuOpen.addEventListener('oas-click', () => sku.openOverlay())

sku.addEventListener('oas-change', (e) => {
  const { value, quantity, sku: matched } = e.detail
  summary.textContent = (value ? Object.values(value).join(' / ') : 'No variant picked') + ' · ' + quantity + ' unit(s)'
  if (matched) price.setAttribute('value', String(matched.price))
})

action.addEventListener('oas-action-click', (e) => {
  // sku.value is a controlled getter that always returns an object (empty when nothing is picked) — test its keys, never write !sku.value (always truthy, the guard would never fire)
  if (e.detail.key === 'add' && Object.keys(sku.value ?? {}).length < 2) return sku.openOverlay() // combination incomplete (2 spec groups here, catches partial picks) → guide selection
  // …business handling; rewrite items after mutating badge / favorite state
})
```

## Notes

1. **Declare the gallery height explicitly**: slides carry no intrinsic height — `.pd-slide` sets a fixed height; `oas-image`'s `fit="cover"` only crops, it does not size — fill the slide via `::part(wrapper)` / `::part(image)` at `width/height: 100%` (this page's style block); pick 1:1 or 4:3 per business.
2. **`specs` holds selling dimensions only**: dimensions that change price or stock (color / size) go into `specs` (cartesian product); descriptive attributes like origin / material render in the host's info section and must not enter the combination table (see the sku page's specs guidance).
3. **Out-of-stock combinations gray out automatically**: `skus` entries with `stock: 0` are unselectable and marked "out of stock" in the sheet; when everything is out the quantity control disables — stock expression is built in; feed the data correctly and that is all.
4. **Action bar accessible name**: a page with a single bar can keep the default i18n name; the demo's `label="Product actions"` shows the custom form — screen-reader users rely on it to tell which bar this is.
5. **The page skeleton is host styling**: `.pd-page` max width, block gaps and borders are page-level CSS (token-based); the component library does not ship a "detail page layout" — that is exactly what this recipe layer is for.

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Components register late (theme dynamic import): wire everything after customElements.whenDefined (first-frame race discipline)
  const tags = ['oas-carousel', 'oas-image', 'oas-price', 'oas-sku', 'oas-goods-action', 'oas-submit-bar', 'oas-tag', 'oas-button']
  Promise.all(tags.map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    // —— Detail skeleton linkage ——
    const sku = el('pd-sku-en')
    const skuOpen = el('pd-sku-open-en')
    const summary = el('pd-sku-summary-en')
    const price = el('pd-price-en')
    const action = el('pd-action-en')
    const out = el('pd-out-en')
    if (sku && skuOpen && summary && price && action && out) {
      const picked = () => {
        const v = sku.value
        const text = v && Object.keys(v).length ? Object.values(v).join(' / ') : 'No variant picked'
        return text + ' · ' + (sku.quantity || 1) + ' unit(s)'
      }
      skuOpen.addEventListener('oas-click', () => sku.openOverlay())
      sku.addEventListener('oas-change', (e) => {
        const d = e.detail
        summary.textContent = picked()
        if (d.sku) price.setAttribute('value', String(d.sku.price))
        out.textContent = 'oas-change (' + d.change + '): ' + picked() + (d.sku ? ', price synced to ¥' + d.sku.price : ' (combination incomplete, price not synced)')
      })
      // Action bar: items source of truth lives in the host; rewrite after mutating badge / favorite
      const items = [
        { key: 'favorite', active: false },
        { key: 'shop' },
        { key: 'cart', badge: 2 },
      ]
      let cartCount = 2
      const syncItems = () => action.setAttribute('items', JSON.stringify(items))
      action.addEventListener('oas-action-click', (e) => {
        const key = e.detail.key
        if (key === 'favorite') {
          const fav = items.find((it) => it.key === 'favorite')
          fav.active = !fav.active
          syncItems()
          out.textContent = fav.active ? 'Favorited (active write-back → aria-pressed synced).' : 'Unfavorited.'
          return
        }
        if (key === 'shop') {
          out.textContent = 'Visit shop: host-side routing (the component only returns the key).'
          return
        }
        // add / buy: guide selection first when incomplete
        const v = sku.value
        if (!v || Object.keys(v).length < 2) {
          sku.openOverlay()
          out.textContent = 'Variant not complete: opened the variant sheet for you (host-side guard).'
          return
        }
        if (key === 'add') {
          cartCount++
          const cart = items.find((it) => it.key === 'cart')
          cart.badge = cartCount
          syncItems()
          out.textContent = 'Added to cart: ' + picked() + ' (badge +1 → items data write-back).'
        } else {
          out.textContent = 'Buy now: heading to checkout (host routing) with ' + picked() + '.'
        }
      })
    }
    // —— Checkout variant ——
    const bar = el('pd-bar-en')
    const agree = el('pd-agree-en')
    const barOut = el('pd-bar-out-en')
    if (bar && agree && barOut) {
      agree.addEventListener('change', () => {
        if (agree.checked) bar.removeAttribute('disabled')
        else bar.setAttribute('disabled', '')
        barOut.textContent = agree.checked ? 'Terms agreed: submit unlocked.' : 'Terms not agreed: submit disabled.'
      })
      bar.addEventListener('oas-submit', () => {
        bar.setAttribute('loading', '')
        barOut.textContent = 'Submitting… (loading locks clicks, no oas-submit fires)'
        setTimeout(() => {
          bar.removeAttribute('loading')
          barOut.textContent = 'Order placed: the host writes its own order business on oas-submit.'
        }, 800)
      })
    }
  })
})
</script>

<style>
.pd-page {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-4);
}
.pd-slide {
  height: 220px;
}
.pd-slide oas-image {
  display: block;
  width: 100%;
  height: 100%;
}
/* fit="cover" crops but does not size: fill via the wrapper / image parts (verified working) */
.pd-slide oas-image::part(wrapper) {
  display: block;
  width: 100%;
  height: 100%;
}
.pd-slide oas-image::part(image) {
  width: 100%;
  height: 100%;
}
.pd-info {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.pd-title {
  margin: 0;
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
}
.pd-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-3);
}
.pd-meta {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.pd-label {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.pd-sku-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-2) var(--oas-space-3);
}
.pd-summary {
  flex: 1;
  min-width: 0;
  font-size: var(--oas-font-size-sm);
}
.pd-recs {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.pd-recs-row {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.pd-out {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.pd-agree {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
}
</style>
