# Toast

Imperative global toasts supporting success/error/warning/info/loading states, action buttons, promise chains, queue governance, and keyboard/screen-reader accessibility; auto-dismisses after 3 seconds by default.

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

<DemoBlock title="Action buttons (multiple + noDismiss + variants)">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Delete undone', action: { label: 'Redo', onClick: () => toast.success({ title: 'Redone' }) } })">Single action</oas-button>
    <oas-button onclick="toast.warning({ title: 'Issue detected', actions: [ { label: 'View details', variant: 'danger', onClick: () => toast.info({ title: 'Opening details' }) }, { label: 'Ignore', noDismiss: true, onClick: () => toast.info({ title: 'Ignored, toast stays' }) } ] })">Multiple + noDismiss</oas-button>
    <oas-button onclick="toast.info({ title: 'Not closable', closable: false, duration: 0 })">Not closable</oas-button>
  </oas-space>
</DemoBlock>

## Position

<DemoBlock title="Position (9 directions)">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Top right (default)' })">top-right</oas-button>
    <oas-button onclick="toast.info({ title: 'Top left', position: 'top-left' })">top-left</oas-button>
    <oas-button onclick="toast.info({ title: 'Top center', position: 'top-center' })">top-center</oas-button>
    <oas-button onclick="toast.info({ title: 'Middle left', position: 'left' })">left</oas-button>
    <oas-button onclick="toast.info({ title: 'Center', position: 'center' })">center</oas-button>
    <oas-button onclick="toast.info({ title: 'Middle right', position: 'right' })">right</oas-button>
    <oas-button onclick="toast.info({ title: 'Bottom center', position: 'bottom-center' })">bottom-center</oas-button>
    <oas-button onclick="toast.info({ title: 'Bottom left', position: 'bottom-left' })">bottom-left</oas-button>
    <oas-button onclick="toast.info({ title: 'Bottom right', position: 'bottom-right' })">bottom-right</oas-button>
  </oas-space>
</DemoBlock>

## Promise chain

<DemoBlock title="Promise chain">
  <oas-space>
    <oas-button onclick="runPromise(true)">Simulate success</oas-button>
    <oas-button onclick="runPromise(false)">Simulate failure</oas-button>
  </oas-space>
</DemoBlock>

## Lifecycle and onClose

<DemoBlock title="Lifecycle and onClose callback">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Auto-closing toast', duration: 2000, onClose: () => flash('onClose fired: toast auto-closed') })">onClose (auto)</oas-button>
    <oas-button onclick="window.lifecycleHandle = toast.info({ title: 'Manually closed toast', duration: 0, onClose: () => flash('onClose fired: toast closed manually') })">onClose (manual)</oas-button>
    <oas-button onclick="window.lifecycleHandle && window.lifecycleHandle.close()">Trigger close</oas-button>
  </oas-space>
  <p class="toast-demo-feedback" id="lifecycle-feedback"></p>
</DemoBlock>

## Update and dismiss by id

<DemoBlock title="Update and dismiss by id">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Uploading…', id: 'upload', duration: 0 })">Start upload</oas-button>
    <oas-button onclick="toast.update('upload', { title: 'Uploading 50%' })">Update progress</oas-button>
    <oas-button onclick="toast.update('upload', { title: 'Upload complete', type: 'success', duration: 2000 })">Complete</oas-button>
    <oas-button onclick="toast.dismiss('upload')">Close</oas-button>
  </oas-space>
</DemoBlock>

## Notification storm governance

<DemoBlock title="Max queue and content grouping">
  <oas-space>
    <oas-button onclick="window.storm = (window.storm || 0) + 1; toast.info({ title: 'Notification ' + window.storm, id: 'storm-' + window.storm, duration: 0, max: 3 })">Click repeatedly (max=3 queue)</oas-button>
    <oas-button onclick="window.stormClose = (window.stormClose || 0) + 1; toast.dismiss('storm-' + window.stormClose)">Close #N (fill in)</oas-button>
    <oas-button onclick="toast.info({ title: 'Saved successfully', grouping: true, duration: 0 })">Same content (grouped count)</oas-button>
    <oas-button onclick="destroyAllToast()">Clear all</oas-button>
  </oas-space>
  <p class="toast-demo-tip">Beyond 3 visible toasts, extras queue and fill in after one closes; `priority` lets a high-priority toast preempt a visible slot.</p>
</DemoBlock>

## Reading grace

