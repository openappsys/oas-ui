# VirtualList

Renders large data lists into the viewport window: only visible items (plus a top/bottom buffer) are rendered, with head/tail padding placeholders to support the scroll height, and scroll events throttled via rAF. It is a generic rendering primitive reused by table / tree.

## Basic Usage

<DemoBlock title="Fixed-height virtual list">
  <div style="width: 100%">
    <oas-virtual-list id="vl-basic" height="320" item-height="36"></oas-virtual-list>
  </div>
</DemoBlock>

Provide data via the `items` property (or the `items` attribute as a JSON string); `height` sets the viewport height and `item-height` the height of each item. Without a template, each item renders `String(item)` by default.

## Custom Item Content

<DemoBlock title="oas-item event-bound content">
  <div style="width: 100%">
    <oas-virtual-list id="vl-item" height="280" item-height="44"></oas-virtual-list>
  </div>
</DemoBlock>

Each visible item emits `oas-item` after rendering with `detail` containing `{ index, item, element }`, which the host can use to fill in the item content; alternatively, a `<template slot="item">` inside the component can serve as a static per-item template.

## Scroll Events

<DemoBlock title="oas-scroll window display">
  <div style="width: 100%">
    <oas-virtual-list id="vl-scroll" height="200" item-height="32"></oas-virtual-list>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      Visible window: <span id="vl-window">0–0</span> · scrollTop: <span id="vl-scrolltop">0</span>
    </p>
  </div>
</DemoBlock>

Scroll events are emitted as `oas-scroll`, throttled by rAF, with `detail` being `{ scrollTop, start, end }`.

## Render Buffer

`buffer` controls how many extra items are pre-rendered above and below the visible area (default `4`): a larger buffer means fewer blank areas (white screens) while scrolling, at the cost of more rendered DOM nodes.

<DemoBlock title="Render buffer buffer">
  <div style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-4)">
      <div style="flex: 1; min-width: 0">
        <oas-virtual-list id="vl-buffer-0" height="160" item-height="32" buffer="0"></oas-virtual-list>
        <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
          <code>buffer="0"</code>: rendered items <span id="vl-buffer-0-count">—</span>; only items within the visible window are rendered.
        </p>
      </div>
      <div style="flex: 1; min-width: 0">
        <oas-virtual-list id="vl-buffer-8" height="160" item-height="32" buffer="8"></oas-virtual-list>
        <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
          <code>buffer="8"</code>: rendered items <span id="vl-buffer-8-count">—</span>; 8 extra items pre-rendered above and below.
        </p>
      </div>
    </div>
  </div>
</DemoBlock>

## Custom Scroll Container

<DemoBlock title="scroll-target external container">
  <div style="width: 100%">
    <div id="vl-outer" style="height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <oas-virtual-list id="vl-target" scroll-target="#vl-outer" height="240" item-height="36"></oas-virtual-list>
    </div>
  </div>
</DemoBlock>

When `scroll-target` (a CSS selector) is set, the component does not provide its own scrollbar; instead an external container scrolls the whole content (e.g. page-level scrolling), and the window is computed from the external container's `scrollTop`.

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Basic: 1000 fixed-height items
  const basic = document.querySelector('#vl-basic')
  if (basic) basic.items = Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`)

  // Custom item content bound via the oas-item event
  const itemList = document.querySelector('#vl-item')
  if (itemList) {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      label: `Task #${i + 1}`,
      status: ['In Progress', 'Done', 'Pending'][i % 3],
    }))
    itemList.items = rows
    itemList.addEventListener('oas-item', (e) => {
      const { item, element } = e.detail
      element.textContent = `${item.id} · ${item.label} · ${item.status}`
    })
  }

  // Scroll event window display
  const scroller = document.querySelector('#vl-scroll')
  if (scroller) {
    scroller.items = Array.from({ length: 200 }, (_, i) => i + 1)
    scroller.addEventListener('oas-scroll', (e) => {
      const { scrollTop, start, end } = e.detail
      document.querySelector('#vl-window').textContent = `${start}–${end}`
      document.querySelector('#vl-scrolltop').textContent = String(scrollTop)
    })
  }

  // Custom scroll container
  const target = document.querySelector('#vl-target')
  if (target) target.items = Array.from({ length: 500 }, (_, i) => `Record ${i + 1}`)

  // Render buffer comparison: count items actually rendered to the DOM
  const buf0 = document.querySelector('#vl-buffer-0')
  const buf8 = document.querySelector('#vl-buffer-8')
  const bufItems = Array.from({ length: 100 }, (_, i) => `Buffer item ${i + 1}`)
  const refreshBufferCounts = () => {
    const countOf = (el) => (el && el.shadowRoot ? el.shadowRoot.querySelectorAll('[part="item"]').length : 0)
    const c0 = document.querySelector('#vl-buffer-0-count')
    const c8 = document.querySelector('#vl-buffer-8-count')
    if (c0) c0.textContent = String(countOf(buf0))
    if (c8) c8.textContent = String(countOf(buf8))
  }
  if (buf0) {
    buf0.items = bufItems
    buf0.addEventListener('oas-scroll', refreshBufferCounts)
  }
  if (buf8) {
    buf8.items = bufItems
    buf8.addEventListener('oas-scroll', refreshBufferCounts)
  }
  refreshBufferCounts()
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `buffer` | Number of items pre-rendered above/below (rendered early beyond the visible area to reduce scrolling blanks) | `string` | `4` |
| `height` | Viewport height (px) | `string` | `320` |
| `item-height` | Fixed height of each item (px) | `string` | `36` |
| `items` | Data array (property channel, takes precedence over the `items` attribute); data JSON string (attribute channel) | `unknown[]` | `[]` |
| `scroll-target` | CSS selector of the external scroll container; when set, the component has no scrollbar of its own and listens to the external scroll | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-item` | Emitted after each visible item renders, `detail: { index, item, element }` |
| `oas-scroll` | Scroll event (rAF throttled), `detail: { scrollTop, start, end }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="item"]` | Static per-item template, cloned into each visible item container (optional) |

Parts: `::part(viewport)` scroll viewport, `::part(inner)` content, `::part(padding-top)` / `::part(padding-bottom)` placeholders, `::part(item)` a single item.
