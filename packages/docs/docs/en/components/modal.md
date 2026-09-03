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

## Prompt input

The imperative `modal.prompt(options)` shows a dialog with an input control, auto-focusing the input on open, and resolves `{ value, action }` (`confirm` on OK; `cancel` for cancel / ✕ / mask / Esc). Supports `inputValue` / `placeholder` / `inputType` (text / password / number / textarea) / `inputPattern` (string regex validation, pattern runs before validator) / `validator` (`true` passes, `false` uses the default message, a `string` is the error message). **Failed validation keeps the dialog open** with the error shown; correcting the input clears the error so it can be submitted again. An async `onOk` puts the OK button into loading.

<DemoBlock title="Basic prompt">
  <oas-space>
    <oas-button type="primary" onclick="openPrompt()">Basic input</oas-button>
    <oas-button onclick="openPromptValidated()">Validation keeps open</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Prompt advanced (textarea / password + pattern)">
  <oas-space>
    <oas-button onclick="openPromptTextarea()">Feedback (textarea)</oas-button>
    <oas-button onclick="openPromptPassword()">Set password (pattern)</oas-button>
  </oas-space>
</DemoBlock>

## Body scroll lock

Opening locks body scrolling (overflow hidden + scrollbar-width compensation to prevent layout shift); closing restores it. Multiple instances share a depth counter — the lock releases only when the last one closes. `no-scroll-lock` opts out.

<DemoBlock title="Body scroll lock">
  <oas-button type="primary" onclick="document.querySelector('#modal-scroll').setAttribute('visible','')">Open and lock scrolling</oas-button>
  <oas-modal id="modal-scroll" title="Scroll lock">
    <p>While open, page scrolling is locked and restored on close. Try scrolling the page with the dialog open — the content stays put.</p>
  </oas-modal>
</DemoBlock>

## Close interception (before-close)

Listen to the cancelable `oas-before-close` (`event.detail.source` identifies the source: ok / cancel / close-btn / mask / esc); calling `preventDefault()` blocks the close — useful for protecting unsaved data. For imperative dialogs, the OK path is governed by the `onOk` Promise (closes on resolve); cancel-type paths can still be intercepted.

<DemoBlock title="Close interception">
  <oas-button type="primary" onclick="document.querySelector('#modal-guard').setAttribute('visible','')">Open form dialog</oas-button>
  <oas-modal id="modal-guard" title="Edit profile" ok-text="Save">
    <p>Cancel / ✕ / mask / Esc are all intercepted with a warning; "Save" closes normally.</p>
    <oas-space direction="vertical" size="small" style="width: 100%">
      <oas-input placeholder="Nickname" value="John"></oas-input>
    </oas-space>
  </oas-modal>
</DemoBlock>

## Three close-entry switches

`no-esc-close` (disable Esc), `no-mask-close` (disable mask click), `no-close-btn` (hide ✕) — each close entry is independently configurable, handing control to the host.

<DemoBlock title="Close-entry switches">
  <oas-button onclick="document.querySelector('#modal-switch').setAttribute('visible','')">Open minimal dialog</oas-button>
  <oas-modal id="modal-switch" title="Button-only close" no-esc-close no-close-btn>
    <p>Esc and ✕ are disabled (mask click still works); the only close entry is the footer button.</p>
  </oas-modal>
</DemoBlock>

## Custom footer (footer slot)

When `slot="footer"` has content, the built-in OK/Cancel buttons are hidden automatically and the footer is fully owned by the slot.

<DemoBlock title="Footer slot">
  <oas-button type="primary" onclick="document.querySelector('#modal-footer').setAttribute('visible','')">Open custom footer</oas-button>
  <oas-modal id="modal-footer" title="Task details">
    <p>The footer is fully owned by the slot (built-in buttons auto-hide).</p>
    <span slot="footer">
      <oas-button onclick="closeModal('modal-footer'); message.info('Cancelled')">Cancel</oas-button>
      <oas-button type="primary" onclick="closeModal('modal-footer'); message.success('Submitted')">Submit task</oas-button>
    </span>
  </oas-modal>
</DemoBlock>

## Runtime update (handle.update)

