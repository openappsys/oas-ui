# Drawer

A panel that slides in from the screen edge, often used for filters, details, and form editing.

## Four directions

`placement` supports `left` / `right` / `top` / `bottom`. **Horizontal placements manage width; vertical placements manage height** — `width` / `size` controls the panel height for `top` / `bottom`.

<DemoBlock title="Four placements">
  <oas-space>
    <oas-button type="primary" onclick="openDrawer('drawer-top')">Top drawer</oas-button>
    <oas-button type="primary" onclick="openDrawer('drawer-bottom')">Bottom drawer</oas-button>
    <oas-button type="primary" onclick="openDrawer('drawer-left')">Left drawer</oas-button>
    <oas-button type="primary" onclick="openDrawer('drawer-right')">Right drawer</oas-button>
  </oas-space>
  <oas-drawer id="drawer-top" title="Top drawer" placement="top" size="small">
    <p>Slides from the top; `size="small"` sets the height to 256px here.</p>
  </oas-drawer>
  <oas-drawer id="drawer-bottom" title="Bottom drawer" placement="bottom" width="360px">
    <p>Slides from the bottom — the mainstream form on mobile action sheets.</p>
  </oas-drawer>
  <oas-drawer id="drawer-left" title="Filters" placement="left" width="360px">
    <oas-space direction="vertical" size="small" style="width: 100%">
      <p>Status: All</p>
      <p>Category: All</p>
      <p>Sort: Created time</p>
    </oas-space>
  </oas-drawer>
  <oas-drawer id="drawer-right" title="Drawer title" placement="right">
    <p>Right is the default direction; click the mask, the close button, or press Esc to close.</p>
  </oas-drawer>
</DemoBlock>

## Animation and lifecycle events

Open/close transitions are animated (transform/opacity) and fall back to instant switching under `prefers-reduced-motion`. Lifecycle events: `oas-open` / `oas-opened` / `oas-close` (detail carries the close source) / `oas-closed`.

<DemoBlock title="Lifecycle events">
  <oas-button type="primary" onclick="document.querySelector('#drawer-life').setAttribute('visible','')">Open and watch events</oas-button>
  <oas-drawer id="drawer-life" title="Event log">
    <p>Operate the footer buttons / mask / Esc and watch the messages (`oas-close` carries the close source).</p>
  </oas-drawer>
</DemoBlock>

## Close interception (before-close)

Listen to the cancelable `oas-before-close` (`event.detail.source` tells the close origin) and call `preventDefault()` to block closing — for unsaved-data protection.

<DemoBlock title="Close interception">
  <oas-button type="primary" onclick="document.querySelector('#drawer-guard').setAttribute('visible','')">Open form drawer</oas-button>
  <oas-drawer id="drawer-guard" title="Edit profile" ok-text="Save" cancel-text="Discard">
    <p>Clicking "Discard" / ✕ / mask / Esc is all intercepted: "You have unsaved changes" and the drawer stays open. "Save" closes normally.</p>
    <oas-space direction="vertical" size="small">
      <oas-input placeholder="Nickname" value="John"></oas-input>
      <oas-input placeholder="Email" value="john@example.com"></oas-input>
    </oas-space>
  </oas-drawer>
</DemoBlock>

## Custom footer / header extensions

A `footer` slot with content hides the built-in OK/Cancel buttons; a `header-actions` slot renders extra actions right of the title; `ok-text` / `cancel-text` override button labels.

<DemoBlock title="Slots and labels">
  <oas-button type="primary" onclick="document.querySelector('#drawer-custom').setAttribute('visible','')">Open custom drawer</oas-button>
  <oas-drawer id="drawer-custom" title="Task detail">
    <span slot="header-actions"><oas-tag color="green">In progress</oas-tag></span>
    <p>The tag right of the title comes from the `header-actions` slot.</p>
    <span slot="footer">
      <oas-button onclick="document.querySelector('#drawer-custom').removeAttribute('visible')">Cancel</oas-button>
      <oas-button type="primary" onclick="document.querySelector('#drawer-custom').removeAttribute('visible'); message.success('Submitted')">Submit task</oas-button>
    </span>
  </oas-drawer>
