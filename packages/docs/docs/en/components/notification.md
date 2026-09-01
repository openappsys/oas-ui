# Notification

Notification cards anchored to the four viewport corners, supporting title, description, duration, type, pause-on-hover, priority preemption, and stack governance (collapsible counter / peek-on-hover).

## Basic usage

<DemoBlock title="Four types">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Info notification', description: 'This is a regular notification' })">Info</oas-button>
    <oas-button type="success" onclick="notification.success({ title: 'Success notification', description: 'Operation completed' })">Success</oas-button>
    <oas-button type="warning" onclick="notification.warning({ title: 'Warning notification', description: 'Please handle it promptly' })">Warning</oas-button>
    <oas-button type="danger" onclick="notification.error({ title: 'Error notification', description: 'Operation failed' })">Error</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Long display', description: 'Auto closes after 8s', duration: 8000 })">8s</oas-button>
    <oas-button onclick="notification.success({ title: 'No auto-close', description: 'Click ✕ to close manually', duration: 0 })">No auto-close</oas-button>
  </oas-space>
</DemoBlock>

## With progress bar

<DemoBlock title="With progress bar">
  <oas-space>
    <oas-button onclick="notification.success({ title: 'Download complete', description: 'This notification auto closes in 5s', duration: 5000, showProgress: true })">Progress bar (bottom)</oas-button>
    <oas-button onclick="notification.info({ title: 'Deployment in progress', description: 'Progress bar is shown on top, auto closes in 6s', duration: 6000, showProgress: true, progressPosition: 'top' })">Progress bar (top)</oas-button>
  </oas-space>
</DemoBlock>

## Scrollable long content

<DemoBlock title="Scrollable long content">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Long content', description: 'This is a long description used to demonstrate scrolling inside a notification card. The card limits its height and enables vertical scrolling, so users can read the whole content without breaking the layout. Imagine several paragraphs here: the first covers the product update highlights, the second lists migration notes, the third adds rollback steps and support channels, the fourth… the scrollbar appears naturally once the text is long enough.' })">Long content</oas-button>
  </oas-space>
</DemoBlock>

## Four positions

<DemoBlock title="Four positions">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Top left', duration: 6000, position: 'top-left' })">Top left</oas-button>
    <oas-button onclick="notification.info({ title: 'Top right (default)', duration: 6000, position: 'top-right' })">Top right</oas-button>
    <oas-button onclick="notification.info({ title: 'Bottom left', duration: 6000, position: 'bottom-left' })">Bottom left</oas-button>
    <oas-button onclick="notification.info({ title: 'Bottom right', duration: 6000, position: 'bottom-right' })">Bottom right</oas-button>
  </oas-space>
</DemoBlock>

## Max count

<DemoBlock title="Max count (oldest dropped)">
  <oas-space>
    <oas-button onclick="for (let i = 1; i <= 6; i++) notification.info({ title: 'Notification ' + i, description: 'At most 3 on screen, oldest evicted', duration: 0, max: 3 })">Fire 6 (max=3)</oas-button>
    <oas-button onclick="destroyAllNotification()">Clear</oas-button>
  </oas-space>
</DemoBlock>

## Pause on hover

<DemoBlock title="Pause on hover (default on)">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Hover me', description: 'Countdown and progress bar pause on hover, resume on leave', duration: 8000, showProgress: true })">Pause on hover</oas-button>
    <oas-button onclick="notification.info({ title: 'No pause on hover', description: 'Disabled via pauseOnHover: false', duration: 8000, showProgress: true, pauseOnHover: false })">Disable pause</oas-button>
  </oas-space>
</DemoBlock>

## onClose callback

<DemoBlock title="onClose callback">
  <p style="font-size: 13px; margin: 0 0 8px;">Auto close, ✕ click, or imperative destroy — onClose fires exactly once either way:</p>
  <oas-space>
    <oas-button onclick="window.__notifLog('close', notification.info({ title: 'Watch close', description: 'See counter below', duration: 4000, onClose: () => window.__notifCount('close') }).close)">Imperative destroy</oas-button>
    <oas-button onclick="notification.info({ title: 'Watch close', description: 'Auto closes in 4s or click ✕', duration: 4000, onClose: () => window.__notifCount('close') })">Auto/manual close</oas-button>
    <span id="notif-close-count" style="font-size: 13px; align-self: center;">onClose fired: 0 times</span>
  </oas-space>
</DemoBlock>

## onClick callback