<DemoBlock title="Hover/focus pause + remaining-time progress">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Hover/focus pauses the countdown', description: 'Hovering or focusing pauses the timer; the progress bar freezes in sync', duration: 5000, showProgress: true })">Pause timer + progress</oas-button>
    <oas-button onclick="toast.info({ title: 'Progress ring close button', duration: 5000, progressRing: true })">Progress ring</oas-button>
    <oas-button onclick="toast.info({ title: 'Top progress bar', duration: 4000, showProgress: true, progressPosition: 'top' })">Top progress</oas-button>
  </oas-space>
  <p class="toast-demo-tip">Window blur (switching tabs/windows) also pauses; disable individually with `pauseOnHover`/`pauseOnFocus`/`pauseOnWindowBlur`.</p>
</DemoBlock>

## Keyboard and screen reader

<DemoBlock title="Esc close and screen-reader politeness">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Press Esc to close', description: 'Click, then Tab to focus the close button and press Esc to dismiss this toast', duration: 0 })">Esc close</oas-button>
    <oas-button onclick="toast.info({ title: 'Background task done (polite)', politeness: 'polite', duration: 3000 })">polite live</oas-button>
    <oas-button onclick="toast.error({ title: 'Action failed (assertive)', politeness: 'assertive', duration: 3000 })">assertive live</oas-button>
  </oas-space>
</DemoBlock>

## Swipe to dismiss

<DemoBlock title="Swipe to dismiss">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Drag to dismiss', description: 'Press and drag left/right past the threshold to dismiss', duration: 0, swipeDirection: 'both' })">Both directions</oas-button>
    <oas-button onclick="toast.info({ title: 'Left swipe only', duration: 0, swipeDirection: 'left' })">Left only</oas-button>
  </oas-space>
</DemoBlock>

## Collapsed stacking

<DemoBlock title="Collapsed stacking (+N fold / peek)">
  <oas-space>
    <oas-button onclick="window.stackN = (window.stackN || 0) + 1; toast.info({ title: 'Stack notification ' + window.stackN, duration: 4000, stacked: true })">Trigger repeatedly (fold)</oas-button>
  </oas-space>
  <p class="toast-demo-tip">The newest toast stays fully visible while the rest peek behind with a +N badge; hover/focus expands them, clicking +N keeps them expanded.</p>
</DemoBlock>

## Variants and animation

<DemoBlock title="Variants (plain/translucent) and animation config">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Solid default' })">solid</oas-button>
    <oas-button onclick="toast.info({ title: 'Plain (no fill)', variant: 'plain' })">plain</oas-button>
    <oas-button onclick="toast.info({ title: 'Translucent glass', variant: 'translucent' })">translucent</oas-button>
    <oas-button onclick="setAnim('0.6s', 'cubic-bezier(0.34, 1.56, 0.64, 1)')">Springy slow animation</oas-button>
    <oas-button onclick="setAnim('0.2s', 'ease')">Restore default animation</oas-button>
  </oas-space>
  <p class="toast-demo-tip">Animation duration/easing go through CSS variables `--oas-toast-enter-duration` / `--oas-toast-leave-duration` / `--oas-toast-ease`, no JS config needed.</p>
</DemoBlock>

## Global default config

<DemoBlock title="Global default config (toast.config)">
  <oas-space>
    <oas-button onclick="toast.config({ duration: 6000, position: 'bottom-center' }); toast.info({ title: 'Default 6s + bottom center' })">Apply global defaults</oas-button>
    <oas-button onclick="toast.config({ duration: 3000, position: 'top-right' }); toast.info({ title: 'Defaults restored' })">Restore defaults</oas-button>
  </oas-space>
</DemoBlock>

## Mount point and named instances

<DemoBlock title="Mount point and named toaster instances">
  <oas-space>
    <oas-button onclick="toast.info({ title: 'Mount into a custom container', description: 'DOM attaches inside the container below', container: document.querySelector('.toast-host-box') })">Custom container</oas-button>
    <oas-button onclick="toast.toaster('console').info({ title: 'console named instance', position: 'bottom-center' })">console instance</oas-button>
    <oas-button onclick="toast.toaster('console').destroyAll()">Clear console instance</oas-button>
  </oas-space>
  <div class="toast-host-box"></div>
</DemoBlock>

## Declarative usage

<DemoBlock title="Declarative usage (controlled open)">
  <oas-space direction="vertical">
    <oas-toast class="declarative-toast" open type="info" title="Declarative toast" description="Use the oas-toast element directly in templates; the open attribute controls visibility, duration=0 keeps it open" duration="0" closable></oas-toast>
    <oas-button onclick="toggleDeclarative()">Toggle visibility (open)</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast, destroyAllToast } = await import('@oas-ui/ui')
  window.toast = toast
  window.destroyAllToast = destroyAllToast
  window.flash = (msg) => {
    const el = document.getElementById('lifecycle-feedback')
    if (el) el.textContent = msg
  }
  window.setAnim = (duration, ease) => {
    document.documentElement.style.setProperty('--oas-toast-enter-duration', duration)
    document.documentElement.style.setProperty('--oas-toast-leave-duration', duration)
    document.documentElement.style.setProperty('--oas-toast-ease', ease)
    toast.info({ title: `Animation duration ${duration}` })
  }
  window.toggleDeclarative = () => {
    const t = document.querySelector('.declarative-toast')
    if (t) t.setAttribute('open', t.getAttribute('open') === 'false' ? 'true' : 'false')
  }
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

