# Snackbar

A lightweight feedback bar anchored to the bottom (or top) center. The `open` attribute is controlled; multiple bars stack vertically automatically (up to 3 per direction); the timer pauses on hover/focus/hidden tab and resumes with the remaining time; `oas-close` carries `detail.reason` (`timeout` / `escape` / `close` / `swipe` / `evict` / `group`) and the host is responsible for removing `open`.

## Basic usage

<DemoBlock title="Controlled open">
  <oas-space>
    <oas-button type="primary" onclick="sbShow({ id: 'sb-basic', message: 'Message sent', closable: '' })">Open</oas-button>
  </oas-space>
  <p class="sb-event-log">Latest event: <code id="sb-log">—</code></p>
</DemoBlock>

`closable` shows a close button (recommended whenever `duration="0"`); pressing Esc dismisses — the focused snackbar when focus is inside one, otherwise the oldest.

## Action buttons

<DemoBlock title="Action button (undo)">
  <oas-space>
    <oas-button type="primary" onclick="sbShow({ id: 'sb-action', message: 'File deleted', actionText: 'Undo', closable: '' })">Open (with undo)</oas-button>
  </oas-space>
</DemoBlock>

## Rich content slot

<DemoBlock title="Default slot overrides the message attribute">
  <oas-space>
    <oas-button onclick="sbOpen('sb-slot')">Open rich content</oas-button>
  </oas-space>
  <oas-snackbar id="sb-slot" duration="0" closable onoas-close="sbClose(this)"><strong>Photo uploaded</strong> — <a href="javascript:void(0)">view album</a></oas-snackbar>
</DemoBlock>

Slotted content supports icons, links and emphasis; when present, the `message` attribute is not rendered (nor merged by grouping).

## Direction & offset

<DemoBlock title="Direction & offset">
  <oas-space>
    <oas-button onclick="sbShow({ id: 'sb-dir', message: 'Bottom message bar' })">Bottom (default)</oas-button>
    <oas-button onclick="sbShow({ id: 'sb-dir', message: 'Top message bar', direction: 'top' })">Top</oas-button>
    <oas-button onclick="sbShow({ id: 'sb-dir', message: 'Bottom offset 80px', offset: '80' })">Bottom + offset 80</oas-button>
  </oas-space>
</DemoBlock>

## Stacking & queueing

<DemoBlock title="Stack / queue">
  <oas-space>
    <oas-button onclick="sbFireFour()">Fire four (evict oldest)</oas-button>
    <oas-button onclick="sbQueue()">Fire four (queued, one by one)</oas-button>
  </oas-space>
  <p class="sb-event-log">Latest event: <code id="sb-log-2">—</code></p>
</DemoBlock>

Multiple bars in the same direction stack vertically without overlapping, newest closest to the screen edge; by default exceeding the limit (3) evicts the oldest (`reason: evict`). With `queue`, overflow bars wait and fill slots as earlier ones close (`oas-open` fires only when actually shown).

## Timer pause & progress

<DemoBlock title="hover/focus pause + timing progress bar">
  <oas-space>
    <oas-button onclick="sbShow({ id: 'sb-progress', message: 'Hover me to pause the timer', duration: '6000', progress: '', closable: '' })">Open (6s + progress)</oas-button>
  </oas-space>
</DemoBlock>

The timer pauses on hover, focus (Tab to the action/close button) or switching browser tabs, then resumes with the **remaining** time (full duration is not reset); the progress bar freezes while paused. `no-pause` disables all automatic pausing.

## Same-content grouping

<DemoBlock title="group merging + count badge">
  <oas-space>
    <oas-button onclick="sbGroupHit()">Click save twice</oas-button>
  </oas-space>
</DemoBlock>

With `group` set, a new message with the same group and text does not open another bar — it merges into the existing one, shows a `×n` badge and resets its timer (the merged element receives `oas-close` with `reason: group`).

## Swipe dismiss & persistent

