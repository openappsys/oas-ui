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
      <oas-button slot="actions" size="small">View details</oas-button>
      <oas-button slot="actions" size="small" type="primary">Add to cart</oas-button>
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
      <oas-button slot="actions" size="small">Invite members</oas-button>
      <oas-button slot="actions" size="small" type="danger">Archive</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## Selectable Card

`selectable` makes the whole card toggle its selected state on click — the multi-select form for large rich cards with cover, title, description and actions. The selected state shows a primary border + light primary background + a check badge in the top corner; clicking interactive elements inside the card (buttons/links) does not trigger selection; Space/Enter work the same way.

A standalone card has `role="checkbox"` semantics with `aria-checked` synced. **For card groups**, the host can put `role="radio"` on the cards (the component never overrides an explicit host role) and manage exclusive selection itself.

If the host does not set `selected`, the card toggles internally and reflects the attribute (uncontrolled); once `selected` is set, the card becomes controlled — it only dispatches `oas-change` (detail `{ selected }`, the new state) and the host writes the state back. Not selectable while `loading`; with `href`, selecting takes precedence over navigation (explicit links/buttons inside still act on their own).

<DemoBlock title="Multi-select cards (uncontrolled)">
  <div style="width: 100%;">
    <p id="card-select-count" style="margin: 0 0 var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">0 selected</p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4);">
      <oas-card selectable hoverable title="Plan A">
        <p style="color: var(--oas-color-text-secondary); margin: 0;">Lightweight start for small teams.</p>
        <oas-button slot="actions" size="small">Details</oas-button>
      </oas-card>
      <oas-card selectable hoverable title="Plan B">
        <p style="color: var(--oas-color-text-secondary); margin: 0;">Standard collaboration suite with automation.</p>
        <oas-button slot="actions" size="small">Details</oas-button>
      </oas-card>
      <oas-card selectable hoverable title="Plan C">
        <p style="color: var(--oas-color-text-secondary); margin: 0;">Enterprise controls, on-prem and audit logs.</p>
        <oas-button slot="actions" size="small">Details</oas-button>
      </oas-card>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="Controlled radio card group (host writes back oas-change)">
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4); width: 100%;">
    <oas-card data-select-radio selectable role="radio" title="Basic" selected>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Up to 5 members · basic boards</p>
    </oas-card>
    <oas-card data-select-radio selectable role="radio" title="Pro">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Unlimited members · automation</p>
    </oas-card>
    <oas-card data-select-radio selectable role="radio" title="Enterprise">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">On-prem · audit logs</p>
    </oas-card>
  </div>
</DemoBlock>

## Loading State

With `loading`, the content area switches to a skeleton placeholder (sheen animation) and the body is hidden; the host syncs `aria-busy`.

<DemoBlock title="Loading skeleton">
  <div style="width: 320px">
    <oas-card id="card-loading" title="Loading data" loading>
      <p style="margin: 0;">The body appears once data is loaded.</p>
    </oas-card>
    <oas-button id="card-loading-toggle" size="small" style="margin-top: var(--oas-space-3)">Toggle loading</oas-button>
  </div>
</DemoBlock>

## Compact Size

`size="small"` tightens paddings and the title font size — useful for dense lists. The default is `medium`.

<DemoBlock title="size=small compact card">
  <div style="width: 320px">
    <oas-card size="small" title="Compact card">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Smaller paddings and title font size.</p>
      <oas-button slot="actions" size="small">View</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## Borderless Variant

`variant="borderless"` removes the container border, which suits nested setting groups inside another card. The default is `outlined`.

<DemoBlock title="Borderless nesting (settings panel)">
  <div style="width: 100%">
    <oas-card title="Notification Settings">
      <div style="display: grid; gap: var(--oas-space-2);">
        <oas-card variant="borderless" size="small" title="In-app notifications">
          <p style="color: var(--oas-color-text-secondary); margin: 0;">Receive mentions, assignments and comment replies.</p>
        </oas-card>
        <oas-divider></oas-divider>
        <oas-card variant="borderless" size="small" title="Email digest">
          <p style="color: var(--oas-color-text-secondary); margin: 0;">A weekly summary of project activity every Monday.</p>
        </oas-card>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## Footer Bar

The `footer` slot is an arbitrary bottom bar independent from the actions area: use it for supplementary notes or metadata, while `actions` remains the button area.

<DemoBlock title="Footer bar + actions area">
  <div style="width: 320px">
    <oas-card title="Terms Update">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">We updated our data processing terms. Please review to continue.</p>
      <oas-button slot="actions" size="small" type="primary">Accept &amp; Continue</oas-button>
      <p slot="footer" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0;">Updated 2026-09-01 · Applies to all workspaces</p>
    </oas-card>
  </div>
</DemoBlock>

## Header Divider (header-bordered)

The divider below the header shows by default; set `header-bordered="false"` to remove it.

