---
description: A barrage component where items drift across tracks at a set speed, with automatic non-overlapping scheduling, a density cap, and pause/clear APIs
---

# Barrage

Streaming barrage: each item occupies a track and drifts from right to left at a constant speed; the same track schedules items after "previous item fully entered + minimum gap", preventing rear-end overlaps; `max-active` caps on-screen density, with extras queued.

- `tracks` / `speed` / `gap` / `max-active` control track count, speed, gap, and the on-screen cap
- `add()` / `addBatch()` append items; `pause()` / `resume()` / `clear()` control playback
- Clicking an item dispatches `oas-item-click` (detail `{ text, key, color }`)
- The stage is `aria-hidden` by default; `accessible` turns it into a `role="log"` live region
- Under `prefers-reduced-motion` the animation duration collapses to instant, with no horizontal drift

## Basic Usage

<DemoBlock title="Add / pause / clear">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-barrage id="bg-demo" tracks="3" height="160" accessible style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap; align-items: center;">
      <oas-button id="bg-add" size="small">Add one</oas-button>
      <oas-button id="bg-pause" size="small">Pause</oas-button>
      <oas-button id="bg-clear" size="small">Clear</oas-button>
      <span id="bg-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click an item to see oas-item-click</span>
    </div>
  </div>
</DemoBlock>

## Density Control

`max-active` caps on-screen items (0 = unlimited). The example below allows 4, queueing extras until earlier items leave:

<DemoBlock title="max-active=4">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-barrage id="bg-dense" tracks="2" max-active="4" speed="150" height="120" style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
    <oas-button id="bg-burst" size="small">Burst 10 items</oas-button>
  </div>
</DemoBlock>

## Single Track

With `tracks="1"` all items share one track and scheduling guarantees no overlap — suitable for narrow areas or slower reading. `gap` sets the minimum horizontal gap between consecutive items on the same track (after the previous item has fully entered):

> Changing `tracks` at runtime invalidates and clears on-screen and queued items (track ownership is re-mapped); set the track count at initialization.

<DemoBlock title="tracks=1 / speed=80 / gap=120">
  <oas-barrage id="bg-single" tracks="1" speed="80" gap="120" height="72" style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
  <oas-button id="bg-single-add" size="small">Add another</oas-button>
</DemoBlock>

## Declarative items and auto-play

`items` declares the bullets as a JSON array (strings or `{ text, color?, key? }`), aligned with `addBatch`: when the attribute changes, new entries are batch-enqueued (append semantics; on-screen items are kept). A same-name property channel exists as well (assigning an array serializes and reflects the attribute automatically), so framework bindings need no manual `JSON.stringify`. `auto-play` loops the stream: once the declared items finish playing they re-enqueue automatically (only `items`-declared data loops — bullets added via `add()` are not part of the loop; `clear()` only clears on-screen and queued items, so to stop for good remove `items` or `auto-play`):

<DemoBlock title="items + auto-play loop">
  <oas-barrage
    id="bg-items-en"
    items='["Native Web Components","Dark theme ready","Declarative bullets","auto-play loops the stream","OAS-UI barrage"]'
    auto-play
    tracks="2"
    speed="110"
    height="96"
    accessible
    style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"
  ></oas-barrage>
</DemoBlock>

## Writing Direction (RTL)

On RTL pages (ancestor `dir="rtl"`, `oas-config-provider direction="rtl"`, or an RTL locale such as Arabic) items enter from the **left** and fly out to the right — the mirrored keyframes switch automatically via `data-rtl`, matching the reading direction:

<DemoBlock title="dir=rtl: enter from the left, exit to the right">
  <div dir="rtl" style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-barrage id="bg-rtl" tracks="2" speed="90" height="96" style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
    <oas-button id="bg-rtl-add" size="small">Add one (RTL stage)</oas-button>
  </div>
</DemoBlock>

## Detach and re-attach

When the host leaves the document and comes back (route caching, conditional rendering, collapsed panels), the on-screen items are **kept**. Each one is re-timed from its remaining duration (`endAt - now`): the CSS animation is re-positioned through a negative `animation-delay` so it continues from the correct progress and stays aligned with the JS exit timer — items neither restart from the entry edge nor linger. Items whose time already expired while detached leave immediately on re-attach, freeing their tracks for queued items; re-attaching while paused stays paused and keeps the paused progress.

## Methods

