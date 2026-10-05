# NoticeBar

A notice bar for the top of a page or inside a section: icon + text + closable + an action link. Extra-long text can scroll seamlessly horizontally (embedding `oas-marquee` and reusing its scroll engine); multiple notices rotate vertically via `items` (crossfade; no auto-rotation under `prefers-reduced-motion`). Colors derive from semantic tokens and adapt to dark mode automatically.

## Basic Usage

<DemoBlock title="Default notice (info)">
  <oas-notice-bar>Scheduled maintenance tonight from 23:00 to 24:00; services may fluctuate briefly.</oas-notice-bar>
</DemoBlock>

## Notice Types

`type` accepts `info` (default, primary palette) / `success` / `warning` / `error`; the background and icon colors derive from semantic tokens. The icon defaults per type (`icon="none"` hides it; the `icon` attribute accepts any icon name).

<DemoBlock title="Four types">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar type="info">info: Scheduled maintenance this Friday 18:00 for 30 minutes—save your work in advance.</oas-notice-bar>
    <oas-notice-bar type="success">success: data sync finished — 128 records in total.</oas-notice-bar>
    <oas-notice-bar type="warning">warning: less than 10% storage left, please clean up.</oas-notice-bar>
    <oas-notice-bar type="error">error: network disconnected, retrying automatically…</oas-notice-bar>
  </div>
</DemoBlock>

## Closable

`closable` shows a close button: clicking dispatches `oas-close` and hides the bar (fade-out exit). Setting the `open` attribute again restores it (the component removes `open` itself when closed).

<DemoBlock title="Closable + restore">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar id="nb-close-demo" closable>Click the ✕ on the right to dismiss, then restore with the button below.</oas-notice-bar>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="nb-close-restore" size="small" disabled>Restore</oas-button>
      <span id="nb-close-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

## Vertical Rotation (items)

Pass a JSON string array to `items` to rotate multiple notices vertically (fade out → swap text → fade in) every `interval` ms (default 4000). Under `prefers-reduced-motion` rotation is disabled and the first item shows statically; while auto-rotating the content area is `aria-live="off"` so screen readers are not interrupted. Invalid JSON / empty arrays fall back to the default slot.

<DemoBlock title="items rotation (interval=2500)">
  <oas-notice-bar id="nb-items-demo" items='["Scheduled maintenance notice","Second: the new theme editor is live","Third: the mobile-native component batch kicked off"]' interval="2500"></oas-notice-bar>
</DemoBlock>

## Action

`action-text` renders an action label on the right; with `href` present it renders as an `<a>` (native navigation), otherwise as a `<button>` (clicking dispatches `oas-action-click`).

<DemoBlock title="Action: link and button variants">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar action-text="Details" href="https://developer.mozilla.org/en-US/">Link variant: clicking navigates natively (href present).</oas-notice-bar>
    <oas-notice-bar id="nb-action-demo" action-text="Upgrade now">Button variant: clicking dispatches oas-action-click (no href).</oas-notice-bar>
    <span id="nb-action-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

## Extra-long Scrolling (scrollable)

With `scrollable`, extra-long single content scrolls seamlessly horizontally — the `oas-marquee` engine is reused via embedding (seamless loop, auto-fill when content is shorter than the container, and `prefers-reduced-motion` static fallback are all handled by marquee). Note: the scrolling duplicates live inside the component's shadow, so page stylesheet class selectors do not reach them (inline styles survive); prefer plain text or inline styles for scrolling content.

<DemoBlock title="scrollable: extra-long notice scrolling horizontally">
  <oas-notice-bar scrollable>Long notice: this deliberately long text demonstrates the seamless horizontal scrolling of overflowing content — seamless loop at a constant speed, with hover and reduced-motion behavior handled uniformly by the embedded marquee engine.</oas-notice-bar>
</DemoBlock>

## Icon Customization

The `icon` attribute takes an icon name from the `oas-icon` system; `icon="none"` hides the icon; `slot="icon"` rich content takes priority.

