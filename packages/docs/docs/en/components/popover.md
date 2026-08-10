# Popover

A click-triggered popup panel that can hold a title, body text and arbitrary custom content.

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
  if (!pop || !status) return
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
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `content` | Body text | `string` | — |
| `open` | Controlled display (boolean attribute; shows when present) | `boolean` | — |
| `placement` | Popup placement | `Placement` | `top` |
| `title` | Title text | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `content` | — |

No public events. Clicking the trigger toggles visibility; clicking outside or pressing Esc closes it; `role="dialog"`.
