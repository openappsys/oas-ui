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

## Imperative modal API

The imperative `modal.confirm / info / success / warning / error` API returns a `{ close() }` handle and reuses `oas-modal` under the hood. Options: `title`, `content` (plain text, no HTML injection), `okText`, `cancelText`, `onOk`, `onCancel`. When `onOk` returns a Promise, clicking OK puts the OK button into loading (spinner, no repeated triggers); it closes on resolve, and on reject the loading clears and the dialog stays open for retry or cancel. The cancel button / ✕ / mask / Esc call `onCancel` and close; the `close()` handle closes programmatically without firing `onCancel`. Multiple instances stack independently; `destroyAllModal()` closes them all at once. Mounts to the nearest `oas-app` container (falls back to `body`).

<DemoBlock title="Basic confirm">
  <oas-space>
    <oas-button type="primary" onclick="openModalConfirm()">Basic confirm</oas-button>
    <oas-button type="danger" onclick="openModalConfirmDelete()">Custom labels</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Semantic variants">
  <oas-space>
    <oas-button type="primary" onclick="window.modal.info({ title: 'Notice', content: 'This is an informational message.' })">Info</oas-button>
    <oas-button type="success" onclick="window.modal.success({ title: 'Success', content: 'Operation completed.' })">Success</oas-button>
    <oas-button type="warning" onclick="window.modal.warning({ title: 'Warning', content: 'Please be aware of the risk.' })">Warning</oas-button>
    <oas-button type="danger" onclick="window.modal.error({ title: 'Error', content: 'Operation failed, please retry.' })">Error</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Async onOk loading">
  <oas-button type="primary" onclick="openModalLoading()">Async submit</oas-button>
</DemoBlock>

<DemoBlock title="Multiple instances & destroy all">
  <oas-space>
    <oas-button onclick="openModalMany()">Open three</oas-button>
    <oas-button onclick="destroyAllModal()">Destroy all</oas-button>
  </oas-space>
</DemoBlock>

## Declarative semantic variants

The attributes used internally by the imperative module — `type` / `ok-text` / `cancel-text` / `no-cancel` / `focus-ok` — are all public `oas-modal` attributes and can be used declaratively.

<DemoBlock title="Declarative semantic variants">
  <oas-space>
    <oas-button type="success" onclick="document.querySelector('#modal-semantic').setAttribute('visible','')">Open success dialog</oas-button>
    <oas-button onclick="document.querySelector('#modal-nocancel').setAttribute('visible','')">Open single-button dialog</oas-button>
  </oas-space>
  <oas-modal id="modal-semantic" type="success" title="Operation successful" ok-text="Got it" cancel-text="Close" focus-ok>
    <p><code>type</code> renders the semantic icon; <code>ok-text</code>/<code>cancel-text</code> customize button labels; <code>focus-ok</code> focuses the "OK" button on open.</p>
  </oas-modal>
  <oas-modal id="modal-nocancel" title="OK only" no-cancel>
    <p><code>no-cancel</code> hides the cancel button, leaving only "OK" in the footer.</p>
  </oas-modal>
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
  const { message, confirm, modal, destroyAllModal } = await import('@oas-ui/ui')
  window.message = message
  window.modal = modal
  window.destroyAllModal = destroyAllModal
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
  window.openModalConfirm = () =>
    modal.confirm({
      title: 'Confirm action',
      content: 'This action cannot be undone. Continue?',
      onOk: () => message.success('Confirmed'),
      onCancel: () => message.info('Cancelled'),
    })
  window.openModalConfirmDelete = () =>
    modal.confirm({
      title: 'Delete file',
      content: 'This cannot be undone',
      okText: 'Delete',
      cancelText: 'Keep',
      onOk: () => message.success('Deleted'),
    })
  window.openModalLoading = () =>
    modal.success({
      title: 'Submit order',
      content: 'Clicking OK enters loading and closes automatically after 1.5s.',
      onOk: () =>
        new Promise((resolve) =>
          setTimeout(() => {
            message.success('Submitted')
            resolve()
          }, 1500),
        ),
    })
  window.openModalMany = () => {
    modal.confirm({ title: 'Confirm 1', content: 'First confirm dialog' })
    modal.confirm({ title: 'Confirm 2', content: 'Second confirm dialog' })
    modal.success({ title: 'Confirm 3', content: 'Third confirm dialog' })
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `modal.confirm({ title?, content?, okText?, cancelText?, onOk?, onCancel? })` | Opens a confirm dialog (OK / Cancel buttons), returns `{ close }` |
| `modal.info(options)` / `modal.success(options)` / `modal.warning(options)` / `modal.error(options)` | Semantic dialog: matching icon + single "OK" button, returns `{ close }` |
| `destroyAllModal()` | Closes and destroys all imperative dialogs |

- Options: `{ title?, content?, okText?, cancelText?, onOk?, onCancel? }`. `content` is plain text; when `onOk` returns a Promise the OK button enters loading (closes on resolve, stays open on reject for retry or cancel).
- Returns a `{ close() }` handle: closes the current instance programmatically without firing `onOk` / `onCancel`.
- Mounts to the nearest `oas-app` container (falls back to `body`); multiple instances stack.

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `cancel-text` | Cancel button label; defaults to locale `modal.cancel` | — | — |
| `centered` | Vertically center the dialog | `boolean` | — |
| `draggable` | Drag the dialog via its header | `boolean` | — |
| `focus-ok` | Move focus to the "OK" button on open (default: the "Cancel" button) | `boolean` | — |
| `fullscreen` | Display fullscreen: the dialog fills the viewport without radius or margin (takes precedence over width / centered / draggable) | `boolean` | — |
| `loading` | Put the OK button into loading state (disabled + spinner), blocking repeated confirms | `boolean` | — |
| `no-cancel` | Hide the cancel button (the footer keeps only "OK"; built into semantic variants) | `boolean` | — |
| `no-footer` | Hide footer action buttons | `boolean` | — |
| `no-mask-close` | Disable closing on mask click | `boolean` | — |
| `ok-text` | OK button label; defaults to locale `modal.ok` | — | — |
| `title` | Title text | `string` | — |
| `type` | Semantic variant: `info`/`success`/`warning`/`error`, renders the matching semantic icon above the content | `ModalVariant` | — |
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

`role="dialog"` + `aria-modal="true"`; focus moves to the "Cancel" button on open (to the "OK" button with `focus-ok`) and is restored on close.
