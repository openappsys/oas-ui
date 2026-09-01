# Popconfirm

Shows a confirmation bubble next to the trigger element, commonly used before destructive actions like deletion. Built on the floating positioning engine: 12 placements + overflow auto-flip + pointing arrow + fixed positioning (never clipped by containers).

## Basic usage

Click the trigger to open the bubble; OK / cancel / Esc / clicking outside all close it and emit the matching event (`oas-ok` / `oas-cancel`, detail carries `source` and the native `event`).

<DemoBlock title="Basic usage">
  <oas-popconfirm id="pc-basic" title="Delete this record?" description="This cannot be undone.">
    <oas-button type="danger">Delete</oas-button>
  </oas-popconfirm>
</DemoBlock>

## Controlled visibility

The `open` attribute is controlled; visibility changes emit `oas-open-change` whose `detail.reason` tells the source (`trigger` / `ok` / `cancel` / `esc` / `outside` / `api`).

<DemoBlock title="Controlled visibility (oas-open-change)">
  <oas-space size="small" align="center">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); pcCtrl(true)">Open confirm</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); pcCtrl(false)">Close</oas-button>
    <oas-tag id="pc-status" type="info">closed</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-ctrl" title="Delete this record?">
    <oas-button type="danger">Delete</oas-button>
  </oas-popconfirm>
</DemoBlock>

## Async confirmation

Listen to `oas-ok`, set `ok-loading` synchronously (the OK button spins and auto-close is held), then remove the attribute and close after the request finishes. While loading, clicking OK emits nothing (no double submits).

<DemoBlock title="Async confirmation (ok-loading)">
  <oas-popconfirm id="pc-async" title="Archive this order after submitting?" ok-text="Submit">
    <oas-button type="primary">Archive order</oas-button>
  </oas-popconfirm>
</DemoBlock>

## Semantic themes

`theme` has three states: `default` / `warning` / `danger` — driving the default icon, icon color and the OK button tone, one step for dangerous deletes.

<DemoBlock title="Semantic themes">
  <oas-space size="small">
    <oas-popconfirm title="Sync all configs to production?">
      <oas-button size="small">default</oas-button>
    </oas-popconfirm>
    <oas-popconfirm theme="warning" title="This takes a long time. Continue?">
      <oas-button size="small" type="warning">warning</oas-button>
    </oas-popconfirm>
    <oas-popconfirm theme="danger" title="Empty the trash?" description="All items become unrecoverable.">
      <oas-button size="small" type="danger">danger</oas-button>
    </oas-popconfirm>
  </oas-space>
</DemoBlock>

## Texts and icon

`ok-text` / `cancel-text` customize button labels (empty falls back to locale); `description` is the secondary line (attribute and `slot="description"` dual channel); `hide-icon` removes the icon; the `icon` slot replaces the default one; `show-cancel="false"` gives a single-button confirm.

<DemoBlock title="Texts and icon">
  <oas-space size="small">
    <oas-popconfirm title="Remove this member?" description="They will lose access to the project." ok-text="Remove" cancel-text="Wait">
      <oas-button size="small">Custom texts</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="All changes saved." ok-text="Got it" show-cancel="false">
      <oas-button size="small">Single button</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="Clear the browser cache?" hide-icon ok-text="Clear">
      <oas-button size="small">No icon</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="Subscribe to release notes?">
      <span slot="icon" style="font-size: 16px; color: var(--oas-color-primary)">✉</span>
      <oas-button size="small">Custom icon</oas-button>
    </oas-popconfirm>
  </oas-space>
</DemoBlock>

## Twelve placements

`placement` supports 12 directions; when space runs out the bubble flips along the main axis (disable via `auto-adjust-overflow="false"`). Legacy `position` values remain compatible.

<DemoBlock title="Twelve placements">
  <oas-space direction="vertical" size="large" align="center" style="width: 100%; padding: 16px 0">
    <div style="display: flex; justify-content: center; gap: 12px">
      <oas-popconfirm title="Top start" placement="top-start"><oas-button size="small">top-start</oas-button></oas-popconfirm>
      <oas-popconfirm title="Top center" placement="top"><oas-button size="small">top</oas-button></oas-popconfirm>
      <oas-popconfirm title="Top end" placement="top-end"><oas-button size="small">top-end</oas-button></oas-popconfirm>
    </div>
    <div style="display: flex; justify-content: space-between; width: 100%; padding: 0 64px">
      <oas-space direction="vertical" size="small">
        <oas-popconfirm title="Left start" placement="left-start"><oas-button size="small">left-start</oas-button></oas-popconfirm>
        <oas-popconfirm title="Left center" placement="left"><oas-button size="small">left</oas-button></oas-popconfirm>
        <oas-popconfirm title="Left end" placement="left-end"><oas-button size="small">left-end</oas-button></oas-popconfirm>
      </oas-space>
      <oas-space direction="vertical" size="small">
        <oas-popconfirm title="Right start" placement="right-start"><oas-button size="small">right-start</oas-button></oas-popconfirm>
        <oas-popconfirm title="Right center" placement="right"><oas-button size="small">right</oas-button></oas-popconfirm>
        <oas-popconfirm title="Right end" placement="right-end"><oas-button size="small">right-end</oas-button></oas-popconfirm>
      </oas-space>
    </div>
    <div style="display: flex; justify-content: center; gap: 12px">
      <oas-popconfirm title="Bottom start" placement="bottom-start"><oas-button size="small">bottom-start</oas-button></oas-popconfirm>
      <oas-popconfirm title="Bottom center" placement="bottom"><oas-button size="small">bottom</oas-button></oas-popconfirm>
      <oas-popconfirm title="Bottom end" placement="bottom-end"><oas-button size="small">bottom-end</oas-button></oas-popconfirm>
    </div>
  </oas-space>
