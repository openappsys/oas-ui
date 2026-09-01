# Backdrop

A full-screen semi-transparent overlay with content slot, color/opacity/blur customization, fade in/out animation and lifecycle events; the node is automatically unmounted after the exit animation finishes when `open=false`, leaving no orphan DOM.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-button type="primary" onclick="openBackdrop('backdrop-basic')">Open backdrop</oas-button>
  </oas-space>
  <p>Click anywhere on the backdrop to close it (listen for <code>oas-click</code>).</p>
</DemoBlock>

## Content slot (full-screen loading)

<DemoBlock title="Content slot (full-screen loading)">
  <oas-space>
    <oas-button type="primary" onclick="openLoadingBackdrop()">Full-screen loading</oas-button>
  </oas-space>
  <p>The default slot hosts content above the mask (spinner / text / onboarding, centered); clicking the content area does NOT fire <code>oas-click</code> — only clicking the mask itself closes.</p>
</DemoBlock>

## Color & opacity

<DemoBlock title="Color & opacity">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-thick', { color: '#18181b', opacity: 'thick' })">Dark mask</oas-button>
    <oas-button onclick="openBackdrop('backdrop-thin', { color: '#18181b', opacity: 'thin' })">Light mask</oas-button>
    <oas-button onclick="openBackdrop('backdrop-tint', { color: 'blue', opacity: 'default' })">Themed mask</oas-button>
  </oas-space>
  <p><code>color</code> accepts any CSS color or one of the 11 preset names; <code>opacity</code> supports <code>thin</code> (0.35) / <code>default</code> (0.55) / <code>thick</code> (0.75) levels or a 0-1 number. Theme-level overrides via <code>--oas-backdrop-bg</code> / <code>--oas-backdrop-opacity</code> variables.</p>
</DemoBlock>

## Full-value blur

<DemoBlock title="Full-value blur">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-blur-strong', { blur: 'blur(8px) saturate(180%)' })">Strong blur + saturation</oas-button>
    <oas-button onclick="openBackdrop('backdrop-blur-basic', { blur: true })">Default blur</oas-button>
  </oas-space>
  <p><code>blur</code> with an empty value falls back to <code>blur(4px)</code> (backward compatible); a string accepts any CSS <code>backdrop-filter</code> value.</p>
</DemoBlock>

## Fade animation & lifecycle events

<DemoBlock title="Fade animation & lifecycle events">
  <oas-space>
    <oas-button type="primary" onclick="openAnimBackdrop()">Open (watch the fade)</oas-button>
  </oas-space>
  <p>Open/close plays an opacity fade (transform/opacity only); <code>oas-after-show</code> / <code>oas-after-close</code> fire when the transition finishes; skipped under <code>prefers-reduced-motion</code>.</p>
</DemoBlock>

## Persistent (non-dismissible) backdrop

<DemoBlock title="Persistent (non-dismissible) backdrop">
  <oas-space>
    <oas-button onclick="openPersistentBackdrop()">Open persistent backdrop</oas-button>
  </oas-space>
  <p><code>persistent</code> blocks mask-click dismissal (no <code>oas-click</code> is fired); clicking the mask shakes the content to hint it cannot be dismissed — close via the content button or the host. The keyboard/SR close channel (focus the "Close backdrop" button at the top with Tab, label via <code>close-label</code>) works as well.</p>
</DemoBlock>

## Click propagation control

