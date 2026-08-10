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
      可见窗口：<span id="vl-window">0–0</span> · scrollTop：<span id="vl-scrolltop">0</span>
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
          <code>buffer="0"</code>：渲染项数 <span id="vl-buffer-0-count">—</span>，仅渲染可视窗口内的项。
        </p>
      </div>
      <div style="flex: 1; min-width: 0">
        <oas-virtual-list id="vl-buffer-8" height="160" item-height="32" buffer="8"></oas-virtual-list>
        <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
          <code>buffer="8"</code>：渲染项数 <span id="vl-buffer-8-count">—</span>，上下各多预渲染 8 项。
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
  // 基础：1000 条定高渲染
  const basic = document.querySelector('#vl-basic')
  if (basic) basic.items = Array.from({ length: 1000 }, (_, i) => `第 ${i + 1} 条`)

  // 自定义条目内容：oas-item 事件绑定
  const itemList = document.querySelector('#vl-item')
  if (itemList) {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      label: `任务 #${i + 1}`,
      status: ['进行中', '已完成', '待开始'][i % 3],
    }))
    itemList.items = rows
    itemList.addEventListener('oas-item', (e) => {
      const { item, element } = e.detail
      element.textContent = `${item.id} · ${item.label} · ${item.status}`
    })
  }

  // 滚动事件窗口展示
  const scroller = document.querySelector('#vl-scroll')
  if (scroller) {
    scroller.items = Array.from({ length: 200 }, (_, i) => i + 1)
    scroller.addEventListener('oas-scroll', (e) => {
      const { scrollTop, start, end } = e.detail
      document.querySelector('#vl-window').textContent = `${start}–${end}`
      document.querySelector('#vl-scrolltop').textContent = String(scrollTop)
    })
  }

  // 自定义滚动容器
  const target = document.querySelector('#vl-target')
  if (target) target.items = Array.from({ length: 500 }, (_, i) => `记录 ${i + 1}`)

  // 渲染缓冲对比：统计实际渲染到 DOM 的项数
  const buf0 = document.querySelector('#vl-buffer-0')
  const buf8 = document.querySelector('#vl-buffer-8')
  const bufItems = Array.from({ length: 100 }, (_, i) => `缓冲项 ${i + 1}`)
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

| Attribute        | Description                                                                   | Type        | Default |
| ---------------- | ----------------------------------------------------------------------------- | ----------- | ------- |
| `items`          | Data array (property channel, takes precedence over the `items` attribute)    | `unknown[]` | `[]`    |
| `items`          | Data JSON string (attribute channel)                                          | string      | —       |
| `height`         | Viewport height (px)                                                          | number      | `320`   |
| `item-height`    | Fixed height of each item (px)                                                | number      | `36`    |
| `buffer`         | Number of items pre-rendered above/below (rendered early beyond the visible area to reduce scrolling blanks) | number      | `4`     |
| `scroll-target`  | CSS selector of the external scroll container; when set, the component has no scrollbar of its own and listens to the external scroll | string      | —       |

| Event         | Description                                                       |
| ------------- | ----------------------------------------------------------------- |
| `oas-scroll`  | Scroll event (rAF throttled), `detail: { scrollTop, start, end }` |
| `oas-item`    | Emitted after each visible item renders, `detail: { index, item, element }` |

| Slot                       | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `template[slot="item"]`    | Static per-item template, cloned into each visible item container (optional) |

Parts: `::part(viewport)` scroll viewport, `::part(inner)` content, `::part(padding-top)` / `::part(padding-bottom)` placeholders, `::part(item)` a single item.