`handle.update(partialOptions)` incrementally updates title / content / button labels at runtime without touching bound callbacks.

<DemoBlock title="handle.update()">
  <oas-button type="primary" onclick="openUpdate()">Open, update after 3s</oas-button>
</DemoBlock>

## Imperative alertdialog semantics

Imperative confirm / prompt dialogs use `role="alertdialog"` (screen readers announce immediately); declarative `<oas-modal>` stays `dialog` by default and can be overridden with the `role` attribute.

<DemoBlock title="alertdialog semantics">
  <oas-button onclick="document.querySelector('#modal-alert').setAttribute('visible','')">Open alertdialog</oas-button>
  <oas-modal id="modal-alert" title="Important action" role="alertdialog" type="warning">
    <p><code>role="alertdialog"</code>: screen readers interrupt current announcements; declarative defaults to dialog.</p>
  </oas-modal>
</DemoBlock>

## Mask styling & top positioning

The mask background uses the `--oas-modal-mask-bg` variable (falls back to the overlay token); `--oas-modal-mask-blur` enables optional backdrop blur. `position="top"` snaps the dialog to the top edge of the viewport (default is 100px from the top; `centered` centers it).

<DemoBlock title="Mask styling / position top">
  <oas-space>
    <oas-button onclick="document.querySelector('#modal-mask').setAttribute('visible','')">Custom mask</oas-button>
    <oas-button onclick="document.querySelector('#modal-top').setAttribute('visible','')">Top position</oas-button>
  </oas-space>
  <oas-modal id="modal-mask" title="Custom mask" style="--oas-modal-mask-bg: rgb(255 77 79 / 0.18); --oas-modal-mask-blur: 2px">
    <p>Mask background comes from <code>--oas-modal-mask-bg</code> (here: red 18% + 2px blur).</p>
  </oas-modal>
  <oas-modal id="modal-top" title="Top position" position="top">
    <p><code>position="top"</code> snaps the dialog to the top edge; the default is 100px from the top (`centered` centers it).</p>
  </oas-modal>
</DemoBlock>

## Close-source event

`oas-close` carries `detail.source` (ok / cancel / close-btn / mask / esc / programmatic) and `detail.action` (confirm / cancel / close); non-OK paths keep emitting `oas-cancel` for backwards compatibility.

<DemoBlock title="Close source">
  <oas-button onclick="document.querySelector('#modal-source').setAttribute('visible','')">Open and watch sources</oas-button>
  <oas-modal id="modal-source" title="Close source">
    <p>Close via OK / Cancel / ✕ / mask / Esc and watch the source message at the top-right.</p>
  </oas-modal>
</DemoBlock>

## Open/close animation

Opening / closing plays a **fade + scale** animation by default (transform/opacity only; disabled automatically under `prefers-reduced-motion`). `oas-open` fires when opening starts; `oas-opened` / `oas-closed` fire **after the animation ends** — imperative dialogs rely on that to unmount only after the animation. The `transition` attribute picks a preset: `zoom` (default, fade + scale) / `fade` (opacity only) / `none` (no transition, instant show/hide).

<DemoBlock title="Open/close animation + lifecycle events">
  <oas-button type="primary" onclick="document.querySelector('#modal-anim').setAttribute('visible','')">Open (watch animation & events)</oas-button>
  <oas-modal id="modal-anim" title="Open/close animation">
    <p>Default fade + scale animation; the messages show <code>oas-opened</code> / <code>oas-closed</code> (fired only after the animation ends).</p>
  </oas-modal>
</DemoBlock>

<DemoBlock title="transition presets (fade / none)">
  <oas-space>
    <oas-button onclick="document.querySelector('#modal-fade').setAttribute('visible','')">fade (opacity only)</oas-button>
    <oas-button onclick="document.querySelector('#modal-none').setAttribute('visible','')">none (instant)</oas-button>
  </oas-space>
  <oas-modal id="modal-fade" title="fade animation" transition="fade">
    <p><code>transition="fade"</code>: opacity-only transition without scaling.</p>
  </oas-modal>
  <oas-modal id="modal-none" title="No animation" transition="none">
    <p><code>transition="none"</code>: instant show / hide (for performance or fallback scenarios).</p>
  </oas-modal>