<DemoBlock title="Click propagation control">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-passthrough', { stopPropagation: false })">Open (click passes through)</oas-button>
  </oas-space>
  <p><code>stop-propagation</code> blocks mask clicks from reaching the host document by default (the mask's job is to block background interactions); set it to <code>false</code> to let mask clicks continue to page-level click listeners.</p>
</DemoBlock>

## Transparent & blur

<DemoBlock title="Transparent & blur">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-transparent', { transparent: true, blur: true })">Transparent + blur</oas-button>
    <oas-button onclick="openBackdrop('backdrop-plain', { transparent: true })">Fully transparent</oas-button>
  </oas-space>
</DemoBlock>

## No scroll lock

<DemoBlock title="No scroll lock">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-scroll', { lockScroll: false })">Open (scrollable)</oas-button>
  </oas-space>
  <p><code>lock-scroll</code> defaults to <code>true</code>; set it to <code>false</code> to keep the body scrollable.</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  window.openBackdrop = (id, opts = {}) => {
    let el = document.getElementById(id)
    if (el) el.remove()
    el = document.createElement('oas-backdrop')
    el.id = id
    if (opts.transparent) el.setAttribute('transparent', '')
    if (opts.blur) el.setAttribute('blur', typeof opts.blur === 'string' ? opts.blur : '')
    if (opts.lockScroll === false) el.setAttribute('lock-scroll', 'false')
    if (opts.color) el.setAttribute('color', opts.color)
    if (opts.opacity) el.setAttribute('opacity', opts.opacity)
    if (opts.persistent) el.setAttribute('persistent', '')
    if (opts.closeLabel) el.setAttribute('close-label', opts.closeLabel)
    if (opts.stopPropagation === false) el.setAttribute('stop-propagation', 'false')
    if (opts.content) el.innerHTML = opts.content
    el.addEventListener('oas-click', () => {
      if (opts.persistent) return
      el.removeAttribute('open')
      toast.info({ title: 'Backdrop clicked, closed', duration: 2000 })
    })
    if (opts.onAfterShow) el.addEventListener('oas-after-show', opts.onAfterShow)
    if (opts.onAfterClose) el.addEventListener('oas-after-close', opts.onAfterClose)
    // Set open before mounting: the component auto-unmounts when connected with !open; reversing the order would remove it immediately
    el.setAttribute('open', '')
    document.body.appendChild(el)
  }
  window.openLoadingBackdrop = () =>
    openBackdrop('backdrop-loading', {
      content:
        '<oas-spin size="large"></oas-spin><p style="margin-top:8px;color:var(--oas-color-text-primary)">Loading, please wait…</p>',
    })
  window.openPersistentBackdrop = () =>
    openBackdrop('backdrop-persistent', {
      persistent: true,
      closeLabel: 'Close backdrop',
      content:
        '<p style="margin-bottom:12px">Please complete the action below to continue</p>' +
        '<oas-button type="primary" onclick="document.getElementById(\'backdrop-persistent\')?.removeAttribute(\'open\')">Got it</oas-button>',
    })
  window.openAnimBackdrop = () =>
    openBackdrop('backdrop-anim', {
      onAfterShow: () => toast.info({ title: 'Backdrop fully shown (oas-after-show)', duration: 2000 }),
      onAfterClose: () => toast.success({ title: 'Backdrop fully closed (oas-after-close)', duration: 2000 }),
    })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `blur` | Blur the background | — | — |
| `close-label` | — | — | — |
| `color` | — | — | — |
| `lock-scroll` | Lock body scroll while open | `string` | `true` |
| `opacity` | — | — | — |
| `open` | Whether shown | `boolean` | — |
| `persistent` | — | `boolean` | — |
| `stop-propagation` | — | `string` | `true` |
| `transparent` | Transparent overlay (no background) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-after-close` | — |
| `oas-after-show` | — |
| `oas-click` | Backdrop clicked, `detail.originalEvent` is the original click event |

### Slots

| Name | Description |
| --- | --- |
| default | — |

- No focus trap of its own (handled by the overlying dialog); Esc does not auto-close (decided by the outer dialog).
- The node is removed from the DOM after the exit animation when `open=false`, leaving no orphan DOM; when multiple backdrops coexist, scroll is restored only when the last one closes.
- Click targeting: only clicks on the mask itself fire `oas-click` (content-area clicks do not); `stop-propagation` blocks mask clicks from reaching the host document by default.
