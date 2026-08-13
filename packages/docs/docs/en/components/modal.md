# Modal

A modal dialog for interrupting flows that require user confirmation or input.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-button type="primary" onclick="document.querySelector('#modal-basic').setAttribute('visible','')">Open dialog</oas-button>
  <oas-modal id="modal-basic" title="Notice">
    <p>This is a basic dialog example.</p>
  </oas-modal>
</DemoBlock>

## Controlled visibility

`visible` is a controlled attribute: the host (button/JS) sets or removes it, and the component never restores it automatically; after closing, listen for `oas-ok` / `oas-cancel` and remove `visible`.

<DemoBlock title="Controlled visibility (visible)">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#modal-ctrl').setAttribute('visible','')">Open (set visible)</oas-button>
    <oas-button onclick="document.querySelector('#modal-ctrl').removeAttribute('visible')">Close (remove visible)</oas-button>
  </oas-space>
  <oas-modal id="modal-ctrl" title="Controlled visibility">
    <p>External buttons set / remove <code>visible</code> to control visibility without relying on the footer buttons.</p>
  </oas-modal>
</DemoBlock>

## No footer buttons

<DemoBlock title="No footer buttons">
  <oas-button onclick="document.querySelector('#modal-nofooter').setAttribute('visible','')">Open dialog without footer buttons</oas-button>
  <oas-modal id="modal-nofooter" title="Instructions" no-footer>
    <p>The footer action area is hidden; close via ✕ / Esc / mask only.</p>
  </oas-modal>
</DemoBlock>

## Disable mask close

<DemoBlock title="Disable mask close">
  <oas-button onclick="document.querySelector('#modal-nomask').setAttribute('visible','')">Open dialog</oas-button>
  <oas-modal id="modal-nomask" title="Confirmation required" no-mask-close>
    <p>Clicking the mask won't close it; use the buttons or Esc.</p>
  </oas-modal>
</DemoBlock>

## Custom width

<DemoBlock title="Custom width">
  <oas-button onclick="document.querySelector('#modal-width').setAttribute('visible','')">Open dialog with custom width</oas-button>
  <oas-modal id="modal-width" title="Custom width" width="640px">
    <p>Specify the dialog width via <code>width</code>, supporting pixels or percentages (e.g. <code>50%</code>); defaults to 520px when unset.</p>
  </oas-modal>
</DemoBlock>

## Vertically centered

<DemoBlock title="Vertically centered">
  <oas-button onclick="document.querySelector('#modal-centered').setAttribute('visible','')">Open vertically centered dialog</oas-button>
  <oas-modal id="modal-centered" title="Vertically centered" centered>
    <p>By default the dialog is offset toward the top (100px from the top); adding <code>centered</code> centers it vertically.</p>
  </oas-modal>
</DemoBlock>

## Draggable

<DemoBlock title="Draggable">
  <oas-button onclick="document.querySelector('#modal-drag').setAttribute('visible','')">Open draggable dialog</oas-button>
  <oas-modal id="modal-drag" title="Drag by the title bar" draggable>
    <p>Drag the dialog by its title bar; Esc, mask close, and focus behavior stay unchanged.</p>
  </oas-modal>
</DemoBlock>

## Fullscreen dialog

`fullscreen` makes the dialog fill the viewport (no radius, no margin). Precedence: **fullscreen wins over `width` / `centered` / `draggable`** — `width` is ignored, `centered` has no layout effect, dragging is disabled; Esc / mask close, focus trap, and ARIA behavior stay the same.

<DemoBlock title="Fullscreen dialog">
  <oas-button type="primary" onclick="document.querySelector('#modal-fullscreen').setAttribute('visible','')">Open fullscreen dialog</oas-button>
  <oas-modal id="modal-fullscreen" title="Fullscreen dialog" fullscreen width="640px" centered draggable>
    <p>The fullscreen dialog fills the viewport without radius or margin. <code>width</code> / <code>centered</code> are ignored and dragging is disabled; Esc / mask close still work.</p>
  </oas-modal>
</DemoBlock>

## Imperative confirm

The imperative `confirm()` API is Promise-based and reuses `oas-modal` (returns `Promise<void>`; resolves on OK, rejects on cancel). Pass an async `onOk` callback for a **loading confirmation**: clicking OK puts the OK button into loading (spinner, no repeated triggers); on resolve the dialog closes and the outer promise resolves; on reject the loading clears and the dialog stays open for retry or cancel.

<DemoBlock title="Imperative confirm">
  <oas-space>
    <oas-button type="primary" onclick="openConfirmModal()">Async confirm</oas-button>
    <oas-button onclick="openConfirmLoading()">Loading confirm</oas-button>
  </oas-space>
</DemoBlock>

## Event feedback

<DemoBlock title="Event feedback">
  <oas-button onclick="document.querySelector('#modal-event').setAttribute('visible','')">Open and listen to events</oas-button>
  <oas-modal id="modal-event" title="Delete confirmation" onoas-ok="closeModal('modal-event'); message.success('Deleted')" onoas-cancel="closeModal('modal-event'); message.info('Cancelled')">
    <p>Click "OK" or "Cancel" and watch the message at the top-right.</p>
  </oas-modal>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message, confirm } = await import('@oas-ui/ui')
  window.message = message
  window.closeModal = (id) => document.getElementById(id).removeAttribute('visible')
  window.openConfirmModal = () =>
    confirm({ title: 'Confirm action', content: 'Simulated async flow: resolve on OK, reject on cancel.' })
      .then(() => message.success('Confirmed'))
      .catch(() => message.info('Cancelled'))
  window.openConfirmLoading = () =>
    confirm({
      title: 'Confirm submit',
      content: 'Simulated async submit: the OK button enters loading after click and closes automatically after 1.5s.',
      onOk: () => new Promise((resolve) => setTimeout(resolve, 1500)),
    })
      .then(() => message.success('Submitted'))
      .catch(() => message.info('Cancelled'))
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `centered` | Vertically center the dialog | `boolean` | — |
| `draggable` | Drag the dialog via its header | `boolean` | — |
| `fullscreen` | Display fullscreen: the dialog fills the viewport without radius or margin (takes precedence over width / centered / draggable) | `boolean` | — |
| `loading` | Put the OK button into loading state (disabled + spinner), blocking repeated confirms | `boolean` | — |
| `no-footer` | Hide footer action buttons | `boolean` | — |
| `no-mask-close` | Disable closing on mask click | `boolean` | — |
| `title` | Title text | `string` | — |
| `visible` | Whether shown | `boolean` | — |
| `width` | Dialog width (px or percentage) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-cancel` | Cancel: cancel button / ✕ / mask click / Esc |
| `oas-ok` | Clicked "OK" |

### Slots

| Name | Description |
| --- | --- |
| default | — |

`role="dialog"` + `aria-modal="true"`; focus moves to the "Cancel" button on open and is restored on close.