<DemoBlock title="Swipe dismiss (touch) / persistent bar">
  <oas-space>
    <oas-button onclick="sbShow({ id: 'sb-swipe', message: 'Swipe vertically to dismiss on touch', duration: '0', swipe: '', closable: '' })">Open persistent bar</oas-button>
  </oas-space>
</DemoBlock>

`swipe` enables vertical swipe-to-dismiss (release beyond the threshold throws the bar away, `reason: swipe`); `duration="0"` keeps the bar open — always provide a dismissal path (`closable` or an action button).

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  let sbSeq = 0
  window.sbLog = (msg) => {
    for (const id of ['sb-log', 'sb-log-2']) {
      const el = document.getElementById(id)
      if (el) el.textContent = msg
    }
  }
  window.sbClose = (el) => el.removeAttribute('open')
  window.sbOpen = (id) => {
    document.getElementById(id)?.setAttribute('open', '')
  }
  window.sbShow = (opts = {}) => {
    const { message, id, fresh = false, actionText, ...attrs } = opts
    let el
    let targetId = id
    if (!targetId || fresh) targetId = `sb-${++sbSeq}`
    el = document.getElementById(targetId)
    if (!el) {
      el = document.createElement('oas-snackbar')
      el.id = targetId
      el.addEventListener('oas-action', () => {
        el.removeAttribute('open')
        toast.info({ title: 'Delete undone' })
      })
      el.addEventListener('oas-close', (e) => {
        el.removeAttribute('open')
        const reason = e.detail && e.detail.reason ? ` (reason: ${e.detail.reason})` : ''
        window.sbLog(`${el.getAttribute('message') || 'Snackbar'} received oas-close${reason}`)
      })
      document.body.appendChild(el)
    }
    el.setAttribute('message', message ?? '')
    if (actionText) el.setAttribute('action-text', actionText)
    else el.removeAttribute('action-text')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.setAttribute('open', '')
  }
  window.sbFireFour = () => {
    for (let i = 1; i <= 4; i++) {
      setTimeout(() => window.sbShow({ message: `Message ${i}` }), i * 150)
    }
  }
  window.sbQueue = () => {
    for (let i = 1; i <= 4; i++) {
      setTimeout(() => window.sbShow({ message: `Queued message ${i}`, queue: '' }), i * 100)
    }
  }
  window.sbGroupHit = () => {
    window.sbShow({ message: 'Saved', group: 'save', duration: '6000', fresh: true })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `action-text` | Action button text | `string` | — |
| `closable` | — | `boolean` | — |
| `direction` | Position direction | — | — |
| `duration` | Auto-dismiss duration (ms) | `string` | `4000` |
| `group` | — | `string` | — |
| `message` | Message text | `string` | — |
| `no-pause` | — | `boolean` | — |
| `offset` | Offset from the screen edge (px) | `string` | `24` |
| `open` | Whether shown (controlled) | `boolean` | — |
| `progress` | — | `boolean` | — |
| `queue` | — | `boolean` | — |
| `swipe` | — | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-action` | Dispatched when the action button is clicked |
| `oas-close` | Dispatched when auto-dismissing after timeout (controlled mode does not clear `open` itself), `detail: { reason }` |
| `oas-open` | Dispatched when opened |

### Slots

| Name | Description |
| --- | --- |
| default | — |

- `open` is controlled: only `oas-close` is dispatched on timeout and the host removes `open`; reusing one instance with a changed `message` does not restart the timer — close it first or create a new element.
- At most 3 bars stack per direction (vertical, no overlap, newest at the edge); the oldest receives `oas-close` (`reason: evict`) when exceeded; `queue` switches to FIFO backfilling.
- Accessibility: always `role="status"` + `aria-live="polite"` + `aria-atomic="true"` (feedback bars never use assertive announcements); only the newest bar's buttons join the tab order while stacked (others are `inert`); the component never steals focus.
