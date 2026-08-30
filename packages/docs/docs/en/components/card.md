# Card

An information container that groups a set of related content.

## Basic Usage

<DemoBlock title="Basic card">
  <div style="width: 100%">
    <oas-card title="Project Overview">
      <p>This is a basic card showing a summary of information.</p>
      <p>The content area supports any custom structure.</p>
    </oas-card>
  </div>
</DemoBlock>

## No Title

<DemoBlock title="Card without title">
  <div style="width: 100%">
    <oas-card>
      <p>When the <code>title</code> attribute is omitted, only the content area remains.</p>
    </oas-card>
  </div>
</DemoBlock>

## Hoverable

<DemoBlock title="Hover shadow">
  <div style="width: 100%">
    <oas-card title="Hoverable card" hoverable>
      <p>Hover over the card to see the shadow transition.</p>
    </oas-card>
  </div>
</DemoBlock>

## Extra Area

<DemoBlock title="Card with extra actions">
  <div style="width: 100%">
    <oas-card title="Permission Management">
      <p>Place actions to the right of the title via the <code>extra</code> slot.</p>
      <oas-button slot="extra" size="small">New</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## Cover Image

The `cover-src` attribute or the `cover` slot places a full-width cover image at the top of the card (object-fit: cover).

<DemoBlock title="cover-src cover image">
  <div style="width: 320px">
    <oas-card title="City Cycling" cover-src="https://picsum.photos/seed/isui-card-cover/640/360" cover-alt="Cycling photo along the river">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">A 15 km leisure cycling route along the river, perfect for a weekend.</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="Custom cover via cover slot">
  <div style="width: 320px">
    <oas-card title="Mountain Trail">
      <svg slot="cover" viewBox="0 0 400 180" preserveAspectRatio="none" style="width:100%; height:150px; display:block;"><defs><linearGradient id="ccg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="400" height="180" fill="url(#ccg1)"/><text x="200" y="100" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif">Cover</text></svg>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">A two-day light hiking route recommended for the weekend.</p>
    </oas-card>
  </div>
</DemoBlock>

## Cover + Actions (Product Card)

The bottom `actions` slot holds a button group, with a divider automatically added above.

<DemoBlock title="Product card">
  <div style="width: 320px">
    <oas-card title="Wireless Noise-Canceling Headphones" hoverable cover-src="https://picsum.photos/seed/isui-card-product/640/360" cover-alt="Headphones product photo">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Active noise canceling · 30h battery · Bluetooth 5.3</p>
      <p style="color: var(--oas-color-primary); font-weight: 600; margin: var(--oas-space-2) 0 0;">¥ 899</p>
      <div slot="actions">
        <oas-button size="small">View details</oas-button>
        <oas-button size="small" type="primary">Add to cart</oas-button>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## Clickable

`clickable` makes the whole card clickable: focusable, Enter/Space trigger `oas-click`, with a focus ring on keyboard focus. Clicking a button inside the actions area does not trigger the whole-card click.

<DemoBlock title="Clickable card">
  <div style="width: 320px">
    <oas-card clickable title="Project Overview" hoverable>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Click the card or press Enter/Space to fire oas-click.</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="Clickable + actions without interference">
  <div style="width: 320px">
    <oas-card clickable title="Collab Project" cover-src="https://picsum.photos/seed/isui-card-team/640/360" cover-alt="Team collaboration illustration">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Click the card body to fire the whole-card click; click the buttons for their own actions.</p>
      <div slot="actions">
        <oas-button size="small">Invite members</oas-button>
        <oas-button size="small" type="danger">Archive</oas-button>
      </div>
    </oas-card>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-click', (e) => {
    if (!(e.target instanceof HTMLElement)) return
    if (e.target.tagName !== 'OAS-CARD') return
    const title = e.target.getAttribute('title') || 'Card'
    window.message?.info(`Card clicked: ${title}`)
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clickable` | Whole card clickable (focusable; click / Enter / Space dispatch `oas-click`) | `boolean` | — |
| `cover-alt` | Cover image alt text (accessibility) | `string` | — |
| `cover-src` | Cover image URL placed at the top of the card (object-fit: cover) | `string` | — |
| `hoverable` | Whether to enable the hover shadow (shadow + lift + pointer) | `boolean` | — |
| `title` | Card title (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Whole-card click (when `clickable`), detail contains originalEvent |

### Slots

| Name | Description |
| --- | --- |
| default | Card content |
| `actions` | Bottom action area (view / edit / delete button groups), with a divider above |
| `cover` | Custom cover content (mutually exclusive with `cover-src`, which takes precedence) |
| `extra` | Extra area on the right of the title |
| `title` | Rich title content slot; overrides the title attribute text when present |
