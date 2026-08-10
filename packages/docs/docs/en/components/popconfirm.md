# Popconfirm

Shows a confirmation bubble next to the trigger element, commonly used before destructive actions like deletion.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-popconfirm title="Delete this record?" onoas-ok="message.success('Deleted')" onoas-cancel="message.info('Cancelled')">
    <oas-button type="danger">Delete</oas-button>
  </oas-popconfirm>
</DemoBlock>

## Controlled visibility

The `open` attribute is controlled: external buttons set/remove `open` to toggle the bubble (clicking outside / Esc / OK / cancel still closes it).

<DemoBlock title="Controlled visibility (open)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); pcCtrl(true)">Open confirm</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); pcCtrl(false)">Close</oas-button>
    <oas-tag id="pc-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-ctrl" title="Delete this record?">
    <oas-button type="danger">Delete</oas-button>
  </oas-popconfirm>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  const pc = document.getElementById('pc-ctrl')
  const status = document.getElementById('pc-status')
  if (!pc || !status) return
  const sync = () => {
    status.textContent = `open: ${pc.hasAttribute('open')}`
  }
  window.pcCtrl = (open) => {
    if (open) pc.setAttribute('open', '')
    else pc.removeAttribute('open')
  }
  sync()
  // OK / cancel / outside click / Esc remove open in the component; keep status in sync via MutationObserver
  new MutationObserver(sync).observe(pc, { attributes: true, attributeFilter: ['open'] })
})
</script>

## Four positions

<DemoBlock title="Four positions">
  <oas-space direction="vertical" size="large" align="center" style="width: 100%; padding: 24px 0">
    <div style="display: flex; justify-content: center; gap: 16px">
      <oas-popconfirm title="Top bubble" position="top"><oas-button size="small">Top</oas-button></oas-popconfirm>
      <oas-popconfirm title="Bottom bubble" position="bottom"><oas-button size="small">Bottom</oas-button></oas-popconfirm>
    </div>
    <div style="display: flex; justify-content: center; gap: 16px">
      <oas-popconfirm title="Left bubble" position="left"><oas-button size="small">Left</oas-button></oas-popconfirm>
      <oas-popconfirm title="Right bubble" position="right"><oas-button size="small">Right</oas-button></oas-popconfirm>
    </div>
  </oas-space>
</DemoBlock>

## Long text

<DemoBlock title="Long text">
  <oas-popconfirm title="This action permanently deletes this order and all its child records, which cannot be recovered. Continue?">
    <oas-button type="danger">Delete order</oas-button>
  </oas-popconfirm>
</DemoBlock>

## API

### Props

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `open` | Whether the bubble is shown | `boolean` | `false` |
| `title` | Confirmation text | `string` | — |
| `position` | Bubble position | `top` / `bottom` / `left` / `right` | `top` |

### Events

| Event | Description |
| --- | --- |
| `oas-ok` | Clicked "OK"; the bubble then collapses automatically |
| `oas-cancel` | Cancel: cancel button / Esc / outside click |

Clicking the wrapped content toggles the bubble; the bubble uses `role="dialog"`.
