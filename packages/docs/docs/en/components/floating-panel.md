# FloatingPanel

A non-modal workbench tool window: draggable, resizable and stackable (palettes, layers, logs, monitors). `open` and `rect` are the controlled state; pointer and keyboard are equivalent. Panels in the same family share a fixed overlay tier — z-index never grows with open/close cycles.

The panel **does not portal**: the host is a zero-size anchor (`position: relative`) and the frame is `position: absolute` against it, so `rect` is the pixel offset from that anchor. The panel follows its container when scrolling and never touches host DOM hierarchy. Do not place the host inside an `overflow: hidden` clipping container or a `transform` ancestor that creates a containing block.

## Basic usage

`open` shows the panel, `panel-title` sets the title, `movable` / `resizable` enable dragging and eight-way resizing (four edges + four corners). Release commits `rect` and dispatches `oas-move` / `oas-resize`.

On touch devices (`pointer: coarse`) handles and the close button grow to 44px: the title bar (including the close button) always sits above the handles, and the top/top-corner handles start below the title bar — so dragging the bar and tapping close are never stolen by a resize handle.

The larger hit areas have a cost: under coarse pointers the title bar and the `n` handle band are each 44px, covering the top 88px together, plus 44px bands on the left, right and bottom. With the default minimum size `160×96`, the content is barely clickable. For touch, use `min` ≥ `260,220` (after subtracting all handle bands, roughly 172×88px of usable content remains) or leave `resizable` off entirely (the component has no per-handle switch). Gesture semantics are unchanged.

When a rich `title` slot makes the title bar taller, the client measures it with `ResizeObserver` and — only when the measured height is **greater** than the currently resolved value — writes the height into `--oas-floating-panel-titlebar-height` (px) on the component's inner shadow frame, moving the top/top-corner handles down. Host stylesheet overrides of that token keep working (the default title never pins an inline value; under coarse pointers the component declares a 44px default on `:host`, whose specificity beats host type selectors — an override needs equal or higher specificity), and the inline value is removed automatically once the measurement falls back. SSR snapshots keep the default token; the server does not measure.

<DemoBlock title="Movable / resizable panel">
  <div style="position: relative; min-height: 260px">
    <oas-floating-panel id="fp-basic" open movable resizable panel-title="Layers" rect="0,0,380,230">
      <p style="margin: 0 0 var(--oas-space-2)">Drag the title bar to move; drag edges or corners to resize.</p>
      <div style="display: flex; gap: var(--oas-space-1_5); flex-wrap: wrap">
        <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">Background</span>
        <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">Line art</span>
        <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">Notes</span>
      </div>
    </oas-floating-panel>
  </div>
  <p id="fp-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Move or resize to see oas-move / oas-resize feedback.</p>
</DemoBlock>

## Controlled open state and cancellation

The `open` attribute is the single source of truth: `show()` / `close()` only write it, and host writes are absorbed silently. The close button, Esc and `close()` all dispatch a cancelable `oas-before-close` first — `preventDefault()` keeps the panel open with no attribute write and no `oas-open-change`.

<DemoBlock title="show() / close() with before-close interception">
  <div style="display: flex; gap: var(--oas-space-2); align-items: center; margin-block-end: var(--oas-space-3)">
    <oas-button id="fp-open" size="small">show()</oas-button>
    <oas-button id="fp-close" size="small">close()</oas-button>
    <label style="display: inline-flex; align-items: center; gap: var(--oas-space-1); font-size: var(--oas-font-size-sm)">
      <input id="fp-veto" type="checkbox" /> Intercept close
    </label>
  </div>
  <div style="position: relative; min-height: 220px">
    <oas-floating-panel id="fp-ctrl" open panel-title="Export settings" rect="0,0,340,180">
      <p style="margin: 0">Click "close()" or the close button; tick "Intercept close" to see before-close veto the request.</p>
    </oas-floating-panel>
  </div>
  <p id="fp-ctrl-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Waiting for interaction.</p>
</DemoBlock>

## Controlled write-back

