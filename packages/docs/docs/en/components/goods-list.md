---
description: "Product list container: waterfall (auto / fixed columns with height-balanced placement) and vertical list forms, `items` JSON dual channel rendering built-in simple cards, a card slot that fully replaces them, bottom-reached load-more / no-more state and an empty slot."
---

# GoodsList

Container for product list pages: `layout="waterfall"` (default) renders a waterfall — `columns` is a fixed number or `auto` by container width (<640 → 2 columns, <1024 → 3, otherwise 4), and cards are placed into the **shortest column by accumulated height**; `layout="list"` renders a single vertical column. The data face is the `items` JSON dual channel (built-in simple cards, aligned with `oas-product-card`: missing-image placeholder, struck-through original price, two-line title clamp); the default slot can **fully replace** the built-in cards with the host's own cards (slot wins over the default rendering). Reaching the bottom emits `oas-load-more`; the host sets `loading` for the loading state and `no-more` for the end-of-list state.

## Basic usage

Built-in simple card: image (missing / failed load → dashed placeholder) + two-line clamped title + tag row + price (`price` / `originalPrice`, with `currency` / `locale` / `precision` passed to `oas-price`). Clicking a card emits `oas-item-click` (detail carries `index` and the full `item`):

<DemoBlock title="Waterfall with auto columns + built-in cards">
  <oas-goods-list id="gl-basic"></oas-goods-list>
  <p id="gl-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click a product card to see oas-item-click feedback.
  </p>
</DemoBlock>

## Fixed columns and vertical list

Write a fixed number (1–8) into `columns`; `layout="list"` ignores it and renders a single vertical column of horizontal rows (image on the start side, info column beside it):

<DemoBlock title="Fixed 3 columns vs vertical list">
  <div style="display: grid; gap: var(--oas-space-4); width: 100%">
    <oas-goods-list
      columns="3"
      items='[{"title":"Waterfall A","price":45,"image":"/assets/demo-square-2.svg"},{"title":"Waterfall B","price":66,"tags":["Hot"]},{"title":"Waterfall C","price":88,"image":"/assets/demo-square-3.svg"},{"title":"Waterfall D","price":120,"originalPrice":150},{"title":"Waterfall E","price":210,"image":"/assets/demo-square-4.svg"},{"title":"Waterfall F","price":99,"tags":["Free shipping"],"image":"/assets/demo-square-5.svg"}]'
    ></oas-goods-list>
    <oas-goods-list
      layout="list"
      items='[{"title":"List: lightweight product row","price":45,"tags":["New"],"image":"/assets/demo-square-1.svg"},{"title":"List: struck-through price supported","price":129,"originalPrice":169,"image":"/assets/demo-square-2.svg"},{"title":"List: tags work the same","price":66,"tags":["Hot","Free shipping"],"image":"/assets/demo-square-3.svg"}]'
    ></oas-goods-list>
  </div>
</DemoBlock>

## 卡片位插槽整体替换

When the default slot has content, `items` is ignored — the host supplies its own cards (e.g. `oas-product-card`), and the container balances them into columns by measured height; card content, clicks and navigation are fully owned by the host:

<DemoBlock title="Host oas-product-card in the card slot">
  <oas-goods-list id="gl-slot" columns="3">
    <oas-product-card
      image="/assets/demo-square-1.svg"
      title="Host card: cotton T-shirt"
      price="79"
      original-price="99"
    >
      <oas-tag slot="tags" type="success">Sold by us</oas-tag>
      <oas-button slot="actions" size="small" type="primary">Add to cart</oas-button>
    </oas-product-card>
    <oas-product-card
      image="/assets/demo-square-2.svg"
      title="Host card: canvas sneakers"
      price="129"
    >
      <oas-tag slot="tags" type="warning">Hot</oas-tag>
      <oas-button slot="actions" size="small" type="primary">Add to cart</oas-button>
    </oas-product-card>
    <div style="padding: var(--oas-space-4); border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-lg)">
      Any custom content can act as a "card" (balanced placement by measured height)
    </div>
  </oas-goods-list>