</DemoBlock>

## Click-position animation origin

At the instant of opening the pointer position is recorded and the dialog scales out from that point (`transform-origin` points at the click); keyboard / programmatic opens fall back to the center.

<DemoBlock title="Click-position animation origin">
  <oas-button type="primary" onclick="document.querySelector('#modal-origin').setAttribute('visible','')">Click here to open (animates from the button)</oas-button>
  <oas-modal id="modal-origin" title="Scales from the click">
    <p>The scale animation origin follows the most recent click: it expands from the button you clicked instead of the center.</p>
  </oas-modal>
</DemoBlock>

## Non-modal (no-mask)

`no-mask`: **no backdrop is rendered + the focus trap is disabled + focus is not stolen on open** (semantics aligned with the native `<dialog>.show()`, for notifications / canvas helpers and other non-blocking scenarios). Close channels stay (✕ / footer buttons / Esc; pair with `no-esc-close` to disable Esc).

<DemoBlock title="no-mask non-modal">
  <oas-button onclick="document.querySelector('#modal-nonmask').setAttribute('visible','')">Open non-modal dialog</oas-button>
  <oas-modal id="modal-nonmask" title="Non-modal notice" no-mask position="top">
    <p>No backdrop and no focus trap — the rest of the page stays interactive (try clicking page buttons while it is open).</p>
  </oas-modal>
</DemoBlock>

## Drag clamping (keep in viewport)

Draggable dialogs have their coordinates **clamped inside the viewport** (on by default): even large drags cannot push the dialog fully off-screen where it can't be recovered.

<DemoBlock title="Drag clamping">
  <oas-button type="primary" onclick="document.querySelector('#modal-clamp').setAttribute('visible','')">Open and drag</oas-button>
  <oas-modal id="modal-clamp" title="Drag clamping" draggable>
    <p>Drag by the title bar as far as you like: the dialog stays inside the viewport (right / bottom edges are clamped) and can always be found again.</p>
  </oas-modal>
</DemoBlock>

## Declarative trigger

`trigger="element-id"` binds any page element as the open trigger: clicking it calls `setAttribute('visible')` (pure sugar — it does not change the controlled model; closing still means the host removes `visible`).

<DemoBlock title="Declarative trigger">
  <oas-button id="modal-trigger-btn" type="success">Click me to open (trigger bound)</oas-button>
  <oas-modal id="modal-triggered" title="Opened by trigger" trigger="modal-trigger-btn">
    <p>This button has no onclick of its own — the <code>trigger</code> attribute of <code>oas-modal</code> binds the click-to-open automatically.</p>
  </oas-modal>
</DemoBlock>

## Size presets & fullscreen breakpoint

`size` presets: `sm` (400px) / `lg` (720px); an explicit `width` wins. `fullscreen-breakpoint="800"`: **the dialog goes fullscreen automatically when the viewport width drops below the threshold** (and restores when widened) — narrow-screen adaptation without JS.

<DemoBlock title="Size presets sm / lg">
  <oas-space>
    <oas-button onclick="document.querySelector('#modal-size-sm').setAttribute('visible','')">size=sm</oas-button>
    <oas-button onclick="document.querySelector('#modal-size-lg').setAttribute('visible','')">size=lg</oas-button>
  </oas-space>
  <oas-modal id="modal-size-sm" title="Small" size="sm">
    <p><code>size="sm"</code>: 400px wide.</p>
  </oas-modal>
  <oas-modal id="modal-size-lg" title="Large" size="lg">
    <p><code>size="lg"</code>: 720px wide.</p>
  </oas-modal>
</DemoBlock>

<DemoBlock title="fullscreen-breakpoint">
  <oas-button onclick="document.querySelector('#modal-bp').setAttribute('visible','')">Open (try narrowing the window below 800px)</oas-button>
  <oas-modal id="modal-bp" title="Auto fullscreen on narrow screens" fullscreen-breakpoint="800" width="640px">
    <p><code>fullscreen-breakpoint="800"</code>: below 800px viewport width the dialog fills the screen (no radius, width ignored); widening the viewport restores the regular dialog.</p>
  </oas-modal>