<DemoBlock title="icon customization and hiding">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar icon="star">icon=&quot;star&quot;: pick any icon name.</oas-notice-bar>
    <oas-notice-bar icon="none">icon=&quot;none&quot;: no icon.</oas-notice-bar>
    <oas-notice-bar><oas-tag slot="icon" size="small">Pinned</oas-tag> slot=&quot;icon&quot;: rich content overrides the icon.</oas-notice-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined guard: property assignment / method calls must happen after the custom element is defined
  Promise.all([customElements.whenDefined('oas-notice-bar'), customElements.whenDefined('oas-button')]).then(() => {
    // closable demo: oas-close → visible feedback + enable restore; restore = set the open attribute
    const closeDemo = document.getElementById('nb-close-demo')
    const restoreBtn = document.getElementById('nb-close-restore')
    const closeOut = document.getElementById('nb-close-output')
    closeDemo?.addEventListener('oas-close', () => {
      if (closeOut) closeOut.textContent = 'oas-close dispatched, notice hidden'
      // oas-button's disabled is attribute-only (no same-name property); use attribute APIs
      restoreBtn?.removeAttribute('disabled')
    })
    restoreBtn?.addEventListener('click', () => {
      closeDemo?.setAttribute('open', '')
      if (closeOut) closeOut.textContent = ''
      restoreBtn?.setAttribute('disabled', '')
    })
    // action button demo: oas-action-click → feedback text updates
    const actionDemo = document.getElementById('nb-action-demo')
    const actionOut = document.getElementById('nb-action-output')
    actionDemo?.addEventListener('oas-action-click', () => {
      if (actionOut) actionOut.textContent = 'oas-action-click dispatched (button variant)'
    })
  })
})
</script>

## API

### oas-notice-bar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `action-text` | Action label text; the action area is not rendered when absent | — | — |
| `closable` | Show the close button; clicking dispatches oas-close and hides the bar (set open to restore) | `boolean` | — |
| `href` | Action link URL: when present the action renders as an `<a>` (native navigation), otherwise as a `<button>` (dispatching oas-action-click); adding/removing it at runtime switches the variant | — | — |
| `icon` | Icon name (oas-icon system); defaults per type, icon="none" hides it, invalid names fall back to the type default; slot="icon" rich content takes priority | — | — |
| `interval` | items rotation interval (ms, default 4000); invalid/non-positive values fall back to the default | `string` | — |
| `items` | JSON string array of multiple notices: vertical rotation (crossfade); invalid JSON/empty arrays fall back to the default slot; items take priority over the slot; no auto-rotation under prefers-reduced-motion | — | — |
| `open` | Restore switch: setting it after close shows the bar again (the component removes this attribute when closed; presence forces visibility) | `boolean` | — |
| `scrollable` | Scroll extra-long single content seamlessly horizontally (embedded marquee engine); only effective in the single-notice slot mode (items take priority) | `boolean` | — |
| `type` | Notice type: info (default, primary palette) / success / warning / error; background and icon colors derive from semantic tokens and adapt to dark mode; invalid values fall back to info | `string` | `info` |

#### Events

| Event | Description |
| --- | --- |
| `oas-action-click` | Dispatched when the action is clicked in its button variant (no href) |
| `oas-close` | Dispatched after the close button is clicked; the bar then hides itself (fade-out exit). Set open to restore |

#### Slots

| Name | Description |
| --- | --- |
| default | Single notice content (shown when items is absent; materialized as scrolling content in scrollable mode) |
| `icon` | Icon slot, overrides the default/type icon |

#### Parts

| Part | Description |
| --- | --- |
| `bar` | Notice bar container |
| `icon` | Icon area |
| `content` | Content area (slot projection / rotation / marquee shared container) |
| `carousel` | items vertical rotation area |
| `marquee` | Embedded marquee (scrollable mode) |
| `action` | Right-side action area (shared by a / button variants) |
| `close` | Close button |
