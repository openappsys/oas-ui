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
  if (!tip || !status) return
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
})
</script>

## API

### Attributes

| Attribute   | Description                                                | Type        | Default |
| ----------- | ---------------------------------------------------------- | ----------- | ------- |
| `content`   | Tooltip content text                                       | `string`    | —       |
| `open`      | Controlled display (boolean attribute; shows when present) | `boolean`   | —       |
| `placement` | Popup placement                                            | `Placement` | `top`   |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

No public events. Shown/hidden on hover or focus; `role="tooltip"`, the popup uses `pointer-events: none` so it never blocks interactions.