</DemoBlock>

## Enter-to-confirm (confirm-on-enter)

`confirm-on-enter` (explicit opt-in, off by default): pressing Enter triggers "OK" when the dialog contains **no text input controls** (ignored while loading; when focus is on a button, native activation wins to avoid double-triggering). Great for quick confirmation dialogs.

<DemoBlock title="confirm-on-enter">
  <oas-button type="primary" onclick="document.querySelector('#modal-enter').setAttribute('visible','')">Open (click the body first, then press Enter)</oas-button>
  <oas-modal id="modal-enter" title="Enter confirms" confirm-on-enter onoas-ok="closeModal('modal-enter'); message.success('Confirmed with Enter')">
    <p>Click the blank content area so focus leaves the buttons, then press <code>Enter</code> — same as clicking "OK". If the dialog contains an input, Enter is never hijacked.</p>
  </oas-modal>
</DemoBlock>

## Shake feedback when close is blocked

When `oas-before-close` is blocked with `preventDefault()` (unsaved-data protection, etc.), the dialog plays a short **horizontal shake** hinting "this path cannot close"; the class is removed after the animation so it can replay.

<DemoBlock title="Shake when close is blocked">
  <oas-button onclick="document.querySelector('#modal-shake').setAttribute('visible','')">Open and try to close</oas-button>
  <oas-modal id="modal-shake" title="Protected form">
    <p>This dialog blocks cancel-type closes: clicking Cancel / ✕ / Esc shakes the dialog to signal the block — it does not close.</p>
  </oas-modal>
</DemoBlock>

## Custom close icon (close-icon slot)

`slot="close-icon"` replaces the default ✕ with rich content (the `aria-label` semantics are kept).

<DemoBlock title="close-icon slot">
  <oas-button onclick="document.querySelector('#modal-closeicon').setAttribute('visible','')">Open with a custom close icon</oas-button>
  <oas-modal id="modal-closeicon" title="Custom close icon">
    <p>The close icon at the top-right is owned by the slot (a custom-styled glyph here).</p>
    <span slot="close-icon" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--oas-color-danger); color: var(--oas-color-text-on-primary); font-size: 12px; line-height: 1;">✕</span>
  </oas-modal>
</DemoBlock>

## Options selection mode

`modal.options({ items, type })` shows an imperative dialog with an embedded option group and resolves `{ value, action }`. `type`: `radio` (single-select, `value` is a string) / `checkbox` (multi-select, array) / `toggle` (switch group, array); supports `disabled` items, async `onOk` loading, and `close()` / `update()` handles (same shape as prompt).

<DemoBlock title="options radio / checkbox / toggle">
  <oas-space>
    <oas-button type="primary" onclick="openOptionsRadio()">Radio</oas-button>
    <oas-button onclick="openOptionsCheckbox()">Checkbox</oas-button>
    <oas-button type="success" onclick="openOptionsToggle()">Toggle</oas-button>
  </oas-space>
</DemoBlock>

## Rendering strategy

`destroy-on-close` clears the content nodes on close (refill before the next open); `append-to` mounts the dialog into a target container (escaping host overflow clipping).

