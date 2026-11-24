---
description: "Product card: image with a configurable aspect ratio, two-line clamped title, price with a struck-through original, plus tags / promo / actions slots and vertical or horizontal layouts."
---

# ProductCard

A high-frequency card for product grids and recommendation slots: image (configurable ratio), two-line clamped title, price with an optional struck-through original, and three slots for tags, promo copy and actions. `layout` offers vertical (default) and horizontal forms.

## Basic usage

`image` / `title` / `price` are the minimum set; `original-price` adds the struck-through price and the slots carry tags and buttons:

<DemoBlock title="Vertical card with tags and an action">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card
      image="/assets/demo-square-1.svg"
      title="Cotton tee, unisex fit"
      price="99"
      original-price="129"
    >
      <oas-tag slot="tags" size="sm">20% off</oas-tag>
      <oas-tag slot="tags" size="sm">Sold by us</oas-tag>
      <oas-button slot="actions" size="small" type="primary" style="width: 100%">Add to cart</oas-button>
    </oas-product-card>
    <oas-product-card
      image="/assets/demo-square-2.svg"
      title="Canvas sneakers, ivory low-top"
      price="199"
      original-price="259"
    >
      <oas-tag slot="tags" size="sm">Free shipping</oas-tag>
      <oas-button slot="actions" size="small" style="width: 100%">View details</oas-button>
    </oas-product-card>
  </div>
</DemoBlock>

## Image ratio

`image-ratio` sets the aspect ratio of the media box; `16:9`, `4/3` and plain numbers (`1.5`) are accepted. The default is `1:1`; an invalid value falls back to `1:1` and warns once in development.

<DemoBlock title="1:1 (default) / 4:3 / 16:9">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card image="/assets/demo-square-3.svg" title="Square (default 1:1)" price="59"></oas-product-card>
    <oas-product-card image="/assets/demo-tall-1.svg" image-ratio="4:3" title="Four by three" price="89"></oas-product-card>
    <oas-product-card image="/assets/demo-wide-1.svg" image-ratio="16:9" title="Sixteen by nine (banner)" price="129"></oas-product-card>
  </div>
</DemoBlock>

## Price and currency

`price` is the current price and `original-price` the struck-through one (screen readers announce it as the original price); `currency` / `locale` / `precision` match `oas-price`:

<DemoBlock title="USD / one decimal">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card
      image="/assets/demo-square-4.svg"
      title="Wool scarf"
      price="59.9"
      original-price="79.9"
      currency="USD"
      locale="en-US"
      precision="1"
    ></oas-product-card>
    <oas-product-card title="Product without image (placeholder)" price="39"></oas-product-card>
  </div>
</DemoBlock>

## Horizontal layout

`layout="horizontal"` moves the image to the inline start (fixed 104px wide, height by ratio) with the content at the inline end — handy for cart recommendations and order add-ons.

<DemoBlock title="layout=horizontal">
  <div style="display: grid; gap: var(--oas-space-2)">
    <oas-product-card
      layout="horizontal"
      image="/assets/demo-square-5.svg"
      title="Light down jacket, navy L"
      price="399"
      original-price="599"
    >
      <oas-tag slot="tags" size="sm" color="orange">Promo</oas-tag>
      <span slot="promo">Save 50 over 300</span>
      <oas-button slot="actions" size="small">Add to cart</oas-button>
    </oas-product-card>
    <oas-product-card
      layout="horizontal"
      image="/assets/demo-square-6.svg"
      title="Coffee beans, 200g medium-light"
      price="128"
    >
      <oas-button slot="actions" size="small">Buy again</oas-button>
    </oas-product-card>
  </div>
</DemoBlock>

## Promo copy and long titles

The `promo` slot carries promotional copy (discounts, flash-sale countdowns); titles are clamped at two lines while the full text stays in the DOM and in the `title` tooltip.

<DemoBlock title="Promo copy + two-line clamp">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card
      image="/assets/demo-square-1.svg"
      title="This is a deliberately long product title used to verify that the title is clamped after two lines while the full copy stays available to assistive tech and in the tooltip"
      price="69"
    >
      <span slot="promo">Flash sale at 20:00</span>
    </oas-product-card>
  </div>
</DemoBlock>

## Styling notes

The card is static content (not focusable, it never swallows clicks): wrap it in an `<a>` when the whole card should navigate, and use the `actions` slot for buttons. `::part(media)` carries an inline `aspect-ratio`; when overriding its size remember `object-fit: cover`. `actions` uses `margin-block-start: auto` so buttons line up across cards with different title heights.

## API

### oas-product-card

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `currency` | ISO 4217 currency, default `CNY` | `string` | `CNY` |
| `image` | Image URL (a failed load falls back to the dashed placeholder; changing `image` retries) | — | — |
| `image-ratio` | Media aspect ratio: `16:9` / `4:3` / a plain number (`1.5`); defaults to `1:1`, invalid values fall back to `1:1` and warn once | — | — |
| `layout` | Card form: `vertical` (default, image on top) / `horizontal` (image at the inline start, fixed 104px wide); invalid values fall back to `vertical` and warn once | — | — |
| `locale` | Amount formatting locale; defaults to the document `<html lang>`, then `en` | — | — |
| `original-price` | Struck-through original price (uses the nested `oas-price` original channel) | — | — |
| `precision` | Amount decimal places, default 2 | — | — |
| `price` | Current price (non-negative number); when both this and `original-price` are absent the price area hides | — | — |
| `title` | Product title (clamped to two lines; the full text stays in the DOM and tooltip, and doubles as the image alt) | — | — |

#### Slots

| Name | Description |
| --- | --- |
| `actions` | Action buttons (add to cart, buy now, …) — collapses when empty |
| `promo` | Promotional copy (discounts, flash-sale countdowns) — collapses when empty |
| `tags` | Tag chips (discount, sold-by-us, free shipping, …) — collapses when empty |