See the "Methods" table in the API section below (`add` / `addBatch` / `pause` / `resume` / `clear`).

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-barrage').then(() => {
    const demo = document.querySelector('#bg-demo')
    const dense = document.querySelector('#bg-dense')
    const single = document.querySelector('#bg-single')
    const rtl = document.querySelector('#bg-rtl')
    const output = document.querySelector('#bg-output')
    const texts = ['Great component', 'No track overlap', 'OAS-UI barrage', 'Just the right speed', 'Pause and clear', 'Native Web Components']
    const colors = ['', 'blue', 'green', 'purple', 'orange']
    let i = 0
    const add = (el, text) => el?.add(text, { color: colors[i % colors.length] })
    document.querySelector('#bg-add')?.addEventListener('click', () => {
      i += 1
      add(demo, texts[i % texts.length])
    })
    document.querySelector('#bg-burst')?.addEventListener('click', () => {
      for (let n = 0; n < 10; n++) {
        i += 1
        add(dense, texts[i % texts.length])
      }
    })
    document.querySelector('#bg-single-add')?.addEventListener('click', () => {
      i += 1
      add(single, texts[i % texts.length])
    })
    document.querySelector('#bg-rtl-add')?.addEventListener('click', () => {
      i += 1
      add(rtl, texts[i % texts.length])
    })
    document.querySelector('#bg-clear')?.addEventListener('click', () => demo?.clear())
    document.querySelector('#bg-pause')?.addEventListener('click', (event) => {
      if (!demo) return
      const button = event.currentTarget
      if (demo.hasAttribute('paused')) {
        demo.resume()
        if (button) button.textContent = 'Pause'
      } else {
        demo.pause()
        if (button) button.textContent = 'Resume'
      }
    })
    demo?.addEventListener('oas-item-click', (event) => {
      if (output) output.textContent = `oas-item-click: ${event.detail.text} (key: ${event.detail.key || '—'})`
    })
  })
})
</script>

## API

### oas-barrage

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accessible` | Boolean; when present the barrage is exposed to screen readers (`role="log"` + `aria-live="polite"`); `aria-hidden` by default | — | — |
| `auto-play` | Loop playback: once the declared queue drains the items re-enqueue automatically (only items-declared data loops; clear() only clears on-screen and queued items — remove items or auto-play to stop for good) | — | — |
| `gap` | Minimum horizontal gap between items on the same track (px, default 48) | `string` | — |
| `height` | Stage height (plain numbers are px, CSS lengths accepted; default 200px) | `string` | — |
| `items` | Declarative bullet data (JSON array of strings or `{ text, color?, key? }`) aligned with addBatch: attribute changes batch-enqueue the new entries (append semantics, on-screen items kept); a same-name get/set accessor reflects arrays to the attribute | `BarrageItemInput[] \| string` | `[]` |
| `max-active` | Maximum on-screen items (0 = unlimited, default 0) | `string` | — |
| `paused` | Controlled pause (present = paused; CSS animations and scheduling timers freeze together) | — | — |
| `speed` | Drift speed in pixels per second (default 120) | `string` | — |
| `tracks` | Track count (positive integer, default 3, max 20) | `string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `add` | `add(text: string, options: BarrageItemOptions): void` | Append one item (options: `{ color?, key? }`) |
| `addBatch` | `addBatch(items: Array<string \| BarrageItemInput>): void` | Append many (strings or `{ text, color?, key? }`) |
| `pause` | `pause(): void` | Pause (writes the `paused` attribute) |
| `resume` | `resume(): void` | Resume (removes the `paused` attribute) |
| `clear` | `clear(): void` | Clear on-screen and queued items |

#### Events

| Event | Description |
| --- | --- |
| `oas-item-click` | Dispatched when an item is clicked, `detail: { text: item.text, key: item.key, color: item.color }` |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-barrage-bg` | Stage background | `transparent` |
| `--oas-barrage-color` | Default text color | `var(--oas-color-text-primary)` |
| `--oas-barrage-font-size` | Barrage font size | `var(--oas-font-size-md)` |
| `--oas-barrage-height` | Stage height (the `height` attribute writes the same variable) | `200px` |
| `--oas-barrage-item-bg` | Item bubble background | `color-mix(in srgb, var(--oas-color-overlay) 24%, transparent)` |
| `--oas-barrage-item-color` | Item text color | `var(--oas-color-text-primary)` |
| `--oas-barrage-item-hover-bg` | Item hover background | `color-mix(in srgb, var(--oas-color-overlay) 36%, transparent)` |
| `--oas-barrage-stage-width` | Stage width (written by the component for the animation distance) | `800px` |
| `--oas-barrage-tracks` | Track count (written by the component) | `3` |