<DemoBlock title="destroy-on-close / append-to">
  <oas-space>
    <oas-button onclick="fillModalDestroy(); document.querySelector('#modal-destroy').setAttribute('visible','')">destroy-on-close</oas-button>
    <oas-button onclick="document.querySelector('#modal-portal').setAttribute('visible','')">append-to</oas-button>
  </oas-space>
  <oas-modal id="modal-destroy" title="Re-render" destroy-on-close>
    <p>Content is cleared on close; the button refills it before the next open.</p>
  </oas-modal>
  <oas-modal id="modal-portal" title="Mounted to body" append-to="body">
    <p>The dialog is mounted into a body-level portal, so a host with overflow:hidden cannot clip it.</p>
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

  // —— Phase-1 demos: prompt / update / event feedback ——
  window.openPrompt = () => {
    modal
      .prompt({
        title: 'Project name',
        inputValue: 'oas-ui',
        placeholder: 'Project name',
        validator: (v) => v.trim() !== '' || 'Must not be empty',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success(`Input: ${r.value}`)
        else message.info('Cancelled')
      })
  }
  window.openPromptValidated = () => {
    modal
      .prompt({
        title: 'Set nickname',
        placeholder: 'At least 4 characters',
        validator: (v) => v.length >= 4 || 'Nickname must be at least 4 characters',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success(`Nickname: ${r.value}`)
      })
  }
  window.openPromptTextarea = () => {
    modal
      .prompt({
        title: 'Feedback',
        inputType: 'textarea',
        placeholder: 'Describe your suggestion…',
        validator: (v) => v.trim().length >= 10 || 'At least 10 characters',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success('Feedback submitted')
      })
  }
  window.openPromptPassword = () => {
    modal
      .prompt({
        title: 'Set password',
        inputType: 'password',
        placeholder: '8-16 chars, letters and digits',
        inputPattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,16}$',
        inputErrorMessage: '8-16 chars including both letters and digits',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success('Password set')
      })
  }
  window.openUpdate = () => {
    const handle = modal.confirm({
      title: 'Processing…',
      content: 'Title and copy update automatically after 3 seconds.',
      onOk: () => message.success('Done'),
    })
    setTimeout(() => {
      handle.update({
        title: 'Processing complete',
        content: 'State updated — click "Done" to finish.',
        okText: 'Done',
      })
    }, 3000)
  }
  window.fillModalDestroy = () => {
    const el = document.getElementById('modal-destroy')
    if (el.children.length === 0) {
      el.innerHTML = '<p>Refilled content (from fillModalDestroy).</p>'
    }
  }

  // Close interception: OK passes through, other sources are blocked with a warning
  const guard = document.getElementById('modal-guard')
  guard.addEventListener('oas-before-close', (e) => {
    if (e.detail.source === 'ok') return
    e.preventDefault()
    message.warning('You have unsaved changes — save before closing')
  })

  // Close source: report source + action at the top-right
  const sourceModal = document.getElementById('modal-source')
  sourceModal.addEventListener('oas-close', (e) => {
    const { source, action } = e.detail
    message.info(`Close source: ${source} (action=${action})`)
  })

  // —— Phase-2 demos: animation events / shake blocking / options ——
  const animModal = document.getElementById('modal-anim')
  animModal.addEventListener('oas-opened', () => message.success('Opened (oas-opened: animation done)'))
  animModal.addEventListener('oas-closed', () => message.info('Closed (oas-closed: animation done)'))

  // Shake: block cancel-type closes (the shake feedback plays automatically)
  const shakeModal = document.getElementById('modal-shake')
  shakeModal.addEventListener('oas-before-close', (e) => {
    if (e.detail.source === 'ok') return
    e.preventDefault()
    message.warning('Unsaved changes: this path cannot close')
  })

  window.openOptionsRadio = () => {
    modal
      .options({
        title: 'Pick a priority',
        type: 'radio',
        items: [
          { label: 'Low (whenever)', value: 'low' },
          { label: 'Medium (within 24h)', value: 'medium', checked: true },
          { label: 'High (immediately)', value: 'high' },
          { label: 'Urgent (disabled)', value: 'urgent', disabled: true },
        ],
        onOk: (v) => message.success(`Priority: ${v}`),
      })
      .then((r) => {
        if (r.action === 'cancel') message.info('Cancelled')
      })
  }
  window.openOptionsCheckbox = () => {
    modal
      .options({
        title: 'Notification channels',
        type: 'checkbox',
        items: [
          { label: 'In-app', value: 'inbox', checked: true },
          { label: 'Email', value: 'mail' },
          { label: 'SMS', value: 'sms' },
        ],
        onOk: (v) => message.success(`Chosen: ${(Array.isArray(v) ? v.join(', ') : v) || 'none'}`),
      })
      .then((r) => {
        if (r.action === 'cancel') message.info('Cancelled')
      })
  }
  window.openOptionsToggle = () => {
    modal
      .options({
        title: 'Do-not-disturb windows',
        type: 'toggle',
        items: [
          { label: 'Nightly (22:00-08:00)', value: 'night' },
          { label: 'Weekends', value: 'weekend', checked: true },
        ],
        onOk: (v) => message.success(`On: ${(Array.isArray(v) ? v.join(', ') : v) || 'none'}`),
      })
      .then((r) => {
        if (r.action === 'cancel') message.info('Cancelled')
      })
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `modal.confirm({ title?, content?, okText?, cancelText?, onOk?, onCancel? })` | Opens a confirm dialog (OK / Cancel buttons), returns `{ close }` |
| `modal.info(options)` / `modal.success(options)` / `modal.warning(options)` / `modal.error(options)` | Semantic dialog: matching icon + single "OK" button, returns `{ close }` |
| `modal.prompt({ title?, inputValue?, placeholder?, inputType?, validator?, onOk? })` | Input dialog: resolves `{ value, action }`, returns a Promise & `{ close, update }` |
| `modal.options({ title?, content?, items?, type?, okText?, cancelText?, onOk? })` | Options dialog (`type`: radio / checkbox / toggle): resolves `{ value, action }` (radio → a single string; checkbox/toggle → an array), returns a Promise & `{ close, update }` |
| `destroyAllModal()` | Closes and destroys all imperative dialogs (after each close animation ends) |

- Options: `{ title?, content?, okText?, cancelText?, onOk?, onCancel? }`. `content` is plain text; when `onOk` returns a Promise the OK button enters loading (closes on resolve, stays open on reject for retry or cancel).
- Returns a `{ close() }` handle: closes the current instance programmatically without firing `onOk` / `onCancel`.
- Mounts to the nearest `oas-app` container (falls back to `body`); multiple instances stack; imperative instances unmount only after the close animation ends (`oas-closed`).

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `append-to` | — | — | — |
| `cancel-text` | Cancel button label; defaults to locale `modal.cancel` | — | — |
| `centered` | Vertically center the dialog | `boolean` | — |
| `confirm-on-enter` | — | `boolean` | — |
| `destroy-on-close` | — | `boolean` | — |
| `draggable` | Drag the dialog via its header | `boolean` | — |
| `focus-ok` | Move focus to the "OK" button on open (default: the "Cancel" button) | `boolean` | — |
| `fullscreen` | Display fullscreen: the dialog fills the viewport without radius or margin (takes precedence over width / centered / draggable) | `boolean` | — |
| `fullscreen-breakpoint` | — | — | — |
| `initial-focus` | — | — | — |
| `loading` | Put the OK button into loading state (disabled + spinner), blocking repeated confirms | `boolean` | — |
| `no-cancel` | Hide the cancel button (the footer keeps only "OK"; built into semantic variants) | `boolean` | — |
| `no-close-btn` | — | `boolean` | — |
| `no-esc-close` | — | `boolean` | — |
| `no-focus-trap` | — | `boolean` | — |
| `no-footer` | Hide footer action buttons | `boolean` | — |
| `no-mask` | — | `boolean` | — |
| `no-mask-close` | Disable closing on mask click | `boolean` | — |
| `no-scroll-lock` | — | `boolean` | — |
| `ok-text` | OK button label; defaults to locale `modal.ok` | — | — |
| `position` | — | — | — |
| `role` | — | `string` | `dialog` |
| `size` | — | `ModalSizePreset` | — |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |
| `transition` | — | — | — |
| `trigger` | — | — | — |
| `type` | Semantic variant: `info`/`success`/`warning`/`error`, renders the matching semantic icon above the content | `ModalVariant` | — |
| `visible` | Whether shown | `boolean` | — |
| `width` | Dialog width (px or percentage) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-before-close` | — |
| `oas-cancel` | Cancel: cancel button / ✕ / mask click / Esc |
| `oas-close` | — |
| `oas-closed` | — |
| `oas-ok` | Clicked "OK" |
| `oas-open` | — |
| `oas-opened` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `close-icon` | — |
| `description` | — |
| `footer` | — |
| `title` | Rich title content slot; overrides the title attribute text when present |

`role="dialog"` + `aria-modal="true"`; focus moves to the "Cancel" button on open (to the "OK" button with `focus-ok`) and is restored on close.
