# Drawer

A panel that slides in from the side, often used for filters, details, and similar scenarios.

## Basic usage

<DemoBlock title="Right drawer">
  <oas-button type="primary" onclick="document.querySelector('#drawer-right').setAttribute('visible','')">Open right drawer</oas-button>
  <oas-drawer id="drawer-right" title="Drawer title">
    <p>Panel content sliding in from the right; click the mask, the close button, or press Esc to close.</p>
  </oas-drawer>
</DemoBlock>

## Left drawer

<DemoBlock title="Left drawer">
  <oas-button onclick="document.querySelector('#drawer-left').setAttribute('visible','')">Open left drawer</oas-button>
  <oas-drawer id="drawer-left" title="Filters" placement="left">
    <oas-space direction="vertical" size="small" style="width: 100%">
      <p>Status: All</p>
      <p>Category: All</p>
      <p>Sort: Created time</p>
    </oas-space>
  </oas-drawer>
</DemoBlock>

## Disable mask close

`no-mask-close` prevents closing the drawer by clicking the mask (other close paths remain).

<DemoBlock title="no-mask-close">
  <oas-button type="primary" onclick="document.querySelector('#drawer-nomask').setAttribute('visible','')">Open drawer</oas-button>
  <oas-drawer id="drawer-nomask" title="Confirmation required" no-mask-close>
    <p>Clicking the mask won't close it; use ✕ / Esc or the footer buttons.</p>
  </oas-drawer>
</DemoBlock>

## Controlled visibility

`visible` is a controlled attribute: the host (button/JS) sets or removes it, and the component never restores it automatically; after closing, listen for `oas-ok` / `oas-close` and remove `visible`.

<DemoBlock title="Controlled visibility (visible)">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#drawer-ctrl').setAttribute('visible','')">Open (set visible)</oas-button>
    <oas-button onclick="document.querySelector('#drawer-ctrl').removeAttribute('visible')">Close (remove visible)</oas-button>
  </oas-space>
  <oas-drawer id="drawer-ctrl" title="Controlled visibility">
    <p>External buttons set / remove <code>visible</code> to control visibility without relying on the footer buttons.</p>
  </oas-drawer>
</DemoBlock>

## No footer buttons

<DemoBlock title="No footer buttons">
  <oas-button onclick="document.querySelector('#drawer-nofooter').setAttribute('visible','')">Open drawer without footer buttons</oas-button>
  <oas-drawer id="drawer-nofooter" title="Read-only details" no-footer>
    <p>The footer action area is hidden; only ✕ and Esc remain as close entries.</p>
  </oas-drawer>
</DemoBlock>

## Event feedback

<DemoBlock title="Event feedback">
  <oas-button onclick="document.querySelector('#drawer-event').setAttribute('visible','')">Open and listen to events</oas-button>
  <oas-drawer id="drawer-event" title="Submit configuration" onoas-ok="closeDrawer('drawer-event'); message.success('Saved')" onoas-close="message.info('Drawer closed')">
    <p>Click "OK" or "Cancel" and watch the message at the top-right.</p>
  </oas-drawer>
</DemoBlock>

## Custom width

<DemoBlock title="Custom width">
  <oas-button type="primary" onclick="document.querySelector('#drawer-width').setAttribute('visible','')">Open 640px drawer</oas-button>
  <oas-drawer id="drawer-width" title="Custom width" width="640px">
    <p>Specify the drawer width via the <code>width</code> attribute, supporting px or percentages (e.g. <code>50%</code>); on narrow screens it is constrained by <code>max-width: 90vw</code>.</p>
  </oas-drawer>
</DemoBlock>

## Size presets

<DemoBlock title="Size presets">
  <oas-button onclick="document.querySelector('#drawer-size-small').setAttribute('visible','')">small (256px)</oas-button>
  <oas-button onclick="document.querySelector('#drawer-size-large').setAttribute('visible','')">large (736px)</oas-button>
  <oas-drawer id="drawer-size-small" title="Small drawer" size="small">
    <p>small tier: 256px, suited for auxiliary info on narrow screens.</p>
  </oas-drawer>
  <oas-drawer id="drawer-size-large" title="Large drawer" size="large">
    <p>large tier: 736px, suited for complex forms or detail scenarios.</p>
  </oas-drawer>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.closeDrawer = (id) => document.getElementById(id).removeAttribute('visible')
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `no-footer` | Hide footer action buttons | `boolean` | — |
| `no-mask-close` | Disable closing on mask click | `boolean` | — |
| `placement` | Slide direction | `string` | `right` |
| `size` | Preset size or a concrete value: `small` (256px) / `medium` (378px) / `large` (736px), or write directly like `512px`, `40%` | — | — |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear) | `string` | — |
| `visible` | Whether shown | `boolean` | — |
| `width` | Drawer width (px or percentage), takes precedence over `size` | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-close` | Close: cancel button / ✕ / mask click / Esc |
| `oas-ok` | Clicked "OK" |

### Slots

| Name | Description |
| --- | --- |
| default | — |

`role="dialog"` + `aria-modal="true"`; focus moves to the close button on open and is restored on close.
