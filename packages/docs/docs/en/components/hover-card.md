# HoverCard

A preview card triggered on hover/focus with configurable delay.

## Basic usage

<DemoBlock title="Trigger on hover">
  <oas-hover-card title="User info" content="Hover to view the user details." placement="bottom">
    <oas-button type="primary">Hover to view</oas-button>
  </oas-hover-card>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-hover-card title="Title" content="Content" placement="top">
    <oas-button>Up</oas-button>
  </oas-hover-card>
  <oas-hover-card title="Title" content="Content" placement="bottom">
    <oas-button>Down</oas-button>
  </oas-hover-card>
  <oas-hover-card title="Title" content="Content" placement="left">
    <oas-button>Left</oas-button>
  </oas-hover-card>
  <oas-hover-card title="Title" content="Content" placement="right">
    <oas-button>Right</oas-button>
  </oas-hover-card>
</DemoBlock>

## Show / hide delay

<DemoBlock title="Delay">
  <oas-hover-card title="Delayed card" content="Appears about 600ms after hovering; closes after a delay on leave." delay="600">
    <oas-button>Hover me</oas-button>
  </oas-hover-card>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to show/hide the card (hover/focus triggers still apply in addition).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="hcCtrl(true)">Show</oas-button>
    <oas-button size="small" onclick="hcCtrl(false)">Hide</oas-button>
    <oas-tag id="hc-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-hover-card id="hc-ctrl" title="Controlled card" content="Visibility controlled by the open attribute." placement="bottom">
    <oas-button>Trigger element</oas-button>
  </oas-hover-card>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const hc = document.getElementById('hc-ctrl')
  const status = document.getElementById('hc-status')
  if (!hc || !status) return
  const sync = () => {
    status.textContent = `open: ${hc.hasAttribute('open')}`
  }
  window.hcCtrl = (open) => {
    if (open) hc.setAttribute('open', '')
    else hc.removeAttribute('open')
  }
  sync()
  // Both hover/focus triggers and external control change open; keep status synced with MutationObserver
  new MutationObserver(sync).observe(hc, { attributes: true, attributeFilter: ['open'] })
})
</script>

## API

### Attributes

| Attribute   | Description                                                | Type        | Default |
| ----------- | ---------------------------------------------------------- | ----------- | ------- |
| `content`   | Content text                                               | `string`    | —       |
| `delay`     | Show/hide delay in milliseconds                            | `string`    | `100`   |
| `open`      | Controlled display (boolean attribute; shows when present) | `boolean`   | —       |
| `placement` | Popup placement                                            | `Placement` | `top`   |
| `title`     | Title text                                                 | `string`    | —       |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

No public events. Triggered on hover/focus, `role="dialog"`.