<DemoBlock title="header-bordered=false">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%;">
    <oas-card title="Default: with divider">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">A divider separates the title from the content.</p>
    </oas-card>
    <oas-card title="Divider off" header-bordered="false">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">The title sits right above the content for lighter grouping.</p>
    </oas-card>
  </div>
</DemoBlock>

## Shadow States

`shadow="none | hover | always"`: hover shadow, always-on shadow, or no shadow. The `hoverable` boolean is equivalent to `shadow="hover"` (kept for compatibility); an explicit `shadow` value takes precedence over `hoverable`.

<DemoBlock title="shadow=always">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--oas-space-4); width: 100%;">
    <oas-card shadow="always" title="Always shadow">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Shadow always on to emphasize elevation.</p>
    </oas-card>
    <oas-card shadow="hover" title="Hover shadow">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Shadow + lift on hover (same as hoverable).</p>
    </oas-card>
  </div>
</DemoBlock>

## User Card (Meta)

Use `slot="avatar"` for an avatar on the left of the title, and the `description` attribute (or `slot="description"`) for a line of secondary text below the title. When either is present, the header automatically becomes an "avatar + title + description" layout.

<DemoBlock title="Meta user card">
  <div style="width: 360px">
    <oas-card description="Frontend Engineer · Shanghai">
      <oas-avatar slot="avatar" src="https://picsum.photos/seed/isui-card-meta/160" size="48" alt="Member avatar"></oas-avatar>
      <span slot="title">Lin Xiao</span>
      <oas-button slot="extra" size="small">Follow</oas-button>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Owns component architecture and rendering performance; recently exploring SSR hydration.</p>
      <div slot="footer">
        <oas-tag size="small">Components</oas-tag>
        <oas-tag size="small">Performance</oas-tag>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## Link Card (href)

With `clickable` + `href`, the whole card is semantically a link: an inner anchor carries the address, and focus plus keyboard Enter are natively handled by the anchor; `target` is passed through. Clicking an embedded button/link still triggers only its own action, not the whole-card navigation.

<DemoBlock title="href link card">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--oas-space-4); width: 100%;">
    <oas-card href="#card-link-anchor" title="Design Guidelines" shadow="hover">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Click anywhere on the card to jump (Enter works too).</p>
    </oas-card>
    <oas-card href="https://example.com" target="_blank" title="External link" shadow="hover">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">Opens in a new tab with target passed through.</p>
    </oas-card>
  </div>
  <span id="card-link-anchor"></span>
</DemoBlock>

## Composition: Tabs

A card can compose other components — e.g. `oas-tabs` for a settings-center layout.

<DemoBlock title="Card with nested tabs">
  <div style="width: 100%">
    <oas-card title="Project Settings">
      <oas-tabs active="general">
        <oas-tab-panel label="General" value="general">
          <p style="margin: 0;">Project name, visibility and default language.</p>
        </oas-tab-panel>
        <oas-tab-panel label="Members" value="members">
          <p style="margin: 0;">Invite members and assign roles.</p>
        </oas-tab-panel>
        <oas-tab-panel label="Advanced" value="advanced">
          <p style="margin: 0;">Archiving policy, webhooks and API tokens.</p>
        </oas-tab-panel>
      </oas-tabs>
    </oas-card>
  </div>
</DemoBlock>

## Grid Card

Let the host grid distribute the blocks inside a card: the card is only a container; layout is plain CSS grid in the light DOM.

<DemoBlock title="Evenly divided grid">
  <div style="width: 100%">
    <oas-card title="Quarterly Overview">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4); text-align: center;">
        <div>
          <p style="font-size: var(--oas-font-size-xl); font-weight: 600; margin: 0;">32</p>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0;">Ongoing projects</p>
        </div>
        <div>
          <p style="font-size: var(--oas-font-size-xl); font-weight: 600; margin: 0;">18</p>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0;">Delivered</p>
        </div>
        <div>
          <p style="font-size: var(--oas-font-size-xl); font-weight: 600; margin: 0;">96%</p>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0;">On-time rate</p>
        </div>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## Dashboard Card

Compose with `oas-statistic` to build a data dashboard.

<DemoBlock title="Statistics dashboard">
  <div style="width: 100%">
    <oas-card title="Live Dashboard">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4);">
        <div>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0 0 var(--oas-space-1);">Visits today</p>
          <oas-statistic value="12893"></oas-statistic>
        </div>
        <div>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0 0 var(--oas-space-1);">Error rate</p>
          <oas-statistic value="0.42" precision="2" suffix="%"></oas-statistic>
        </div>
        <div>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0 0 var(--oas-space-1);">Live sessions</p>
          <oas-statistic value="864"></oas-statistic>
        </div>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## E-commerce Card

A typical product card: cover image + price area + actions + footer.

