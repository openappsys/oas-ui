# Backdrop

A full-screen semi-transparent overlay with `transparent`/`blur` variants and body scroll locking; the node is automatically unmounted when `open=false`, leaving no orphan DOM.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-button type="primary" onclick="openBackdrop('backdrop-basic')">打开遮罩</oas-button>
  </oas-space>
  <p>Click anywhere on the backdrop to close it (listen for <code>oas-click</code>).</p>
</DemoBlock>

## Transparent & blur

<DemoBlock title="Transparent & blur">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-transparent', { transparent: true, blur: true })">透明 + 模糊</oas-button>
    <oas-button onclick="openBackdrop('backdrop-plain', { transparent: true })">纯透明</oas-button>
  </oas-space>
</DemoBlock>

## No scroll lock

<DemoBlock title="No scroll lock">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-scroll', { lockScroll: false })">打开（可滚动）</oas-button>
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
      toast.info({ title: '遮罩被点击，已关闭', duration: 2000 })
    })
    // 先设 open 再挂载：组件在 !open 时连接会自动卸载，顺序颠倒会导致被立即移除
    el.setAttribute('open', '')
    document.body.appendChild(el)
  }
})
</script>

## API

### Props

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `open` | Whether shown | `boolean` | `false` |
| `transparent` | Transparent overlay (no background) | `boolean` | `false` |
| `blur` | Blur the background | `boolean` | `false` |
| `lock-scroll` | Lock body scroll while open | `boolean` | `true` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Backdrop clicked, `detail.originalEvent` is the original click event |

- No focus trap of its own (handled by the overlying dialog); Esc does not auto-close (decided by the outer dialog).
- The node is removed from the DOM when `open=false`, leaving no orphan DOM; when multiple backdrops coexist, scroll is restored only when the last one closes.