<DemoBlock title="onClick callback (view details)">
  <oas-space>
    <oas-button onclick="notification.warning({ title: 'Version released', description: 'Click the card to view release notes', duration: 8000, onClick: () => window.__notifCount('click') })">Clickable notification</oas-button>
    <span id="notif-click-count" style="font-size: 13px; align-self: center;">onClick fired: 0 times</span>
  </oas-space>
</DemoBlock>

## Closable switch

<DemoBlock title="Closable switch">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'No close button', description: 'Auto closes in 4s', duration: 4000, closable: false })">closable=false</oas-button>
    <oas-button onclick="notification.info({ title: 'Closable by default', description: '✕ on the top right', duration: 4000 })">Default (closable)</oas-button>
  </oas-space>
</DemoBlock>

## Icon slots

<DemoBlock title="Icon slots slot=&quot;icon&quot; / slot=&quot;close-icon&quot;">
  <oas-space>
    <oas-button onclick="document.getElementById('notif-slot-host').innerHTML = '<oas-notification type=\'success\' duration=\'0\' title=\'Custom icons\' description=\'🔔 overrides the type icon, DONE overrides the default ✕\'><span slot=\'icon\' style=\'font-size:18px\'>🔔</span><span slot=\'close-icon\'>DONE</span></oas-notification>'">Show custom icons</oas-button>
    <oas-button onclick="document.getElementById('notif-slot-host').innerHTML = ''">Remove</oas-button>
  </oas-space>
  <div id="notif-slot-host"></div>
</DemoBlock>

## Update by key

<DemoBlock title="Update by key">
  <oas-space>
    <oas-button onclick="window.__deployDemo()">Simulate deploy progress</oas-button>
  </oas-space>
</DemoBlock>

## Progress color

<DemoBlock title="Progress color --oas-notification-progress-color">
  <p style="font-size: 13px; margin: 0 0 8px;">The notification mounts into the container below (container), so the color variable on it pierces through — watch the danger-colored bar at the top right:</p>
  <oas-space>
    <oas-button onclick="window.__progressColorDemo()">Danger progress notification</oas-button>
  </oas-space>
  <div id="notif-color-host" style="--oas-notification-progress-color: var(--oas-color-danger);"></div>
</DemoBlock>

## Offset

<DemoBlock title="Offset">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Offset 64px', description: 'Stack sits 64px from the viewport edge', duration: 6000, offset: 64 })">offset=64</oas-button>
    <oas-button onclick="notification.info({ title: 'Default 16px', duration: 6000 })">Default 16</oas-button>
  </oas-space>
</DemoBlock>

## Mount container

<DemoBlock title="Mount container">
  <p style="font-size: 13px; margin: 0 0 8px;">The stack is appended into the container below (DOM ownership; visuals stay viewport-fixed). Inspect devtools to see the stack inside div#notif-mount-host:</p>
  <oas-space>
    <oas-button onclick="window.__containerDemo()">Mount below</oas-button>
  </oas-space>
  <div id="notif-mount-host" style="border: 1px dashed var(--oas-color-border); border-radius: 8px; padding: 8px; font-size: 12px; color: var(--oas-color-text-secondary);">Mount target (notif-mount-host)</div>
</DemoBlock>

## Footer actions

<DemoBlock title="Footer actions (view details / undo)">
  <oas-space>
    <oas-button onclick="window.__footerDemo()">Notification with footer</oas-button>
  </oas-space>
</DemoBlock>

## Priority

<DemoBlock title="Priority (high preempts)">
  <p style="font-size: 13px; margin: 0 0 8px;">Fire normal notifications first (max=5), then high ones: high stays on the newest side; low priority is evicted first when over the limit:</p>
  <oas-space>
    <oas-button onclick="window.__priorityNormalDemo()">Fire 4 normal</oas-button>
    <oas-button type="warning" onclick="window.__priorityHighDemo()">Fire 2 high</oas-button>
    <oas-button onclick="destroyAllNotification()">Clear</oas-button>
  </oas-space>
</DemoBlock>

## Stack governance

<DemoBlock title="Stack governance stackMode (collapsible / peek)">
  <oas-space>
    <oas-button onclick="window.__stackCollapsibleDemo()">Collapsible (+N expands)</oas-button>
    <oas-button onclick="window.__stackPeekDemo()">Peek (hover expands)</oas-button>
    <oas-button onclick="destroyAllNotification()">Clear</oas-button>
  </oas-space>
</DemoBlock>

## Loading and promise

