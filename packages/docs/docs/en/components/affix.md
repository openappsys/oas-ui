# Affix

Pins content to the top or bottom of the viewport; it becomes fixed once the page scrolls past a given offset. Commonly used for fixed table action bars, toolbars, etc.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-affix offset="88">
    <oas-button type="primary">Pinned to the top when scrolling</oas-button>
  </oas-affix>
</DemoBlock>

Scroll this page down and observe the button being pinned as it approaches the top of the viewport (`position: fixed`).

## Custom offset

<DemoBlock title="Custom offset">
  <oas-affix offset="80">
    <oas-button>Fixed 80px from the viewport top</oas-button>
  </oas-affix>
</DemoBlock>

## Combined content

<DemoBlock title="Combined content">
  <oas-affix offset="88">
    <oas-space>
      <oas-tag type="primary">Filters</oas-tag>
      <oas-button size="small">Reset</oas-button>
      <oas-button size="small" type="primary">Query</oas-button>
    </oas-space>
  </oas-affix>
</DemoBlock>

## Bottom pinning

Set `position="bottom"` to pin towards the bottom: the element becomes fixed once its bottom edge enters within `offset` of the viewport bottom.

<DemoBlock title="Bottom pinning">
  <oas-affix position="bottom" offset="88">
    <oas-button type="primary">Pinned to the bottom when scrolling</oas-button>
  </oas-affix>
</DemoBlock>

Scroll this page down and observe the button being pinned as it approaches the bottom of the viewport (`position: fixed; bottom: 16px`).

## Custom scroll container

`target` specifies the scroll container by CSS selector (default `window`): when scrolling inside the container, pinning is determined relative to the container's visible area; a selector without matches logs a console warning and falls back to `window` scroll. The fixed positioning stays relative to the viewport.

<DemoBlock title="Custom scroll container">
  <div id="affix-sc" style="height: 220px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); background: var(--oas-color-bg-hover)">
    <oas-affix target="#affix-sc" offset="88">
      <oas-button>Pinned while scrolling the container</oas-button>
    </oas-affix>
    <p style="margin-top: 520px; color: var(--oas-color-text-secondary)">This is a local scroll container: scroll down and the button pins to the top of the container's visible area (`fixed` positioning is viewport-relative). Container bottom — scroll back up.</p>
  </div>
</DemoBlock>

## Pin state event

`oas-change` fires whenever the pin state actually flips (`detail: { fixed, top }`) — `fixed` indicates whether it is pinned; `top` is the reference pin position (`offset` for top pinning; the element's current `top` for bottom pinning).

<DemoBlock title="Pin state event">
  <oas-affix id="affix-event" offset="88">
    <oas-button>Scroll to observe the state</oas-button>
  </oas-affix>
  <p id="affix-event-out" style="color: var(--oas-color-text-secondary)">Not pinned</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.getElementById('affix-event')?.addEventListener('oas-change', (e) => {
    const out = document.getElementById('affix-event-out')
    if (!out) return
    const { fixed, top } = e.detail
    out.textContent = fixed ? `Pinned (top: ${top}px)` : `Not pinned (top: ${top}px)`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `offset` | Pin trigger distance (px) | `string` | `0` |
| `position` | Pin direction: top (default, pinned when the top edge reaches) / bottom (pinned when the bottom edge reaches); invalid values fall back to top | `AffixPosition` | `top` |
| `target` | Scroll container selector (CSS selector); falls back to window scroll with a console warning when no element matches | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Dispatched when the pin state flips; detail { fixed, top }: fixed indicates whether pinned; top is the reference pin position (offset for top pinning, the element's current rect.top for bottom pinning) |

### Slots

| Name | Description |
| --- | --- |
| default | — |

Listens to `window` (or the `target` container) scroll; the content is pinned once it leaves the pin area and is passed through the default slot.
