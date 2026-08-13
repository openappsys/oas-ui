# Popover

A click-triggered popup panel that can hold a title, body text and arbitrary custom content. Supports nested popovers and virtual triggering (chart / canvas coordinate hints).

## Basic usage

<DemoBlock title="Trigger on click">
  <oas-popover title="Card title" content="Click the trigger to toggle visibility; click outside or press Esc to close." placement="bottom">
    <oas-button type="primary">Click to open</oas-button>
  </oas-popover>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-popover title="Title" content="Content" placement="top">
    <oas-button>Up</oas-button>
  </oas-popover>
  <oas-popover title="Title" content="Content" placement="bottom">
    <oas-button>Down</oas-button>
  </oas-popover>
  <oas-popover title="Title" content="Content" placement="left">
    <oas-button>Left</oas-button>
  </oas-popover>
  <oas-popover title="Title" content="Content" placement="right">
    <oas-button>Right</oas-button>
  </oas-popover>
</DemoBlock>

## Custom content

<DemoBlock title="Custom content (slot=content)">
  <oas-popover title="Actions panel" placement="bottom">
    <oas-button>Open panel</oas-button>
    <div slot="content" style="line-height: 1.8">
      You can place arbitrary custom content via <code>slot="content"</code>.
    </div>
  </oas-popover>
</DemoBlock>

## Nested popovers

A floating layer can open a child popover / tooltip from its own content: the child layer anchors correctly and stacks above the parent; closing the parent closes the child as well; `Esc` closes one layer at a time and restores focus each time.

<DemoBlock title="Nested popovers (pop from a card)">
  <oas-popover id="pop-parent" title="Main card" placement="bottom" focus-on-open>
    <oas-button type="primary">Open main card</oas-button>
    <div slot="content" style="width: 240px; line-height: 1.8">
      <p style="margin: 0 0 8px">Open a child layer from within the parent panel:</p>
      <oas-popover id="pop-child" title="Child card" content="The child closes together with the parent; Esc closes layer by layer." placement="right" focus-on-open>
        <oas-button size="small">Open child card</oas-button>
      </oas-popover>
    </div>
  </oas-popover>
</DemoBlock>

## Virtual triggering

In `virtual` mode there is no real anchor (same as tooltip): the host positions the popover with `virtual-x` / `virtual-y` viewport coordinates or a `virtual-anchor` element selector, ideal for chart / canvas coordinate hints; `open` controls visibility. In virtual mode neither clicking the trigger nor clicking outside changes the state — the lifecycle is fully host-controlled.

<DemoBlock title="Virtual triggering (canvas cursor tracking)">
  <oas-popover id="pop-virt" virtual virtual-x="0" virtual-y="0" placement="top" title="Canvas coordinate"></oas-popover>
  <div id="virt-canvas" style="position: relative; height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <p style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">Move the mouse to see coordinate hints</p>
  </div>
</DemoBlock>

<DemoBlock title="Virtual triggering (anchor coordinates)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); popPointShow(160, 90)">Open at (160, 90)</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); popPointHide()">Close</oas-button>
    <oas-tag id="pop-point-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-point" virtual virtual-x="160" virtual-y="90" placement="right" title="Point hint" content="Anchor coordinates are set by virtual-x / virtual-y, suitable for chart data point hints."></oas-popover>
</DemoBlock>

