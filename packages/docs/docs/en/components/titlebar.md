# TitleBar

A window title bar (app shell chrome): drag region + centered title / document well + built-in window actions + compact/large sizes. Semantics live at the "window" level, serving Electron/Tauri hosts; in plain Web the drag attributes are harmless no-ops and the component degrades to app shell semantics (distinct from `oas-app-bar`, the page-level `role="banner"`).

## Basic usage

`title` / `subtitle` set the centered title and subtitle (document state etc.); `window-actions` declares built-in window action buttons as a comma-separated subset (`minimize,maximize,close`); clicking dispatches `oas-window-action` (the component only emits the event — the host wires Electron/Tauri APIs).

<DemoBlock title="Title, subtitle and window actions">
  <div style="width: 100%">
    <oas-titlebar id="tb-basic" title="Project workspace" subtitle="Saved · just now" window-actions="minimize,maximize,close"></oas-titlebar>
  </div>
  <p id="tb-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click the window action buttons on the right and watch the event feedback (the component does not perform window operations).</p>
</DemoBlock>

## Drag contract (drag)

The `drag` boolean attribute turns the whole bar into a window drag region (writes `-webkit-app-region: drag` + `data-tauri-drag-region`, effective in Electron/Tauri hosts); **interactive children automatically opt out (no-drag)** — native interactive elements, `oas-*` components and `[data-no-drag]`-marked elements remain clickable. In plain Web this is a harmless no-op.

<DemoBlock title="Buttons inside the drag region stay clickable (automatic no-drag)">
  <div style="width: 100%">
    <oas-titlebar drag title="Drag region demo" window-actions="minimize,maximize,close">
      <oas-button size="small" slot="leading" onclick="message.info('Leading button inside the drag region works')">Click me</oas-button>
      <oas-button size="small" slot="trailing" onclick="message.info('Trailing button works')">Action</oas-button>
    </oas-titlebar>
  </div>
</DemoBlock>

## Document well (editable)

The `editable` boolean attribute turns the title into an editable input (Enter or blur commits, Esc cancels and rolls back); committing dispatches `oas-title-change`, and the title is absorbed into the component cache (`title` is a native global attribute — once rendered into the title area it is removed from the host, preventing duplicate native tooltips); hosts sync via the event. Rewriting `title` externally while editing terminates the edit (external state wins).

<DemoBlock title="Editable document title">
  <div style="width: 100%">
    <oas-titlebar id="tb-doc" title="Untitled design" subtitle="Edit the title, press Enter to commit" editable></oas-titlebar>
  </div>
  <p id="tb-doc-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Edit the title and press Enter; watch oas-title-change and the title attribute write-back.</p>
</DemoBlock>

## Sizes (size)

`size="compact"` (default, 34px) / `size="large"` (68px); controls stay compact in large (only the bar height doubles).

<DemoBlock title="compact / large comparison">
  <div style="width: 100%">
    <oas-titlebar title="compact default (34px)" window-actions="minimize,maximize,close" style="margin-block-end: var(--oas-space-3)"></oas-titlebar>
    <oas-titlebar title="large (68px, controls stay compact)" size="large" window-actions="minimize,maximize,close"></oas-titlebar>
  </div>
</DemoBlock>

## Safe area (native window control clearance)

Native window controls of hosts such as the Windows window controls overlay (WCO) may occupy both ends of the bar: yield the segments with the `leading-inset` / `trailing-inset` attributes (equivalent to overriding the `--oas-titlebar-leading-inset` / `--oas-titlebar-trailing-inset` variables, default 0px). In WCO scenarios consume the `env(titlebar-area-*)` environment variables directly (falls back to 0px outside WCO, no effect):

```css
oas-titlebar {
  --oas-titlebar-leading-inset: env(titlebar-area-x, 0px);
  --oas-titlebar-trailing-inset: calc(100% - env(titlebar-area-width, 100%) - env(titlebar-area-x, 0px));
}
```

## Slots

`slot="leading"` (brand / traffic lights), `slot="center"` (interactive content, overrides title / document well), `slot="title"` (rich title), `slot="trailing"` (end-of-bar content beyond window actions).