</DemoBlock>

## Loading and async OK state

`loading` shows skeleton placeholders in the content area and disables the buttons (async detail loading); `ok-loading` puts the OK button into a loading state (spinner + no double trigger) for async submits.

<DemoBlock title="loading / async OK">
  <oas-space>
    <oas-button onclick="openLoadingDrawer()">Open loading drawer</oas-button>
    <oas-button type="primary" onclick="openAsyncDrawer()">Open async submit drawer</oas-button>
  </oas-space>
  <oas-drawer id="drawer-loading" title="Loading detail" loading>
    <p>Content loads asynchronously; this section is covered by skeletons.</p>
  </oas-drawer>
  <oas-drawer id="drawer-async" title="Submit config" ok-text="Submit">
    <p>Clicking "Submit" puts the OK button into loading; it closes automatically 2s later with a success message.</p>
  </oas-drawer>
</DemoBlock>

## Resizable

`resizable` shows a drag rail on the free edge; drag it or use arrow keys to change width/height (clamped by `resize-min` / `resize-max`). `oas-resize` fires on release.

<DemoBlock title="Resizable">
  <oas-button type="primary" onclick="document.querySelector('#drawer-resize').setAttribute('visible','')">Open resizable drawer</oas-button>
  <oas-drawer id="drawer-resize" title="Resizable" width="480px" resizable resize-min="280" resize-max="800">
    <p>Drag the vertical rail on the left edge of the panel (or use arrow keys); the new width is reported after release.</p>
  </oas-drawer>
</DemoBlock>

## Mobile gestures: swipe to close + snap points

`swipeable` enables drag-to-close (start from the handle / header; close on threshold or a fast flick). A bottom drawer with `snap-points` (viewport fractions or pixels) snaps to the nearest point on release.

<DemoBlock title="Gesture drawer">
  <oas-button type="primary" onclick="document.querySelector('#drawer-snap').setAttribute('visible','')">Open snap drawer</oas-button>
  <oas-button onclick="document.querySelector('#drawer-swipe').setAttribute('visible','')">Open swipe drawer</oas-button>
  <oas-drawer id="drawer-snap" title="Snap points" placement="bottom" snap-points="0.4, 0.85" swipeable>
    <p>Drag the top handle: on release it snaps to 40% / 85% of the viewport height; drag past the threshold or flick to close.</p>
  </oas-drawer>
  <oas-drawer id="drawer-swipe" title="Swipe to close" placement="bottom" width="420px" swipeable>
    <p>Drag the handle downward to close.</p>
  </oas-drawer>
</DemoBlock>

## Imperative API

`drawer(options)` opens a drawer without templates and returns a `{ close() }` handle; when `onOk` returns a Promise, the OK button loading is managed automatically.

<DemoBlock title="Imperative">
  <oas-space>
    <oas-button onclick="openImperative()">drawer() basic</oas-button>
    <oas-button type="primary" onclick="openImperativeAsync()">drawer() async submit</oas-button>
  </oas-space>
</DemoBlock>

## Nested drawers

Stacked drawers get automatic stack management: later openers sit on top (incremental z-index), Esc closes them layer by layer, and the focus trap only applies to the topmost drawer.

<DemoBlock title="Nested layers">
  <oas-button type="primary" onclick="document.querySelector('#drawer-outer').setAttribute('visible','')">Open outer drawer</oas-button>
  <oas-drawer id="drawer-outer" title="Outer drawer">
    <p>Open an inner drawer from within the outer one and observe the stacking.</p>
    <oas-button type="primary" onclick="document.querySelector('#drawer-inner').setAttribute('visible','')">Open inner drawer</oas-button>
  </oas-drawer>
  <oas-drawer id="drawer-inner" title="Inner drawer" width="420px">
    <p>The inner drawer covers the outer one; press Esc to close the inner first, then again for the outer.</p>
  </oas-drawer>
</DemoBlock>

## Render and mount strategies

`destroy-on-close` clears the content after the close animation (re-initialize on next open); `append-to` mounts the panel into a target container (escapes `overflow` clipping).

