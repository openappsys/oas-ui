# Backdrop

A full-screen semi-transparent overlay with `transparent`/`blur` variants and body scroll locking; the node is automatically unmounted when `open=false`, leaving no orphan DOM.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-button type="primary" onclick="openBackdrop('backdrop-basic')">Open backdrop</oas-button>
  </oas-space>
  <p>Click anywhere on the backdrop to close it (listen for <code>oas-click</code>).</p>
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
    if (opts.blur) el.setAttribute('blur', '')
    if (opts.lockScroll === false) el.setAttribute('lock-scroll', 'false')
    el.addEventListener('oas-click', () => {
      el.removeAttribute('open')
      toast.info({ title: 'Backdrop clicked, closed', duration: 2000 })
    })
    // Set open before mounting: the component auto-unmounts when connected with !open; reversing the order would remove it immediately
    el.setAttribute('open', '')
    document.body.appendChild(el)
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `blur` | Blur the background | — | — |
| `lock-scroll` | Lock body scroll while open | `string` | `true` |
| `open` | Whether shown | `boolean` | — |
| `transparent` | Transparent overlay (no background) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Backdrop clicked, `detail.originalEvent` is the original click event |

- No focus trap of its own (handled by the overlying dialog); Esc does not auto-close (decided by the outer dialog).
- The node is removed from the DOM when `open=false`, leaving no orphan DOM; when multiple backdrops coexist, scroll is restored only when the last one closes.
