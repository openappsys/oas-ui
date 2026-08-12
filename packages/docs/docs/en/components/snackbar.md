# Snackbar

A lightweight feedback bar that slides in from the bottom (or top). The `open` attribute is controlled; it can include an action button and dispatches `oas-close` after 4 seconds by default, leaving dismissal to the host.

## Basic usage

<DemoBlock title="Controlled open">
  <oas-space>
    <oas-button type="primary" onclick="openSnackbar('Message sent')">Open</oas-button>
  </oas-space>
  <oas-snackbar id="snackbar-basic" message="Message sent" onoas-close="closeSnackbar()"></oas-snackbar>
</DemoBlock>

## Action buttons

<DemoBlock title="Action buttons">
  <oas-space>
    <oas-button type="primary" onclick="openSnackbar('File deleted', 'Undo')">Open (with undo)</oas-button>
  </oas-space>
  <oas-snackbar id="snackbar-action" message="File deleted" action-text="Undo" onoas-action="closeSnackbar(); toast.info({ title: 'Delete undone' })" onoas-close="closeSnackbar()"></oas-snackbar>
</DemoBlock>

## Direction & offset

<DemoBlock title="Direction & offset">
  <oas-space>
    <oas-button onclick="showSnackbar('bottom')">Bottom (default)</oas-button>
    <oas-button onclick="showSnackbar('top')">Top</oas-button>
    <oas-button onclick="showSnackbar('bottom', 80)">Bottom + offset 80</oas-button>
  </oas-space>
</DemoBlock>

## Stack limit

<DemoBlock title="Stack limit 3">
  <oas-space>
    <oas-button onclick="for (let i = 1; i <= 4; i++) openSnackbar('Message ' + i, undefined, i)">Fire four</oas-button>
  </oas-space>
  <p>At most 3 snackbars are shown at once; when a 4th appears, the oldest one receives <code>oas-close</code>.</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  window.closeSnackbar = () => {
    document.querySelectorAll('oas-snackbar').forEach((el) => el.removeAttribute('open'))
  }
  window.openSnackbar = (message, actionText, seq = 0) => {
    const id = seq ? `sb-${seq}` : 'snackbar-tmp'
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement('oas-snackbar')
      el.id = id
      if (actionText) el.setAttribute('action-text', actionText)
      el.addEventListener('oas-close', () => el.removeAttribute('open'))
      document.body.appendChild(el)
    }
    el.setAttribute('message', message)
    el.setAttribute('open', '')
  }
  window.showSnackbar = (direction, offset) => {
    const el = document.getElementById('snackbar-tmp') || (() => {
      const e = document.createElement('oas-snackbar')
      e.id = 'snackbar-tmp'
      e.addEventListener('oas-close', () => e.removeAttribute('open'))
      document.body.appendChild(e)
      return e
    })()
    el.setAttribute('direction', direction)
    if (offset) el.setAttribute('offset', String(offset))
    el.setAttribute('message', direction === 'top' ? 'Top message bar' : offset ? 'Bottom offset 80px' : 'Bottom message bar')
    el.setAttribute('open', '')
  }
})
</script>

## API

### Attributes

| Attribute     | Description                      | Type      | Default |
| ------------- | -------------------------------- | --------- | ------- |
| `action-text` | Action button text               | `string`  | —       |
| `direction`   | Position direction               | —         | —       |
| `duration`    | Auto-dismiss duration (ms)       | `string`  | `4000`  |
| `message`     | Message text                     | `string`  | —       |
| `offset`      | Offset from the screen edge (px) | `string`  | `24`    |
| `open`        | Whether shown (controlled)       | `boolean` | —       |

### Events

| Event        | Description                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------- |
| `oas-action` | Dispatched when the action button is clicked                                                 |
| `oas-close`  | Dispatched when auto-dismissing after timeout (controlled mode does not clear `open` itself) |
| `oas-open`   | Dispatched when opened                                                                       |

- `role="status"` without `action-text`; `role="alertdialog"` + `aria-live="assertive"` when an action button is present.
- `open` is controlled: only `oas-close` is dispatched on timeout and the host is responsible for removing `open`; at most 3 stack at once, and the oldest receives `oas-close` when exceeded.