</DemoBlock>

## 加载更多与空态

Reaching the bottom emits `oas-load-more` (a sentinel enters the viewport 240px early); the host sets `loading` to show the spinner, appends `items`, then removes `loading`; `no-more` shows the end-of-list text and stops further emission. The `empty` slot replaces the empty state (default "no products yet" text):

<DemoBlock title="Load more (button simulates bottom) + empty state">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-goods-list id="gl-more" columns="3" items='[{"title":"Page 1 item A","price":10,"image":"/assets/demo-square-1.svg"},{"title":"Page 1 item B","price":20},{"title":"Page 1 item C","price":30,"image":"/assets/demo-square-2.svg"}]'></oas-goods-list>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="gl-load" size="small" type="primary">Simulate bottom (load next page)</oas-button>
      <oas-button id="gl-done" size="small">Mark as no-more</oas-button>
      <span id="gl-more-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="Empty state (empty slot)">
  <oas-goods-list items='[]'>
    <div slot="empty" style="display: grid; gap: var(--oas-space-2); justify-items: center; padding: var(--oas-space-6)">
      <span>No products match the current filters</span>
      <oas-button size="small">Clear filters</oas-button>
    </div>
  </oas-goods-list>
</DemoBlock>

## Keyboard and accessibility

- The card grid container carries `role="list"` + built-in cards as `role="listitem"` (column divs are `presentation` so the list semantics stay unbroken), with `aria-label` "Product list"; the load-more region is an `aria-live="polite"` `role="status"` region (loading / end-of-list changes are announced) and sits outside the list semantics, along with the empty state and the sentinel.
- Built-in cards are Tab-focusable and Enter emits `oas-item-click`; the image `alt` takes the title, and the missing-image placeholder text goes into `aria-label` (not rendered on screen). Slotted cards get `role="listitem"` added by the component once moved into columns (a host-provided role is not overwritten).
- `layout="list"` renders horizontal rows (fixed-size image on the start side + an info column beside it), stacked vertically.
- The waterfall DOM order matches the declared card order (column placement does not change the screen-reader order); layout uses logical properties and mirrors automatically under RTL.

## 自定义样式须知

`::part(grid)` is the multi-column flex container (columns `::part(col)` are equal-width column flex with `--oas-space-3` gaps); the built-in card `::part(card)` mirrors `oas-product-card` (media / title / tags / price). Column changes rebuild the column DOM — keep that in mind when overriding `::part(col)` layout, since cards are re-assigned.


<script setup lang="ts">
import { onMounted } from 'vue'