<DemoBlock title="Slot composition">
  <div style="width: 100%">
    <oas-titlebar window-actions="minimize,maximize,close">
      <span slot="leading" style="display: inline-flex; align-items: center; gap: var(--oas-space-1_5); font-size: var(--oas-font-size-sm); font-weight: 600">OAS Studio</span>
      <div slot="center" style="display: flex; align-items: center; justify-content: center; gap: var(--oas-space-2)">
        <oas-tag>scene-04.oas</oas-tag>
        <oas-tag>Synced</oas-tag>
      </div>
      <oas-button size="small" round icon="gear" aria-label="Settings" slot="trailing"></oas-button>
    </oas-titlebar>
  </div>
</DemoBlock>

## RTL

With `dir="rtl"` on the container the component mirrors automatically: `data-rtl` hook + logical-properties-only layout.

<DemoBlock title="RTL mirror">
  <div dir="rtl" style="width: 100%">
    <oas-titlebar title="لوحة المشروع" subtitle="تم الحفظ" window-actions="minimize,maximize,close"></oas-titlebar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const basic = document.getElementById('tb-basic')
  const basicOut = document.getElementById('tb-basic-out')
  basic?.addEventListener('oas-window-action', (e) => {
    basicOut.textContent = `oas-window-action dispatched: action=${e.detail.action} (the component only emits — host wires Electron/Tauri APIs)`
  })
  const doc = document.getElementById('tb-doc')
  const docOut = document.getElementById('tb-doc-out')
  doc?.addEventListener('oas-title-change', (e) => {
    docOut.textContent = `oas-title-change dispatched: title=${e.detail.title} (title absorbed into the component cache — hosts sync via the event)`
  })
})
</script>

## API

### oas-titlebar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `drag` | Turns the whole bar into a window drag region (writes -webkit-app-region: drag + data-tauri-drag-region, effective in Electron/Tauri hosts; harmless no-op in plain Web); interactive children automatically opt out (no-drag), [data-no-drag] opts out explicitly | `boolean` | — |
| `editable` | Makes the document-well title editable: Enter or blur commits (dispatches oas-title-change and updates the absorbed cache), Esc cancels and rolls back; rewriting title externally while editing terminates the edit | `boolean` | — |
| `leading-inset` | Safe area: leading-side native-control clearance (CSS length; also settable via --oas-titlebar-leading-inset) | — | — |
| `size` | Height tier: compact (default, 34px) / large (68px, controls stay compact); invalid values fall back to compact with a one-time warning | `string` | `compact` |
| `subtitle` | Subtitle / document state (last edited time etc.) | `string` | — |
| `title` | Centered title text (overridden when slot="title" has content). Same-named as the native global attribute — absorbed (removed from the host) once rendered into the title area, preventing duplicate native tooltips; rendering is driven by the component-internal cache; to clear or reset, write the title attribute explicitly | `string` | — |
| `trailing-inset` | Safe area: trailing-side native-control clearance (CSS length; also settable via --oas-titlebar-trailing-inset) | — | — |
| `window-actions` | Built-in window action button subset (comma-separated: minimize,maximize,close); clicking dispatches oas-window-action — the component does not perform window operations | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-title-change` | Dispatched when the document well commits (Enter/blur) with a changed value; detail { title }; the absorbed cache is updated (the title attribute does not stay on the host) |
| `oas-window-action` | Dispatched when a built-in window action button is clicked; detail { action } (minimize/maximize/close); the component only emits — hosts wire Electron/Tauri APIs |

#### Slots

| Name | Description |
| --- | --- |
| `center` | Central interactive content channel (overrides the title / document well when present, e.g. document tag combos) |
| `leading` | Custom area before the title (brand / macOS traffic lights provided by the host) |
| `title` | Rich title channel (overrides the title attribute text) |
| `trailing` | End-of-bar custom area (beyond the window action buttons) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-titlebar-height` | `var(--oas-titlebar-compact-height, 34px)` |
| `--oas-titlebar-leading-inset` | `0px` |
| `--oas-titlebar-trailing-inset` | `0px` |

### oas-traffic-lights

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disables all three dots (native disabled + reduced opacity) | `boolean` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-window-action` | Fired on traffic-light click; detail { action } (minimize/maximize/close); the component only emits — the host wires Electron/Tauri APIs |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-traffic-lights-close` | `#ff5f57` |
| `--oas-traffic-lights-gap` | `8px` |
| `--oas-traffic-lights-maximize` | `#28c840` |
| `--oas-traffic-lights-minimize` | `#febc2e` |
| `--oas-traffic-lights-size` | `12px` |