<style scoped>
.toast-demo-feedback {
  margin-top: var(--oas-space-3);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  min-height: 24px;
}
.toast-demo-tip {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.toast-host-box {
  margin-top: var(--oas-space-3);
  min-height: 48px;
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-md);
}
</style>

## API

### Methods

| Method | Description |
| --- | --- |
| `toast.info(options)` | Info toast, returns `{ close, update }` |
| `toast.success(options)` | Success toast, returns `{ close, update }` |
| `toast.warning(options)` | Warning toast, returns `{ close, update }` |
| `toast.error(options)` | Error toast, returns `{ close, update }` |
| `toast.loading(options)` | Loading toast (not closable), returns `{ close, update }` |
| `toast.promise(promise, opts)` | Promise chain: loading → success/error |
| `toast.update(id, options)` | Update a toast in place by id; creates one if missing |
| `toast.dismiss(id)` | Close a toast by id (visible or queued) |
| `toast.config(options)` | Global default config (per-call wins) |
| `toast.toaster(name)` | Named instance: isolated stacks/queues/config |
| `destroyAllToast()` | Clear all instances |

### options

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| `title` | Title (string or Node) | `string \| Node` | — |
| `description` | Description | `string` | — |
| `action` / `actions` | Action buttons (multiple + noDismiss + variant) | `ToastAction \| ToastAction[]` | — |
| `duration` | Auto-dismiss duration (ms); 0 keeps it open | `number` | `3000` |
| `closable` | Whether it can be closed manually (loading is always unclosable) | `boolean` | `true` |
| `position` | Position (9 directions) | `ToastPosition` | `top-right` |
| `id` | Unique id for `update` / `dismiss` | `string` | — |
| `onClose` | Close callback (auto/manual/button/dismiss/destroyAll each fire once) | `() => void` | — |
| `priority` | Priority: with the max queue, higher preempts a visible slot | `number` | `0` |
| `max` | Max visible toasts in the position stack; extras queue | `number` | `Infinity` |
| `politeness` | Screen-reader sensitivity: `assertive` / `polite` | `string` | by type |
| `showProgress` | Remaining-time progress bar (shown when duration>0) | `boolean` | `false` |
| `progressRing` | Progress ring close button (shown when duration>0) | `boolean` | `false` |
| `grouping` | Same-content dedupe: merge in the same stack and bump the count badge | `boolean` | `false` |
| `swipeDirection` | Swipe direction: `both`/`right`/`left`/`up`/`down` | `string` | `both` |
| `stacked` | Collapsed stacking mode (+N fold / peek) | `boolean` | `false` |
| `variant` | Variant: `solid`/`plain`/`translucent` | `string` | `solid` |
| `container` | Mount point (element or function), overrides the default host | `HTMLElement \| () => HTMLElement` | — |
| `pauseOnHover` / `pauseOnFocus` / `pauseOnWindowBlur` | Pause timer toggles (all on by default) | `boolean` | `true` |

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `closable` | Whether to show the close button (always disabled while loading) | `boolean` | — |
| `count` | — | `string` | `0` |
| `description` | Description text | `string` | — |
| `duration` | Auto-close duration in ms; pass `0` to keep it open | `string` | `3000` |
| `id` | — | — | — |
| `open` | — | `string` | `true` |
| `pause-on-focus` | — | — | — |
| `pause-on-hover` | — | — | — |
| `pause-on-window-blur` | — | — | — |
| `politeness` | — | `string` | — |
| `progress-position` | — | `string` | `bottom` |
| `progress-ring` | — | `boolean` | — |
| `show-progress` | — | `boolean` | — |
| `swipe-direction` | — | `string` | `both` |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |
| `type` | Toast type: `info`/`success`/`warning`/`error`/`loading` | `string` | `info` |
| `variant` | — | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-close` | — |
| `oas-destroy` | — |
| `oas-open` | — |

### Slots

| Name | Description |
| --- | --- |
| `title` | Rich title content slot; overrides the title attribute text when present |

- `error` defaults to `role="alert"` + `aria-live="assertive"`; others use `role="status"` + `aria-live="polite"`; override with `politeness`.
- Multiple toasts share one stack container and stack by position; `duration` timers are cleaned up on close/unmount with no leaks.
- Animation duration/easing are configured via CSS variables `--oas-toast-enter-duration` / `--oas-toast-leave-duration` / `--oas-toast-ease`.