</DemoBlock>

## Triggers and disabled

`trigger` accepts a space-separated multi-select (`click` / `hover` / `focus` / `contextmenu` / `manual`, default `click`); `disabled` suppresses the bubble (visually dimmed). Keyboard friendly: focus moves into the bubble on open (OK button first), returns to the trigger on close, and Esc closes the topmost bubble.

<DemoBlock title="Triggers and disabled">
  <oas-space size="small">
    <oas-popconfirm title="Hover trigger" trigger="hover">
      <oas-button size="small">hover</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="Focus trigger" trigger="focus">
      <oas-button size="small">focus</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="Contextmenu trigger" trigger="contextmenu">
      <oas-button size="small">contextmenu</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="Disabled" disabled>
      <oas-button size="small">disabled</oas-button>
    </oas-popconfirm>
  </oas-space>
</DemoBlock>

## Custom actions

Content in `slot="actions"` replaces the built-in button row; combine with the `show()` / `hide()` methods to express confirm semantics (`oas-open-change` reports `reason: api`).

<DemoBlock title="Custom actions (actions slot)">
  <oas-popconfirm id="pc-actions" title="Move this project to archive?">
    <oas-button>Archive project</oas-button>
    <div slot="actions" style="display: flex; justify-content: flex-end; gap: 8px">
      <oas-button size="small" onclick="pcArchiveSkip(event)">Skip</oas-button>
      <oas-button size="small" type="primary" onclick="pcArchiveDo(event)">Archive</oas-button>
    </div>
  </oas-popconfirm>
</DemoBlock>

## Virtual anchor

`virtual` mode anchors the bubble at coordinates (`virtual-x` / `virtual-y`) or an element (`virtual-anchor`); opening and closing are fully host-controlled (outside clicks are ignored).

<DemoBlock title="Virtual anchor">
  <oas-space size="small" align="center">
    <oas-button size="small" onclick="pcVirtualToggle(event)">Pop at the marker</oas-button>
    <oas-tag id="pc-anchor" type="warning">Anchor</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-virtual" virtual virtual-anchor="#pc-anchor" title="Bubble anchored at a virtual anchor" trigger="manual">
  </oas-popconfirm>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  // Controlled visibility: sync the tag via oas-open-change (reason tells the source)
  const pc = document.getElementById('pc-ctrl')
  const status = document.getElementById('pc-status')
  if (pc && status) {
    pc.addEventListener('oas-open-change', (e) => {
      const { open, reason } = e.detail
      status.textContent = open ? `opened (${reason})` : `closed (${reason})`
    })
  }
  window.pcCtrl = (open) => {
    if (open) pc.setAttribute('open', '')
    else pc.removeAttribute('open')
  }

  // Async confirmation: oas-ok -> set ok-loading synchronously (holds auto-close) -> close when done
  const pcAsync = document.getElementById('pc-async')
  if (pcAsync) {
    pcAsync.addEventListener('oas-ok', () => {
      pcAsync.setAttribute('ok-loading', '')
      message.loading('Submitting…')
      setTimeout(() => {
        pcAsync.removeAttribute('ok-loading')
        pcAsync.removeAttribute('open')
        message.success('Archived')
      }, 1500)
    })
  }

  // Custom actions: actions slot buttons + hide() method
  const actions = document.getElementById('pc-actions')
  window.pcArchiveSkip = (e) => {
    e.stopPropagation()
    actions?.hide()
    message.info('Skipped')
  }
  window.pcArchiveDo = (e) => {
    e.stopPropagation()
    actions?.hide()
    message.success('Archived')
  }

  // Virtual anchor: host-controlled toggle
  const virtual = document.getElementById('pc-virtual')
  window.pcVirtualToggle = (e) => {
    e.stopPropagation()
    if (virtual?.hasAttribute('open')) virtual.removeAttribute('open')
    else virtual?.setAttribute('open', '')
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `arrow` | — | `string` | `true` |
| `auto-adjust-overflow` | — | `string` | `true` |
| `cancel-text` | — | `string` | — |
| `description` | — | `string` | — |
| `disabled` | — | `boolean` | — |
| `hide-icon` | — | `boolean` | — |
| `ok-loading` | — | `boolean` | — |
| `ok-text` | — | `string` | — |
| `open` | Whether the bubble is shown | `boolean` | — |
| `placement` | — | `string` | — |
| `position` | Bubble position | `string` | — |
| `show-cancel` | — | `string` | `true` |
| `theme` | — | `string` | `default` |
| `title` | Confirmation text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |
| `trigger` | — | `string` | `click` |
| `virtual` | — | `boolean` | — |
| `virtual-anchor` | — | — | — |
| `virtual-x` | — | — | — |
| `virtual-y` | — | — | — |
| `width` | — | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-cancel` | Cancel: cancel button / Esc / outside click, `detail: { source: this, event: e }` |
| `oas-ok` | Clicked "OK"; the bubble then collapses automatically, `detail: { source: this, event: e }` |
| `oas-open-change` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `actions` | — |
| `description` | — |
| `icon` | — |
| `title` | Rich title content slot; overrides the title attribute text when present |

### Methods

| Method | Description |
| --- | --- |
| `show()` | Opens the bubble (equivalent to the `open` attribute; `oas-open-change` reports `reason: api`) |
| `hide()` | Closes the bubble (equivalent to removing `open`; `oas-open-change` reports `reason: api`) |
| `restoreFocus()` | Restores focus to the trigger element |

The panel uses `role="alertdialog"`; focus moves into the bubble on open (OK button first) and returns to the trigger on close; the trigger keeps `aria-expanded` / `aria-controls` in sync; Esc closes the topmost bubble (layer by layer when nested).