`detail.rect` on `oas-move` / `oas-resize` is the exact committed rectangle; hosts can write `rect` back to enforce constraints such as grid snapping (controlled loop). The `rect` property accepts both an object `{ x, y, width, height }` and a string `"x,y,width,height"` — the string goes straight through the attribute channel, identical to `setAttribute('rect', ...)` (so Vue static templates assigning through the property channel don't lose the value).

<DemoBlock title="Drag → event → host writes rect back (10px grid)">
  <div style="position: relative; min-height: 240px">
    <oas-floating-panel id="fp-drag" open movable panel-title="Snap to 10px" rect="0,0,320,190">
      <p style="margin: 0">Drag the title bar; on release the host snaps the position to a 10px grid.</p>
    </oas-floating-panel>
  </div>
  <p id="fp-drag-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Waiting for drag.</p>
</DemoBlock>

## Stacking

Panels in the same family share a fixed overlay tier: only the frontmost panel gets +1 — z-index never grows with open count. Clicking anywhere in a panel or calling `bringToFront()` raises it and dispatches `oas-activate`. A panel that is open on first frame (SSR / initial controlled state) also lands on the front tier instead of the base tier.

<DemoBlock title="Two panels, bring to front">
  <div style="position: relative; min-height: 260px">
    <oas-floating-panel id="fp-a" open panel-title="Layer A" rect="0,0,260,150"></oas-floating-panel>
    <oas-floating-panel id="fp-b" open panel-title="Layer B" rect="120,60,260,150"></oas-floating-panel>
  </div>
  <p id="fp-front-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click either panel to bring it to front.</p>
</DemoBlock>

## Boundaries and size limits

`boundary` defaults to `viewport`; a CSS selector clamps interactions to that element's rectangle. `boundary-padding` insets it. Boundaries only constrain drag/resize/keyboard — host-written coordinates are never rewritten. `min` / `max` take `width,height`; when `min > max`, `min` wins. Non-positive or malformed `min` values (including `"0"` / `"0,0"`) count as "not provided" and fall back to the default `160,96` — that is not a 1px floor; write `1,1` to get one.

Two timing notes: ① changing `boundary` / `boundary-padding` / `min` / `max` mid-gesture does not affect the running gesture — it applies from the next gesture; ② if the initial `rect` lies fully outside the boundary, the first drag clamps the position back inside (a one-time jump) — keep the initial `rect` inside the boundary for a stable look.

<DemoBlock title="Drag inside a container (boundary + min/max)">
  <div id="fp-bounds" style="position: relative; width: 100%; box-sizing: border-box; min-height: 260px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)">
    <oas-floating-panel id="fp-bound" open movable resizable boundary="#fp-bounds" boundary-padding="8" min="180,120" max="320,220" panel-title="Clamped to the dashed box" rect="16,16,260,180">
      <p style="margin: 0">Dragging stops at the dashed edges; resizing stops at min/max.</p>
    </oas-floating-panel>
  </div>
  <p id="fp-bound-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Position is clamped while dragging.</p>
</DemoBlock>

## Keyboard and focus

The frame is focusable: arrow keys move, `Shift` + arrows resize (8px per step), equivalent to pointer input. The resize mapping always moves the dragged edge: `Shift+→` / `Shift+↓` grow (LTR pushes the east edge, RTL the west edge; the south edge moves down), `Shift+←` / `Shift+↑` shrink (LTR moves the west edge right, RTL the east edge left; the north edge moves down). RTL mirrors horizontal semantics only; vertical stays fixed. `initial-focus` chooses the focus target on open (falling back to the frame); focus returns to the previously focused element on close — focus inside a nested component's shadow root still counts as "inside the panel" and is returned, while focus the user already moved outside the panel is left alone.

<DemoBlock title="Keyboard move / resize + initial-focus">
  <div style="position: relative; min-height: 240px">
    <oas-floating-panel id="fp-key" open movable resizable initial-focus="#fp-key-target" panel-title="Keyboard ready" rect="0,0,340,190">
      <input id="fp-key-target" placeholder="Focused on open" style="width: 100%; box-sizing: border-box; margin-block-end: var(--oas-space-2)" />
      <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Tab to the frame (title bar), then use arrows to move and Shift + arrows to resize.</p>
    </oas-floating-panel>
  </div>
  <p id="fp-key-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Waiting for keyboard input.</p>
</DemoBlock>

## Overflow and scrolling

Content taller than the panel scrolls inside the content area (`overflow: auto`). The content area then gets `tabindex="0"`: keyboard users can Tab to it and scroll with arrow keys / PageDown, with a focus ring from `--oas-focus-ring`. When nothing overflows no `tabindex` is added — the panel never introduces an empty Tab stop, and the decision is re-evaluated on panel resize, content element size changes (ResizeObserver), open/close and content add/remove (`slotchange`). Note that bare text content is an observation blind spot (`ResizeObserver` can only observe elements, and text-node mutations do not fire `slotchange`): wrap dynamically growing text in an element.

<DemoBlock title="Overflow: keyboard-scrollable content">
  <div style="position: relative; min-height: 260px">
    <oas-floating-panel id="fp-scroll" open resizable panel-title="Build log" rect="0,0,320,200">
      <ol style="margin: 0; padding-inline-start: var(--oas-space-4); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">
        <li>Resolve dependency graph … done</li>
        <li>Compile core … done</li>
        <li>Compile i18n … done</li>
        <li>Compile icons … done</li>
        <li>Compile theme … done</li>
        <li>Compile ui … done</li>
        <li>Emit type declarations … done</li>
        <li>Bundle CDN artifacts … done</li>
        <li>Check export surface … done</li>
        <li>Build documentation site … done</li>
        <li>Check artifact size budget … pass</li>
        <li>Build finished: 12 of 12 tasks done</li>
      </ol>
    </oas-floating-panel>
  </div>
  <p id="fp-scroll-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Content overflows: Tab into it and scroll with arrow keys; make the panel taller and it stops taking a Tab stop.</p>
</DemoBlock>

## Nested overlay Esc priority

Overlays inside the panel (such as `oas-dropdown`) push a later Esc layer: the first Esc closes only the child overlay, the panel stays open; a second Esc closes the panel. When several panels of the same family are open, Esc closes the **visually frontmost** (most recently activated) one, not the last opened one — clicking / `bringToFront()` also promotes that panel's Esc layer to the top.

<DemoBlock title="Dropdown consumes Esc first">
  <div style="position: relative; min-height: 250px">
    <oas-floating-panel id="fp-nest" open panel-title="With child overlay" rect="0,0,340,200">
      <oas-dropdown id="fp-nest-dd" items='[{"label":"Duplicate","value":"copy"},{"label":"Delete","value":"delete"}]'>
        <oas-button size="small">Open dropdown</oas-button>
      </oas-dropdown>
      <p style="margin: var(--oas-space-2) 0 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Open the dropdown and press Esc: it closes first, the panel stays.</p>
    </oas-floating-panel>
  </div>
  <p id="fp-nest-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Waiting for the dropdown.</p>
</DemoBlock>

## RTL

`dir="rtl"` enables the `data-rtl` hook; drag/resize stay physical while horizontal keyboard semantics mirror (right arrow moves toward the reading direction).

<DemoBlock title="RTL keyboard mirroring">
  <div dir="rtl" style="position: relative; min-height: 220px">
    <oas-floating-panel id="fp-rtl" open movable resizable panel-title="لوحة الطبقات" rect="0,0,320,170">
      <p style="margin: 0">Arrow keys and Shift + arrows mirror under RTL.</p>
    </oas-floating-panel>
  </div>
</DemoBlock>

## Slots

The default slot carries the content; the `title` slot overrides the title text (rich titles still feed `aria-labelledby`). With neither `panel-title` nor a `title` slot, the panel falls back to the i18n name ("Floating panel") via `aria-label` and writes no empty `aria-labelledby`; clearing the `title` slot later falls back the same way, and filling it again switches back to `aria-labelledby`.

<DemoBlock title="title slot (rich title)">
  <div style="position: relative; min-height: 210px">
    <oas-floating-panel id="fp-slot" open resizable rect="0,0,340,170">
      <span slot="title" style="display: inline-flex; align-items: center; gap: var(--oas-space-1); min-height: 48px">
        <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">Synced</span>
        <strong>Asset inspector</strong>
      </span>
      <p style="margin: 0">The title comes from the <strong>title</strong> slot (48px tall here); top/top-corner handles start below the title bar and still resize.</p>
    </oas-floating-panel>
  </div>
  <p id="fp-slot-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Drag the top edge or a top corner to see oas-resize.</p>
</DemoBlock>

<DemoBlock title="Untitled panel: i18n name fallback">
  <div style="position: relative; min-height: 220px">
    <oas-floating-panel id="fp-plain" open rect="0,0,360,200">
      <p style="margin: 0">No <span style="font-family: var(--oas-font-family-mono)">panel-title</span> and no <span style="font-family: var(--oas-font-family-mono)">title</span> slot: the title area stays empty and screen readers announce "Floating panel".</p>
    </oas-floating-panel>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const out = (id, text) => {
    const el = document.getElementById(id)
    if (el) el.textContent = text
  }

  const basic = document.getElementById('fp-basic')
  basic?.addEventListener('oas-move', (e) => {
    out('fp-basic-out', `oas-move → source=${e.detail.source}, rect=${e.detail.rect.x},${e.detail.rect.y},${e.detail.rect.width},${e.detail.rect.height}`)
  })
  basic?.addEventListener('oas-resize', (e) => {
    out('fp-basic-out', `oas-resize → edge=${e.detail.edge}, rect=${e.detail.rect.x},${e.detail.rect.y},${e.detail.rect.width},${e.detail.rect.height}`)
  })

  const ctrl = document.getElementById('fp-ctrl')
  const veto = document.getElementById('fp-veto')
  document.getElementById('fp-open')?.addEventListener('click', () => {
    ctrl?.show()
  })
  document.getElementById('fp-close')?.addEventListener('click', () => {
    const closed = ctrl?.close()
    if (!closed) out('fp-ctrl-out', 'close() → vetoed by before-close, still open')
  })
  ctrl?.addEventListener('oas-before-close', (e) => {
    if (veto?.checked) {
      e.preventDefault()
      out('fp-ctrl-out', `oas-before-close → reason=${e.detail.reason} (preventDefault: kept open)`)
    } else {
      out('fp-ctrl-out', `oas-before-close → reason=${e.detail.reason} (allowed)`)
    }
  })
  ctrl?.addEventListener('oas-open-change', (e) => {
    out('fp-ctrl-out', `oas-open-change → open=${e.detail.open}, reason=${e.detail.reason}, source=${e.detail.source}`)
  })

  const drag = document.getElementById('fp-drag')
  drag?.addEventListener('oas-move', (e) => {
    const r = e.detail.rect
    const snapped = `${Math.round(r.x / 10) * 10},${Math.round(r.y / 10) * 10},${r.width},${r.height}`
    drag.setAttribute('rect', snapped)
    out('fp-drag-out', `oas-move ${r.x},${r.y} → host wrote rect="${snapped}"`)
  })

  for (const id of ['fp-a', 'fp-b']) {
    document.getElementById(id)?.addEventListener('oas-activate', (e) => {
      out('fp-front-out', `${id} raised (source=${e.detail.source})`)
    })
  }

  const bound = document.getElementById('fp-bound')
  bound?.addEventListener('oas-move', (e) => {
    out('fp-bound-out', `oas-move → ${e.detail.rect.x},${e.detail.rect.y}`)
  })

  document.getElementById('fp-key')?.addEventListener('oas-move', (e) => {
    out('fp-key-out', `oas-move (keyboard) → ${e.detail.rect.x},${e.detail.rect.y}`)
  })
  document.getElementById('fp-key')?.addEventListener('oas-resize', (e) => {
    out('fp-key-out', `oas-resize (keyboard, edge=${e.detail.edge}) → ${e.detail.rect.width}×${e.detail.rect.height}`)
  })

  document.getElementById('fp-nest-dd')?.addEventListener('oas-open-change', (e) => {
    out('fp-nest-out', `dropdown open=${e.detail.open}; panel open=${document.getElementById('fp-nest')?.hasAttribute('open')}`)
  })
  document.getElementById('fp-nest')?.addEventListener('oas-before-close', (e) => {
    out('fp-nest-out', `panel oas-before-close → reason=${e.detail.reason} (reached only after the child overlay consumed Esc)`)
  })
  document.getElementById('fp-slot')?.addEventListener('oas-resize', (e) => {
    out('fp-slot-out', `oas-resize (edge=${e.detail.edge}) → ${e.detail.rect.width}×${e.detail.rect.height}`)
  })
})
</script>

