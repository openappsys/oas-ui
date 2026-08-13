# Tooltip

A simple text prompt bubble triggered on hover or keyboard focus.

## Basic usage

<DemoBlock title="Trigger on hover">
  <oas-tooltip content="This is a tooltip text">
    <oas-button type="primary">Hover to view</oas-button>
  </oas-tooltip>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-tooltip content="Hint on top" placement="top">
    <oas-button>Up</oas-button>
  </oas-tooltip>
  <oas-tooltip content="Hint at the bottom" placement="bottom">
    <oas-button>Down</oas-button>
  </oas-tooltip>
  <oas-tooltip content="Hint on the left" placement="left">
    <oas-button>Left</oas-button>
  </oas-tooltip>
  <oas-tooltip content="Hint on the right" placement="right">
    <oas-button>Right</oas-button>
  </oas-tooltip>
</DemoBlock>

When space is insufficient, the tooltip automatically flips along the main axis and avoids the viewport edges.

## Arrow

By default an arrow pointing at the trigger element's edge is shown; `arrow="false"` hides the arrow; `arrow-point-at-center` makes the arrow point at the trigger element's center (when the panel is shifted by viewport-edge avoidance, the arrow still points at the anchor center).

<DemoBlock title="Arrow visibility and pointing">
  <oas-space size="large" wrap>
    <oas-tooltip id="tt-arrow-default" content="Arrow is shown by default">
      <oas-button>Default</oas-button>
    </oas-tooltip>
    <oas-tooltip id="tt-arrow-off" content="arrow=false: arrow hidden" arrow="false">
      <oas-button>No arrow</oas-button>
    </oas-tooltip>
    <oas-tooltip id="tt-arrow-center" content="arrow-point-at-center: arrow points at the trigger center" arrow-point-at-center>
      <oas-button>Point at center</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

## Viewport auto adjust

By default the tooltip automatically flips along the main axis and avoids the viewport edges when space is insufficient; `auto-adjust-overflow="false"` disables the auto adjust so the panel keeps the declared placement (it may overflow the viewport).

<DemoBlock title="Auto adjust disabled">
  <oas-tooltip content="auto-adjust-overflow=false: keeps placement=bottom" placement="bottom" auto-adjust-overflow="false">
    <oas-button>Auto adjust off</oas-button>
  </oas-tooltip>
</DemoBlock>

## Focus trigger

<DemoBlock title="Trigger on keyboard focus">
  <oas-tooltip content="You can also see me by focusing with Tab">
    <oas-button>Focus me with Tab</oas-button>
  </oas-tooltip>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to show/hide the tooltip (hover/focus triggers still apply in addition).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="tipCtrl(true)">Show</oas-button>
    <oas-button size="small" onclick="tipCtrl(false)">Hide</oas-button>
    <oas-tag id="tip-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-tooltip id="tip-ctrl" content="Visibility controlled by the open attribute" placement="bottom">
    <oas-button>Trigger element</oas-button>
  </oas-tooltip>
</DemoBlock>

## Long text

<DemoBlock title="Long text and max width">
  <oas-tooltip content="This is a longer tooltip text demonstrating the max-width limit and automatic wrapping (at most 240px)." placement="bottom">
    <oas-button>Hover to view long hint</oas-button>
  </oas-tooltip>
</DemoBlock>

## Virtual trigger

Virtual mode (`virtual`) does not bind to a host trigger element: `open` is fully controlled externally, and the position is set by `virtual-anchor` (an anchor element selector) or `virtual-x` / `virtual-y` (viewport coordinates). `placement` still applies. It suits scenarios where a normal trigger element is impossible, such as chart points or floating hints during drag.

<DemoBlock title="Virtual anchor follow (chart points)">
  <div class="vp-chart" id="vp-chart">
    <span class="vp-dot" id="vp-dot-0" style="left: 15%; bottom: 45%" data-label="Q1 revenue 12.4w"></span>
    <span class="vp-dot" id="vp-dot-1" style="left: 40%; bottom: 75%" data-label="Q2 revenue 15.1w"></span>
    <span class="vp-dot" id="vp-dot-2" style="left: 65%; bottom: 35%" data-label="Q3 revenue 18.9w"></span>
    <span class="vp-dot" id="vp-dot-3" style="left: 90%; bottom: 60%" data-label="Q4 revenue 21.6w"></span>
    <span class="vp-axis">Month →</span>
  </div>
  <oas-tooltip id="tt-anchor" virtual virtual-anchor="#vp-dot-0" content="Q1 revenue 12.4w" placement="top"></oas-tooltip>
  <p class="vp-hint">Hover any point to see the hint (the tooltip is anchored to that point).</p>
</DemoBlock>

<DemoBlock title="Coordinate follow (mouse move)">
  <div class="vp-canvas" id="vp-canvas">
    Move the mouse inside this area
    <oas-tag id="tt-follow-status" type="info" size="small">Not following</oas-tag>
  </div>
  <oas-tooltip id="tt-follow" virtual virtual-x="0" virtual-y="0" content="Coords: 0, 0" placement="bottom"></oas-tooltip>
