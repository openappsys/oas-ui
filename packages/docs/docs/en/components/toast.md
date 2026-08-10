# Toast

Imperative global toasts supporting success/error/warning/info/loading states, action buttons, and promise chains; auto-dismisses after 3 seconds by default.

## Basic usage

<DemoBlock title="Five types">
  <oas-space>
    <oas-button type="success" onclick="toast.success({ title: 'Saved successfully' })">Success</oas-button>
    <oas-button type="danger" onclick="toast.error({ title: 'Network error' })">Error</oas-button>
    <oas-button type="warning" onclick="toast.warning({ title: 'Please pay attention' })">Warning</oas-button>
    <oas-button onclick="toast.info({ title: 'This is a message' })">Info</oas-button>
    <oas-button onclick="toast.loading({ title: 'Processing…' })">Loading</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Auto closes after 2s', duration: 2000 })">2s</oas-button>
    <oas-button onclick="toast.success({ title: 'Auto closes after 5s', duration: 5000 })">5s</oas-button>
    <oas-button onclick="window.toastHandle = toast.warning({ title: 'Stays open until closed manually', duration: 0 })">No auto-close (0)</oas-button>
    <oas-button onclick="window.toastHandle && window.toastHandle.close()">Close manually</oas-button>
  </oas-space>
</DemoBlock>

## Action buttons

<DemoBlock title="Action buttons">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Delete undone', action: { label: 'Redo', onClick: () => toast.success({ title: 'Redone' }) } })">With action button</oas-button>
    <oas-button onclick="toast.info({ title: 'Not closable', closable: false, duration: 0 })">Not closable</oas-button>
  </oas-space>
</DemoBlock>

## Position

<DemoBlock title="Position">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Top right (default)' })">top-right</oas-button>
    <oas-button onclick="toast.info({ title: 'Top left', position: 'top-left' })">top-left</oas-button>
    <oas-button onclick="toast.info({ title: 'Top center', position: 'top-center' })">top-center</oas-button>
    <oas-button onclick="toast.info({ title: 'Bottom center', position: 'bottom-center' })">bottom-center</oas-button>
  </oas-space>
</DemoBlock>

## Promise chain

<DemoBlock title="Promise chain">
  <oas-space>
    <oas-button onclick="runPromise(true)">Simulate success</oas-button>
    <oas-button onclick="runPromise(false)">Simulate failure</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast, destroyAllToast } = await import('@oas-ui/ui')
  window.toast = toast
  window.destroyAllToast = destroyAllToast
  window.runPromise = (ok) => {
    toast.promise(
      new Promise((resolve, reject) => setTimeout(() => (ok ? resolve('data') : reject(new Error('Request failed'))), 1500)),
      {
        loading: 'Requesting…',
        success: (data) => `Success: ${data}`,
        error: (err) => err.message,
      },
    )
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `toast.info(options)` | Info toast, returns `{ close }` |
| `toast.success(options)` | Success toast, returns `{ close }` |
| `toast.warning(options)` | Warning toast, returns `{ close }` |
| `toast.error(options)` | Error toast, returns `{ close }` |
| `toast.loading(options)` | Loading toast (not closable), returns `{ close }` |
| `toast.promise(promise, opts)` | Promise chain: loading → success/error |
| `destroyAllToast()` | Clear all toasts |

### options

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| `title` | Title | `string` | — |
| `description` | Description | `string` | — |
| `action` | Action button | `{ label, onClick }` | — |
| `duration` | Auto-dismiss duration (ms); 0 keeps it open | `number` | `3000` |
| `closable` | Whether it can be closed manually (loading is always unclosable) | `boolean` | `true` |
| `position` | Position | 6 directions such as `top-right` | `top-right` |

- `error` uses `role="alert"`, others use `role="status"`.
- Multiple toasts share one stack container and stack by position per direction; `duration` timers are cleaned up on close/unmount with no leaks.