<DemoBlock title="Product card">
  <div style="width: 320px">
    <oas-card hoverable cover-src="https://picsum.photos/seed/isui-card-keyboard/640/360" cover-alt="Portable mechanical keyboard product photo">
      <span slot="title">Portable Mechanical Keyboard</span>
      <p style="margin: 0;">
        <span style="color: var(--oas-color-primary); font-weight: 600; font-size: var(--oas-font-size-lg);">¥ 429</span>
        <s style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-left: var(--oas-space-2);">¥ 599</s>
      </p>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">Tri-mode · Hot-swap · Gasket mount</p>
      <oas-button slot="actions" size="small" type="primary">Add to Cart</oas-button>
      <oas-button slot="actions" size="small">Save</oas-button>
      <p slot="footer" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0;">Free shipping over ¥299 · 7-day returns</p>
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
  // whenDefined guard: before upgrade, an expando shadows the setter (a real bug caught
  // under the preview build) — wait for oas-card/oas-button to upgrade before touching props
  await Promise.all([
    customElements.whenDefined('oas-card'),
    customElements.whenDefined('oas-button'),
  ])
  const loadingCard = document.querySelector('#card-loading')
  const loadingToggle = document.querySelector('#card-loading-toggle')
  loadingToggle?.addEventListener('oas-click', () => {
    loadingCard?.toggleAttribute('loading')
  })

  // selectable multi-select: visible feedback on oas-change + selected count
  // (the attribute is reflected right after dispatch, so count one tick later)
  const selectCount = document.querySelector('#card-select-count')
  const refreshSelectCount = () => {
    if (!selectCount) return
    const n = document.querySelectorAll('oas-card[selectable][selected]').length
    selectCount.textContent = `${n} selected`
  }
  document.addEventListener('oas-change', (e) => {
    if (!(e.target instanceof HTMLElement)) return
    if (e.target.tagName !== 'OAS-CARD' || !e.target.hasAttribute('selectable')) return
    if (e.target.hasAttribute('data-select-radio')) return
    const selected = (e as CustomEvent).detail.selected as boolean
    const title = e.target.shadowRoot?.querySelector('[part="title"]')?.textContent || 'Card'
    window.message?.[selected ? 'success' : 'info'](`${selected ? 'Selected' : 'Deselected'}: ${title}`)
    setTimeout(refreshSelectCount, 0)
  })

  // selectable controlled radio group: cards only dispatch events; the host
  // writes back exclusive selection (role=radio semantics)
  const radioCards = document.querySelectorAll('[data-select-radio]')
  radioCards.forEach((card) => {
    card.addEventListener('oas-change', (e) => {
      if (!(e as CustomEvent).detail.selected) return
      radioCards.forEach((c) => c.removeAttribute('selected'))
      card.setAttribute('selected', '')
    })
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
| `description` | Meta secondary text (muted line under the title; dual channel with the description slot, slot wins) | `string` | — |
| `header-bordered` | Header divider line (default true; `"false"` hides it) | — | — |
| `hoverable` | Whether to enable the hover shadow (shadow + lift + pointer) | `boolean` | — |
| `href` | Link card: whole card acts as a link (wrapped in an internal anchor; keyboard/middle-click native) | `string` | — |
| `loading` | Loading state: content area swaps to skeleton rows (aria-busy synced) | `boolean` | — |
| `selectable` | Selectable card: click the card body (or press Enter/Space) to toggle the selected state and dispatch `oas-change`; interactive elements inside the card (buttons/links) do not trigger selection; with `href`, selecting takes precedence over navigation; not selectable while `loading` | `boolean` | — |
| `selected` | Selected state (with `selectable`): setting it from the host makes the card controlled — the component only dispatches `oas-change` and never mutates the attribute itself (the host writes it back); when unset, the component toggles internally and reflects this attribute (uncontrolled) | `boolean` | — |
| `shadow` | Shadow: `none` / `hover` (lift on hover) / `always`; `hoverable` maps to `hover`, explicit shadow wins | `string` | — |
| `size` | Size: `small` (compact padding, smaller title) / `medium` (default) | — | — |
| `target` | Link target (with href, e.g. `_blank`) | `string` | — |
| `title` | Card title (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |
| `variant` | Variant: `outlined` (default, bordered) / `borderless` (embedded, no border) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selected state toggled (when `selectable`), detail is `{ selected }` (the new state after the toggle) |
| `oas-click` | Whole-card click (when `clickable`), detail contains originalEvent |

### Slots

| Name | Description |
| --- | --- |
| default | Card content |
| `actions` | Bottom action area (view / edit / delete button groups), with a divider above |
| `avatar` | Meta avatar slot (left side of the header; with description forms the avatar+title+subtitle header) |
| `cover` | Custom cover content (mutually exclusive with `cover-src`, which takes precedence) |
| `description` | Rich Meta secondary content (mutually exclusive with the description attribute, slot wins) |
| `extra` | Extra area on the right of the title |
| `footer` | Independent footer strip (separate from the actions area) |
| `title` | Rich title content slot; overrides the title attribute text when present |
