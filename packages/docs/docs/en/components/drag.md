---
description: Draggable overlay — wrap any children into a draggable block with unified pointer dragging (a 4px threshold still counts as a click), boundary clamping (viewport or selector), axis restriction, optional inertia and position memory, plus arrow-key nudging and aria-live position announcements.
---

# Drag Draggable overlay

Wrap any children into a draggable floating block: pointer dragging (mouse, touch and pen alike), boundary clamping, optional inertia and position memory, and arrow-key nudging. Typical use cases are a floating support button or a floating tool block.

## Basic usage (floating support button)

The whole host is the drag surface by default; `boundary` narrows the allowed area (the demo stage here — a real page can use `viewport`). Moves under 4px count as a click, so the button still works.

<DemoBlock title="boundary=&quot;#dg-stage&quot;">
  <div
    id="dg-stage"
    style="position: relative; width: 100%; height: 240px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover)"
  >
    <oas-drag
      id="dg-button"
      boundary="#dg-stage"
      remember
      storage-key="oas-drag-demo-button"
      style="position: absolute; inset-block-end: 16px; inset-inline-end: 16px"
    >
      <oas-button type="primary">Support</oas-button>
    </oas-drag>
  </div>
  <span id="dg-button-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Drag the support button (or Tab to it and nudge with the arrow keys)</span>
</DemoBlock>

## Handle mode (tool block)

With a `handle` slot only the handle starts a drag; the rest of the block keeps its own interactions. The handle content carries focus, so the host no longer takes a Tab stop.

<DemoBlock title="handle slot">
  <div
    id="dg-stage-handle"
    style="position: relative; width: 100%; height: 220px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"
  >
    <oas-drag
      id="dg-panel"
      boundary="#dg-stage-handle"
      axis="both"
      style="position: absolute; inset-block-start: 12px; inset-inline-start: 12px; max-inline-size: 260px"
    >
      <div slot="handle" style="cursor: grab; padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md) 0 0 var(--oas-radius-md)">⠿ Drag</div>
      <div style="padding: var(--oas-space-3); background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
        <strong>Quick tools</strong>
        <p style="margin: var(--oas-space-1) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Only the handle on the left drags; the panel content stays clickable.</p>
      </div>
    </oas-drag>
  </div>
</DemoBlock>

## Axis, inertia and announcements

`axis="x"` restricts dragging to the horizontal axis; `inertia` adds a decaying glide after release (instant stop under `prefers-reduced-motion: reduce`); `announce` reports position changes through `aria-live`.

<DemoBlock title="axis=&quot;x&quot; + inertia + announce">
  <div
    id="dg-stage-axis"
    style="position: relative; width: 100%; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden"
  >
    <oas-drag
      id="dg-chip"
      boundary="#dg-stage-axis"
      axis="x"
      inertia
      announce
      style="position: absolute; inset-block-start: 36px; inset-inline-start: 12px"
    >
      <span style="display: inline-block; padding: var(--oas-space-2) var(--oas-space-4); background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); border-radius: 999px">Drag horizontally</span>
    </oas-drag>
  </div>
  <span id="dg-chip-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Accessibility and interaction contract

- In whole-host mode the host is the focus stop (`tabindex="0"`, accessible name from i18n `drag.label`, hint wired through `aria-describedby`); arrow keys nudge 1px, Shift+arrow 10px, constrained by `axis` and the boundary
- With `announce` on, position changes are announced through `aria-live="polite"`; `disabled` turns dragging off and removes the focus stop
- Pointer moves under 4px are treated as clicks (no pointer capture, no default prevention), so buttons and inputs inside the content keep working
- When a drag passes the threshold, the `click` the browser fires afterwards is swallowed (releasing over a child button does not trigger it); the next normal click works as usual. `pointercancel` (scroll / gesture takeover) only ends the drag — no position is saved and no inertia starts
- In handle mode only the handle starts a drag; inputs inside the content keep their own arrow-key semantics

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../../.vitepress/theme/when-defined'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  const report = (id, label) => {
    const el = document.getElementById(id)
    if (!el) return
    onUpgraded(el, () => {
      text(`${id}-out`, `${label}: x ${el.position.x}, y ${el.position.y}`)
      el.addEventListener('oas-drag-end', (event) => {
        text(`${id}-out`, `${label} ended: x ${event.detail.x}, y ${event.detail.y} (${event.detail.source})`)
      })
      el.addEventListener('oas-drag', (event) => {
        if (event.detail.source !== 'keyboard') return
        text(`${id}-out`, `${label}: x ${event.detail.x}, y ${event.detail.y} (keyboard)`)
      })
    })
  }
  report('dg-button', 'Support button position')
  report('dg-chip', 'Horizontal position')
})
</script>

## API

### oas-drag

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `announce` | Announce position changes through `aria-live="polite"` (off by default) | `boolean` | — |
| `aria-label` | Accessible name (defaults to the i18n drag.label) | `string` | — |
| `axis` | Drag axis: `both` (default) / `x` horizontal only / `y` vertical only; invalid values fall back to `both` with a warning | `string` | `both` |
| `boundary` | Drag boundary: `viewport` (default) or a CSS selector whose element rect is the boundary (a miss warns once and falls back to the viewport) | `string` | `viewport` |
| `disabled` | Turn dragging off: pointer and keyboard are ignored and the focus stop is removed | `boolean` | — |
| `inertia` | Decaying glide after release; instant stop under `prefers-reduced-motion: reduce` | `boolean` | — |
| `keyboard` | Keyboard nudging: on by default (`tabindex="0"`, 1px with arrow keys, 10px with Shift); write `false` to disable | `string` | — |
| `remember` | Persist the position to `localStorage` and restore it on mount; silently degrades when unavailable (SSR / private mode / quota) | `boolean` | — |
| `storage-key` | Storage key for position memory (default `oas-drag`) | `string` | `oas-drag` |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `position` | Current offset `{ x, y }` relative to the initial layout position: get+set channel; assignment is clamped immediately and emits no events | `DragPosition \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `reset` | `reset(): void` | Return to the initial position (offset zero) and clear the stored position |

#### Events

| Event | Description |
| --- | --- |
| `oas-drag` | Dispatched on every position change (pointer drag / keyboard nudge / inertia), `detail: { x, y, source }` |
| `oas-drag-end` | Dispatched when a pointer drag ends (including the inertia tail), `detail: { x, y, source }` |
| `oas-drag-start` | Dispatched once when a pointer drag passes the 4px threshold and captures the pointer, `detail: { x, y, source }` |

#### Slots

| Name | Description |
| --- | --- |
| default | Default slot: the wrapped floating content (also the drag surface when the whole host drags) |
| `handle` | Drag handle: once it has content, only the handle starts a drag |