</DemoBlock>

<style>
.vp-chart {
  position: relative;
  width: 100%;
  height: 160px;
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.vp-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--oas-color-primary);
  cursor: pointer;
  transform: translate(-50%, -50%);
}
.vp-dot:hover {
  background: var(--oas-color-primary-hover);
}
.vp-axis {
  position: absolute;
  left: var(--oas-space-4);
  bottom: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  /* text-secondary on bg-hover is 4.39:1 < 4.5:1 → use text-primary */
  color: var(--oas-color-text-primary);
}
.vp-canvas {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  cursor: crosshair;
}
.vp-hint {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
</style>

## Edge cases

<DemoBlock title="Empty content">
  <oas-tooltip placement="bottom">
    <oas-button>Tooltip without content</oas-button>
  </oas-tooltip>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tip = document.getElementById('tip-ctrl')
  const status = document.getElementById('tip-status')
  if (tip && status) {
    const sync = () => {
      status.textContent = `open: ${tip.hasAttribute('open')}`
    }
    window.tipCtrl = (open) => {
      if (open) tip.setAttribute('open', '')
      else tip.removeAttribute('open')
    }
    sync()
    // Both hover/focus triggers and external control change open; keep status synced with MutationObserver
    new MutationObserver(sync).observe(tip, { attributes: true, attributeFilter: ['open'] })
  }

  // Virtual anchor: hover a point → point virtual-anchor at it + update content + open
  const anchorTip = document.getElementById('tt-anchor')
  if (anchorTip) {
    document.querySelectorAll('#vp-chart .vp-dot').forEach((dot) => {
      dot.addEventListener('mouseenter', () => {
        anchorTip.setAttribute('virtual-anchor', `#${dot.id}`)
        anchorTip.setAttribute('content', dot.dataset.label || '')
        anchorTip.setAttribute('open', '')
      })
      dot.addEventListener('mouseleave', () => anchorTip.removeAttribute('open'))
    })
  }

  // Coordinate follow: canvas mousemove → virtual-x/y + open; close on leave
  const canvas = document.getElementById('vp-canvas')
  const followTip = document.getElementById('tt-follow')
  const followStatus = document.getElementById('tt-follow-status')
  if (canvas && followTip) {
    canvas.addEventListener('mousemove', (e) => {
      followTip.setAttribute('virtual-x', String(e.clientX))
      followTip.setAttribute('virtual-y', String(e.clientY))
      followTip.setAttribute('content', `Coords: ${e.clientX}, ${e.clientY}`)
      followTip.setAttribute('open', '')
    })
    canvas.addEventListener('mouseleave', () => followTip.removeAttribute('open'))
  }
  if (followTip && followStatus) {
    const syncFollow = () => {
      followStatus.textContent = followTip.hasAttribute('open') ? 'Following' : 'Not following'
    }
    syncFollow()
    new MutationObserver(syncFollow).observe(followTip, {
      attributes: true,
      attributeFilter: ['open'],
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `arrow` | Whether to show the arrow (default true; `arrow="false"` hides it, the element and `::part(arrow)` are kept) | `string` | `true` |
| `arrow-point-at-center` | Make the arrow point at the trigger element's center (default points at the trigger's edge; the arrow still points at the anchor center when the panel is shifted by viewport-edge avoidance) | `boolean` | — |
| `auto-adjust-overflow` | Viewport-edge auto flip and avoidance (default true; `"false"` disables it, keeping the declared placement, which may overflow the viewport) | `string` | `true` |
| `content` | Tooltip content text | `string` | — |
| `open` | Controlled display (boolean attribute; shows when present) | `boolean` | — |
| `placement` | Popup placement | `Placement` | `top` |
| `virtual` | Virtual trigger mode: not bound to a host trigger element; `open` is fully controlled externally and the position is set by `virtual-anchor` or `virtual-x`/`virtual-y` (for chart points, floating hints during drag) | `boolean` | — |
| `virtual-anchor` | Anchor element selector (e.g. `#chart-point-1`); the tooltip is positioned by that element's rect. Mutually exclusive with `virtual-x`/`virtual-y` (coordinates take precedence) | — | — |
| `virtual-x` | Virtual anchor viewport X coordinate (px, e.g. mouse `clientX`); position by coordinates when set together with `virtual-y` | — | — |
| `virtual-y` | Virtual anchor viewport Y coordinate (px, e.g. mouse `clientY`); position by coordinates when set together with `virtual-x` | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-open-change` | Fired when the `open` state changes (show/hide), `detail: { open }` |

### Slots

| Name | Description |
| --- | --- |
| default | Trigger element (hover/focus trigger); optional in `virtual` mode |

`oas-open-change`: fired when the `open` state changes (show/hide), `detail: { open }`. Shown/hidden on hover or focus; `role="tooltip"`, the popup uses `pointer-events: none` so it never blocks interactions.