## API

### oas-floating-panel

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `boundary` | Interaction boundary: viewport (default) or a CSS selector; only drag/resize/keyboard are clamped, host-written coordinates are untouched | `string` | `viewport` |
| `boundary-padding` | Boundary inset in pixels (non-negative; invalid falls back to 0) | `string` | `0` |
| `initial-focus` | Selector to focus on open (light DOM or shadow; falls back to the frame) | — | — |
| `max` | Maximum size width,height (unbounded by default) | — | — |
| `min` | Minimum size width,height (default 160,96; non-positive or malformed values including 0 count as not provided and fall back to the default; min wins when min > max) | — | — |
| `movable` | Drag by the title bar; arrow keys move while the frame is focused (8px per step) | `boolean` | — |
| `open` | Open state (single source of truth); show()/close() only write it, host writes are absorbed silently (no oas-open-change) | `boolean` | — |
| `panel-title` | Title text (overridden by the title slot); avoids the native title attribute | — | — |
| `rect` | Position and size x,y,width,height relative to the host anchor (default 48,48,420,300; rounded); the property also accepts an object or a string of the same format | `PanelRect` | — |
| `resizable` | Eight resize handles (four edges + four corners); Shift + arrows resize while the frame is focused | `boolean` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `show` | `show(): void` | Opens the panel (writes the open attribute; when already open it only raises the panel without re-dispatching oas-open-change) |
| `close` | `close(): boolean` | Requests close: dispatches cancelable oas-before-close first; returns false and stays open when prevented (no attribute write, no open-change). Returns whether the panel is closed — already closed returns true without dispatching; a reentrant close() inside a before-close handler does not dispatch again and returns false |
| `bringToFront` | `bringToFront(): void` | Raises the panel within the family and promotes its Esc layer to the top; no duplicate oas-activate when already frontmost |