<DemoBlock title="destroy-on-close / append-to">
  <oas-space>
    <oas-button onclick="document.querySelector('#drawer-destroy').setAttribute('visible','')">destroy-on-close</oas-button>
    <oas-button onclick="document.querySelector('#drawer-portal').setAttribute('visible','')">append-to</oas-button>
  </oas-space>
  <oas-drawer id="drawer-destroy" title="Re-render" destroy-on-close>
    <p>Content is cleared after closing; fill it again before the next open (see the button below).</p>
    <oas-button onclick="fillDestroyContent()">Fill content</oas-button>
  </oas-drawer>
  <oas-drawer id="drawer-portal" title="Mounted to body" append-to="body">
    <p>The panel is mounted into a body-level container, so it is not clipped even inside an `overflow: hidden` host.</p>
  </oas-drawer>
</DemoBlock>

## Header / close button / Esc switches

`no-header` hides the whole header, `no-close-btn` hides ✕, `no-esc-close` disables Esc closing — giving the host full control over close entries.

<DemoBlock title="Close entries">
  <oas-button type="primary" onclick="document.querySelector('#drawer-bare').setAttribute('visible','')">Open bare drawer</oas-button>
  <oas-drawer id="drawer-bare" no-header no-close-btn no-esc-close>
    <p>No header, no ✕, no Esc — close via the button below or the mask (mask click still works).</p>
    <oas-button onclick="document.querySelector('#drawer-bare').removeAttribute('visible')">Close</oas-button>
  </oas-drawer>
</DemoBlock>

## Initial focus

`initial-focus` specifies which element receives focus on open (a CSS selector; the panel is searched first, then light DOM); falls back to ✕ when nothing matches.

<DemoBlock title="Initial focus">
  <oas-button type="primary" onclick="document.querySelector('#drawer-focus').setAttribute('visible','')">Focus input on open</oas-button>
  <oas-drawer id="drawer-focus" title="New task" initial-focus="#task-name" ok-text="Create">
    <oas-space direction="vertical" size="small" style="width: 100%">
      <oas-input id="task-name" placeholder="Task name"></oas-input>
      <oas-input placeholder="Assignee"></oas-input>
    </oas-space>
  </oas-drawer>
</DemoBlock>

## Controlled visibility

`visible` is a controlled attribute: the host (button / JS) sets or removes it; remove `visible` after listening to events to close.

<DemoBlock title="Controlled visibility (visible)">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#drawer-ctrl').setAttribute('visible','')">Open (set visible)</oas-button>
    <oas-button onclick="document.querySelector('#drawer-ctrl').removeAttribute('visible')">Close (remove visible)</oas-button>
  </oas-space>
  <oas-drawer id="drawer-ctrl" title="Controlled visibility">
    <p>External buttons set / remove `visible` to control visibility without relying on the footer buttons.</p>
  </oas-drawer>
</DemoBlock>

## No footer / no mask close