<DemoBlock title="Virtual triggering (anchor element)">
  <div id="pop-chart" style="position: relative; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div id="pop-dot-0" style="position: absolute; left: 90px; top: 34px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
    <div id="pop-dot-1" style="position: absolute; left: 200px; top: 60px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
  </div>
  <oas-popover id="pop-anchor" virtual virtual-anchor="#pop-dot-0" placement="top" title="Data point" content="The anchor element is set by virtual-anchor, suitable for chart data point hints."></oas-popover>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to control visibility (clicking outside / pressing Esc still closes it).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); popoverCtrl(true)">Open</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); popoverCtrl(false)">Close</oas-button>
    <oas-tag id="pop-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-ctrl" title="Controlled panel" content="Controlled by the open attribute; clicking outside / Esc closes it." placement="bottom">
    <oas-button>Trigger element</oas-button>
  </oas-popover>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const pop = document.getElementById('pop-ctrl')
  const status = document.getElementById('pop-status')
  if (pop && status) {
    const sync = () => {
      status.textContent = `open: ${pop.hasAttribute('open')}`
    }
    window.popoverCtrl = (open) => {
      if (open) pop.setAttribute('open', '')
      else pop.removeAttribute('open')
    }
    sync()
    // Clicking outside / Esc makes the component remove open; keep status synced with MutationObserver
    new MutationObserver(sync).observe(pop, { attributes: true, attributeFilter: ['open'] })
  }

  // Virtual triggering: canvas cursor tracking (the host updates virtual-x/virtual-y on mousemove; open controls visibility)
  const virt = document.getElementById('pop-virt')
  const canvas = document.getElementById('virt-canvas')
  if (virt && canvas) {
    canvas.addEventListener('mousemove', (e) => {
      virt.setAttribute('open', '')
      virt.setAttribute('virtual-x', String(e.clientX))
      virt.setAttribute('virtual-y', String(e.clientY))
      virt.setAttribute('content', `x: ${e.clientX}px, y: ${e.clientY}px`)
    })
    canvas.addEventListener('mouseleave', () => virt.removeAttribute('open'))
  }

  // Virtual triggering: anchor coordinates (the host sets virtual-x/virtual-y explicitly then opens)
  const point = document.getElementById('pop-point')
  if (point) {
    window.popPointShow = (x, y) => {
      point.setAttribute('virtual-x', String(x))
      point.setAttribute('virtual-y', String(y))
      point.setAttribute('open', '')
    }
    window.popPointHide = () => point.removeAttribute('open')
    // oas-open-change visible feedback: status tag echoes open
    const st = document.getElementById('pop-point-status')
    point.addEventListener('oas-open-change', (e) => {
      if (st) st.textContent = `open: ${e.detail.open}`
    })
  }

  // Virtual triggering: anchor element (hover a dot shows the popover; virtual-anchor anchors it)
  const anchor = document.getElementById('pop-anchor')
  const dot0 = document.getElementById('pop-dot-0')
  const dot1 = document.getElementById('pop-dot-1')
  if (anchor && dot0 && dot1) {
    dot0.addEventListener('mouseenter', () => {
      anchor.setAttribute('virtual-anchor', '#pop-dot-0')
      anchor.setAttribute('open', '')
    })
    dot1.addEventListener('mouseenter', () => {
      anchor.setAttribute('virtual-anchor', '#pop-dot-1')
      anchor.setAttribute('open', '')
    })
    const hide = () => anchor.removeAttribute('open')
    dot0.addEventListener('mouseleave', hide)
    dot1.addEventListener('mouseleave', hide)
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `content` | Body text | `string` | — |
| `focus-on-open` | Moves focus into the first focusable element of the panel when opened | `boolean` | — |
| `open` | Controlled display (boolean attribute; shows when present) | `boolean` | — |
| `placement` | Popup placement | `Placement` | `top` |
| `title` | Title text | `string` | — |
| `virtual` | Virtual trigger mode (same as tooltip; no anchor element) | `boolean` | — |
| `virtual-anchor` | Virtual anchor element selector (used when virtual-x/virtual-y are unset) | — | — |
| `virtual-x` | Virtual anchor x (viewport coordinate, px) | — | — |
| `virtual-y` | Virtual anchor y (viewport coordinate, px) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-open-change` | open state changed, `detail: { open }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `content` | — |

Clicking the trigger toggles visibility; clicking outside or pressing Esc closes it; `role="dialog"`. Nested popovers: closing the parent cascades to children; `Esc` closes one layer at a time and restores focus to the trigger.