#### Events

| Event | Description |
| --- | --- |
| `oas-activate` | Dispatched when the panel is raised; detail { rect, source } (source = pointer \| api) |
| `oas-before-close` | Dispatched before a close request (close button / Esc / close()) and cancelable (preventDefault keeps it open with no open-change); detail { reason, source } |
| `oas-move` | Dispatched when a pointer or keyboard move commits; detail { rect, source } (source = pointer \| keyboard; zero movement dispatches nothing) |
| `oas-open-change` | Dispatched when an internal action changes the open state; detail { open, reason, source } (host writes to open are absorbed silently) |
| `oas-resize` | Dispatched when a pointer or keyboard resize commits; detail { rect, source, edge } |

#### Slots

| Name | Description |
| --- | --- |
| default | Panel content |
| `title` | Rich title channel (overrides panel-title text; still feeds aria-labelledby; falls back to the i18n name when cleared) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-floating-panel-bg` | `var(--oas-color-bg-elevated)` |
| `--oas-floating-panel-border-color` | `var(--oas-color-border)` |
| `--oas-floating-panel-close-size` | `var(--oas-control-height-sm, 24px)` |
| `--oas-floating-panel-handle-size` | `8px` |
| `--oas-floating-panel-radius` | `var(--oas-radius-md)` |
| `--oas-floating-panel-shadow` | `var(--oas-shadow-lg)` |
| `--oas-floating-panel-titlebar-border-color` | `var(--oas-color-border)` |
| `--oas-floating-panel-titlebar-height` | `36px` |

<style>
.vp-doc .demo-block oas-floating-panel {
  box-shadow: var(--oas-shadow-md);
}
</style>