// Page-level script (VitePress only extracts the page-level script setup — all demo logic lives here, never inside a DemoBlock)
onMounted(() => {
  customElements.whenDefined('oas-goods-list').then(() => {
    // —— Basic usage demo ——
    const basic = document.getElementById('gl-basic')!
    basic.setAttribute('items', JSON.stringify([
      { title: 'Cotton T-shirt', price: 79, originalPrice: 99, tags: ['New'], image: '/assets/demo-square-1.svg' },
      { title: 'Canvas sneakers, breathable mesh', price: 129, tags: ['Hot'], image: '/assets/demo-square-2.svg' },
      { title: 'Commuter shoulder bag', price: 199, originalPrice: 259, image: '/assets/demo-square-3.svg' },
      { title: 'Knit cardigan', price: 149, tags: ['Free shipping'], image: '/assets/demo-square-4.svg' },
      { title: 'Running shoes with cushioning', price: 259, image: '/assets/demo-square-5.svg' },
      { title: 'Waterproof hiking backpack 40L', price: 329, originalPrice: 399, tags: ['Outdoor'], image: '/assets/demo-square-6.svg' },
      { title: 'Linen shirt (placeholder example)', price: 99 },
      { title: 'Quick-dry shorts', price: 59, tags: ['Clearance'], image: '/assets/demo-square-1.svg' },
    ]))
    basic.setAttribute('currency', 'CNY')
    basic.setAttribute('locale', 'zh-CN')
    basic.setAttribute('precision', '2')
    const out = document.getElementById('gl-basic-out')!
    basic.addEventListener('oas-item-click', (e) => {
      const d = (e as CustomEvent).detail
      out.textContent = `oas-item-click: #${d.index} ${d.item.title}`
    })

    // —— Load more demo ——
    const more = document.getElementById('gl-more')!
    const moreOut = document.getElementById('gl-more-out')!
    more.addEventListener('oas-load-more', () => {
      // Host protocol: set loading → append items → remove loading
      more.setAttribute('loading', '')
      moreOut.textContent = 'oas-load-more: loading page 2…'
      setTimeout(() => {
        const next = Array.from({ length: 3 }, (_, i) => ({
          title: `Page 2 item ${String.fromCharCode(65 + i)}`,
          price: 100 + i * 10,
          image: i % 2 === 0 ? '/assets/demo-square-3.svg' : undefined,
        }))
        const current = JSON.parse(more.getAttribute('items')!) as unknown[]
        more.setAttribute('items', JSON.stringify([...current, ...next]))
        more.removeAttribute('loading')
        moreOut.textContent = 'oas-load-more: 3 more items appended (scrolling into the sentinel also triggers it for real)'
      }, 400)
    })
    document.getElementById('gl-load')?.addEventListener('click', () => {
      more.scrollIntoView({ block: 'end' })
      window.dispatchEvent(new Event('scroll'))
    })
    document.getElementById('gl-done')?.addEventListener('click', () => {
      more.setAttribute('no-more', '')
      moreOut.textContent = 'no-more set: end-of-list shown, no further emission'
    })
  })
})
</script>

## API

### oas-goods-list

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `columns` | Waterfall columns: a fixed number (1–8, clamped) or `auto` (default; container-width breakpoints <640 → 2, <1024 → 3, otherwise 4; a ResizeObserver re-balances when the width crosses a breakpoint); the list form is always a single column | — | — |
| `currency` | ISO 4217 currency (passed to the built-in `oas-price`, default `CNY`) | — | — |
| `items` | Product data as a JSON array `[{ image?, title, price?, originalPrice?, tags?: string[] }]` (built-in simple cards; entries without `title` are ignored, invalid JSON warns once and clears); ignored when the card slot has content | `GoodsItem[] \| string` | — |
| `layout` | Form: `waterfall` (default, multi-column waterfall) / `list` (single vertical column); invalid values fall back to `waterfall` and warn once | — | — |
| `loading` | Load-more loading state: the host sets it after receiving `oas-load-more` (renders the spinner + loading text; setting it also releases the bottom-reached pending state) | `boolean` | — |
| `locale` | Amount formatting locale (passed to the built-in `oas-price`) | — | — |
| `no-more` | End-of-list state: shows the "no more items" text and stops the bottom-reached emission | `boolean` | — |
| `precision` | Amount decimal places (passed to the built-in `oas-price`, default 2) | — | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `items` | Product data: get+set dual channel (array or JSON string), writes reflect the `items` attribute | `GoodsItem[] \| string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-item-click` | Emitted after a built-in card is clicked (or Enter), `detail: { index, item }`; slotted cards do not emit (content and clicks are host-owned) |
| `oas-load-more` | Emitted when the sentinel enters the viewport (240px early) while not loading / no-more; after emission the component waits — the host sets `loading` or changes `items` to release it; doing neither stops further emission, `detail: {}` |

#### Slots

| Name | Description |
| --- | --- |
| default | Card slot full replacement: with assigned elements the `items` rendering is ignored, and the host cards are balanced into columns in order |
| `empty` | Empty-state content (rendered when `items` is empty and no slotted cards exist; default "no products yet" text) |