<DemoBlock title="no-footer / no-mask-close">
  <oas-space>
    <oas-button onclick="document.querySelector('#drawer-nofooter').setAttribute('visible','')">No footer buttons</oas-button>
    <oas-button type="primary" onclick="document.querySelector('#drawer-nomask').setAttribute('visible','')">No mask close</oas-button>
  </oas-space>
  <oas-drawer id="drawer-nofooter" title="Read-only details" no-footer>
    <p>The footer action area is hidden; only ✕ and Esc remain as close entries.</p>
  </oas-drawer>
  <oas-drawer id="drawer-nomask" title="Confirmation required" no-mask-close>
    <p>Clicking the mask won't close it; use ✕ / Esc or the footer buttons.</p>
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
  const { message, drawer } = await import('@oas-ui/ui')
  window.message = message
  window.drawer = drawer
  window.openDrawer = (id) => document.getElementById(id).setAttribute('visible', '')

  // Lifecycle event feedback
  const life = document.getElementById('drawer-life')
  for (const name of ['open', 'opened', 'close', 'closed']) {
    life.addEventListener(`oas-${name}`, (e) => {
      const detail = e.detail && e.detail.source ? ` (source=${e.detail.source})` : ''
      message.info(`oas-${name}${detail}`)
    })
  }

  // Close interception: unsaved changes guard (OK passes through)
  const guard = document.getElementById('drawer-guard')
  guard.addEventListener('oas-before-close', (e) => {
    if (e.detail.source === 'ok') return
    e.preventDefault()
    message.warning('You have unsaved changes — save before closing')
  })

  // Resizable: report the new width
  const rz = document.getElementById('drawer-resize')
  rz.addEventListener('oas-resize', (e) => {
    message.info(`Width adjusted to ${e.detail.size}px`)
  })

  // Loading: simulate async detail loading
  const loading = document.getElementById('drawer-loading')
  window.openLoadingDrawer = () => {
    loading.setAttribute('visible', '')
    loading.setAttribute('loading', '')
    setTimeout(() => {
      if (loading.hasAttribute('visible')) loading.removeAttribute('loading')
    }, 2000)
  }

  // Async OK submit
  const asyncD = document.getElementById('drawer-async')
  asyncD.deferOkClose = true
  asyncD.addEventListener('oas-ok', () => {
    asyncD.setAttribute('ok-loading', '')
    setTimeout(() => {
      asyncD.removeAttribute('ok-loading')
      asyncD.removeAttribute('visible')
      message.success('Submitted')
    }, 2000)
  })
  window.openAsyncDrawer = () => asyncD.setAttribute('visible', '')

  // Imperative API
  window.openImperative = () => {
    const handle = drawer({
      title: 'Imperative drawer',
      content: 'drawer(options) opens without templates and returns a { close() } handle.',
      onOk: () => message.success('Confirmed'),
    })
    setTimeout(() => handle.close(), 5000)
  }
  window.openImperativeAsync = () => {
    drawer({
      title: 'Async submit',
      content: 'Click OK to enter loading; it closes automatically 1.5s later.',
      onOk: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            message.success('Async submit succeeded')
            resolve()
          }, 1500)
        }),
    })
  }

  // destroy-on-close: fill content on open if empty
  const destroy = document.getElementById('drawer-destroy')
  window.fillDestroyContent = () => {
    destroy.innerHTML = '<p>Refilled content.</p>'
  }
  destroy.addEventListener('oas-open', () => {
    if (destroy.children.length === 0) {
      destroy.innerHTML = '<p>Content filled on first open.</p>'
    }
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `append-to` | — | — | — |
| `cancel-text` | — | — | — |
| `destroy-on-close` | — | `boolean` | — |
| `initial-focus` | — | — | — |
| `loading` | — | `boolean` | — |
| `no-close-btn` | — | `boolean` | — |
| `no-esc-close` | — | `boolean` | — |
| `no-focus-trap` | — | `boolean` | — |
| `no-footer` | Hide footer action buttons | `boolean` | — |
| `no-header` | — | `boolean` | — |
| `no-mask-close` | Disable closing on mask click | `boolean` | — |
| `no-scroll-lock` | — | `boolean` | — |
| `ok-loading` | — | `boolean` | — |
| `ok-text` | — | — | — |
| `placement` | Slide direction | `string` | `right` |
| `resizable` | — | `boolean` | — |
| `resize-max` | — | `string` | `1000` |
| `resize-min` | — | `string` | `160` |
| `size` | Preset size or a concrete value: `small` (256px) / `medium` (378px) / `large` (736px), or write directly like `512px`, `40%` | — | — |
| `snap-points` | — | — | — |
| `swipeable` | — | `boolean` | — |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |
| `visible` | Whether shown | `boolean` | — |
| `width` | Drawer width (px or percentage), takes precedence over `size` | — | — |
| `z-index` | — | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-before-close` | — |
| `oas-close` | Close: cancel button / ✕ / mask click / Esc, `detail: { source }` |
| `oas-closed` | — |
| `oas-ok` | Clicked "OK" |
| `oas-open` | — |
| `oas-opened` | — |
| `oas-resize` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `footer` | — |
| `header-actions` | — |
| `title` | Rich title content slot; overrides the title attribute text when present |

`role="dialog"` + `aria-modal="true"`; focus moves in on open (default ✕, overridable via `initial-focus`) and is restored on close.