<DemoBlock title="Loading state and promise chain">
  <oas-space>
    <oas-button onclick="notification.loading({ title: 'Loading', description: 'Not closable until done' })">Persistent loading</oas-button>
    <oas-button onclick="window.__promiseDemo(true)">promise success</oas-button>
    <oas-button onclick="window.__promiseDemo(false)">promise failure</oas-button>
  </oas-space>
</DemoBlock>

## Rich content and size

<DemoBlock title="Rich content and size">
  <oas-space>
    <oas-button onclick="window.__contentDemo('small')">Small + code block</oas-button>
    <oas-button onclick="window.__contentDemo('medium')">Medium + code block</oas-button>
    <oas-button onclick="window.__contentDemo('large')">Large + code block</oas-button>
  </oas-space>
</DemoBlock>

## Clear all

<DemoBlock title="Clear all">
  <oas-space>
    <oas-button onclick="notification.error({ title: 'Error notification', description: 'Notification one' }); notification.warning({ title: 'Warning notification', description: 'Notification two' }); notification.success({ title: 'Success notification', description: 'Notification three' })">Fire three</oas-button>
    <oas-button onclick="destroyAllNotification()">Clear all</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { notification, destroyAllNotification } = await import('@oas-ui/ui')
  window.notification = notification
  window.destroyAllNotification = destroyAllNotification

  // Callback counters
  window.__notifCount = (kind) => {
    const el = document.getElementById(`notif-${kind}-count`)
    if (!el) return
    const m = el.textContent.match(/(\d+)/)
    el.textContent = el.textContent.replace(/\d+/, String((Number(m?.[1] ?? 0)) + 1))
  }
  window.__notifLog = (_kind, handle) => {
    setTimeout(() => handle.close(), 1500)
    return handle
  }

  // key/update: simulated deploy progress
  window.__deployDemo = () => {
    notification.update('deploy', { title: 'Preparing release', description: 'Bundling…', duration: 0 })
    setTimeout(() => notification.update('deploy', { title: 'Uploading artifacts', description: '60% uploaded', duration: 0 }), 1200)
    setTimeout(() => notification.update('deploy', { title: 'Released', type: 'success', description: 'New version is live', duration: 3000 }), 2600)
  }

  // Progress color: mount into demo host so the variable pierces
  window.__progressColorDemo = () => {
    notification.info({
      title: 'Danger progress bar',
      description: 'Bar color comes from the host variable',
      duration: 6000,
      showProgress: true,
      container: document.getElementById('notif-color-host'),
    })
  }

  // Container mount
  window.__containerDemo = () => {
    notification.success({
      title: 'Mounted to container',
      description: 'DOM owned by notif-mount-host, visuals stay at viewport top-right',
      duration: 6000,
      container: document.getElementById('notif-mount-host'),
    })
  }

  // Footer actions
  window.__footerDemo = () => {
    const detail = document.createElement('oas-button')
    detail.size = 'small'
    detail.textContent = 'View details'
    detail.addEventListener('click', (e) => {
      e.stopPropagation()
      window.__notifCount('click')
      notification.info({ title: 'Details', description: 'Release notes go here', duration: 3000 })
    })
    const undo = document.createElement('oas-button')
    undo.size = 'small'
    undo.textContent = 'Undo'
    undo.addEventListener('click', (e) => {
      e.stopPropagation()
      notification.success({ title: 'Undone', duration: 2000 })
    })
    notification.warning({
      title: 'File deleted',
      description: 'Undo is available for 12 seconds',
      duration: 12000,
      footer: [detail, undo],
    })
  }

  // Priority
  window.__priorityNormalDemo = () => {
    for (let i = 1; i <= 4; i++) {
      notification.info({ title: `Normal ${i}`, description: 'priority: normal', duration: 0, max: 5 })
    }
  }
  window.__priorityHighDemo = () => {
    for (let i = 1; i <= 2; i++) {
      notification.warning({ title: `High ${i}`, description: 'priority: high — stays on the newest side', duration: 0, max: 5, priority: 'high' })
    }
  }

  // Stack governance
  window.__stackCollapsibleDemo = () => {
    for (let i = 1; i <= 5; i++) {
      notification.info({ title: `Message ${i}`, description: 'Collapsed into +N over threshold', duration: 0, stackMode: 'collapsible' })
    }
  }
  window.__stackPeekDemo = () => {
    for (let i = 1; i <= 5; i++) {
      notification.info({ title: `Peek ${i}`, description: 'Hover the stack to expand', duration: 0, stackMode: 'peek', position: 'bottom-right' })
    }
  }

  // promise
  window.__promiseDemo = (ok) => {
    notification.promise(
      new Promise((resolve, reject) => setTimeout(() => (ok ? resolve('v3.2.0') : reject(new Error('network down'))), 1800)),
      {
        loading: 'Releasing new version…',
        success: (data) => `Released: ${data}`,
        error: () => 'Release failed, please retry',
      },
    )
  }

  // Rich content + size
  window.__contentDemo = (size) => {
    const code = document.createElement('pre')
    code.textContent = 'pnpm add @oas-ui/ui'
    code.style.cssText = 'margin:0;padding:8px;border-radius:6px;background:var(--oas-color-bg-hover);font-size:12px;overflow:auto;'
    notification.info({
      title: 'Install command',
      content: code,
      duration: 0,
      size,
      closable: true,
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `closable` | Whether to show the close button (default true; false hides it) | `string` | `true` |
| `description` | Description content | `string` | — |
| `duration` | Auto-close duration in ms; pass `0` to keep it open | `string` | `4500` |
| `pause-on-hover` | Pause timer and progress bar on hover/focus (default on); remaining time resumes on leave | `string` | `true` |
| `progress-position` | Progress bar position: `bottom` (default) / `top` | `string` | `bottom` |
| `scrollable` | Scroll inside the card when the content is too long; enabled by default, pass `false` to disable | `string` | `true` |
| `show-progress` | Show the auto-close countdown progress bar (animates in sync with `duration`) | `boolean` | — |
| `size` | Size preset (pairs with the --oas-notification-width variable) | — | — |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |
| `type` | Notification type: `info`/`success`/`warning`/`error` | `string` | `info` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Dispatched when the notification body is clicked ("click for details" scenario) |
| `oas-close` | Dispatched on close, detail { source }: auto (duration elapsed) / close (close button) / destroy (programmatic) |

### Slots

| Name | Description |
| --- | --- |
| `close-icon` | Custom close icon, overrides the default ✕ |
| `content` | Rich body content slot |
| `footer` | Footer action slot (action buttons / meta row) |
| `icon` | Icon slot; overrides the default type icon |
| `title` | Rich title content slot; overrides the title attribute text when present |

### CSS Variables

| Variable | Description | Default |
| --- | --- | --- |
| `--oas-notification-progress-color` | Countdown progress bar color | `var(--oas-color-primary)` |
| `--oas-notification-width` | Card width (referenced internally by size levels) | `320px` |

### Methods

| Method | Description |
| --- | --- |
| `notification.info({ title, description?, content?, duration?, showProgress?, progressPosition?, scrollable?, position?, max?, offset?, container?, priority?, stackMode?, stackThreshold?, key?, onClose?, onClick?, closable?, pauseOnHover?, size?, icon?, closeIcon?, footer? })` | Info notification, returns `{ close }` |
| `notification.success(...)` / `notification.warning(...)` / `notification.error(...)` | Success/warning/error notifications, same options |
| `notification.loading(...)` | Loading state: spinner icon, no auto close, not manually closable |
| `notification.promise(p, { loading, success, error })` | Promise chain: loading → success on resolve (auto closes in 4500ms) / error on reject |
| `notification.update(key, { title?, description?, content?, duration?, type? })` | Update an existing notification (located by key); creates one if the key is unknown |
| `notification.destroy(key)` | Close the notification with the given key; silent no-op if absent |
| `destroyAllNotification()` | Clear all notifications (does not fire onClose) |

- `position` covers four corners: `top-right` (default) / `top-left` / `bottom-right` / `bottom-left`; each corner owns an independent stack container.
- `max` caps the stack size (default `0` = unlimited); the oldest is dropped first — oldest normal first, oldest high only when all are high; evictions also fire `onClose` (`source: 'evict'`).
- `offset` sets the stack distance from the viewport edge (default `16`) along the position direction; `container` overrides the mount target (nearest app host or body by default).
- `priority`: `high` always stays on the newest side (later normals insert before it); preemption is realized by insertion order + the max eviction strategy.
- `stackMode` governance: `collapsible` (folds older notifications beyond `stackThreshold`, default `3`; "+N" badge toggles expand/collapse) / `peek` (non-newest cards collapse to edge strips; hovering the stack expands).
- `onClose` fires exactly once per close; `onClick` is the card-body click callback; `closable` defaults to `true`; `pauseOnHover` is on by default (pauses timer and progress bar on hover).
- `title`/`icon`/`closeIcon`/`footer`/`content` accept rich Node channels; `footer` also accepts an array of Nodes.
- Imperatively created notifications mount to the nearest `oas-app` host (body otherwise), `role="region"` + `aria-label`, stacked at the top-right by default.
