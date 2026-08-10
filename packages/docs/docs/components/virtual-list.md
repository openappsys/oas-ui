# VirtualList 虚拟列表

用于大数据量列表的视口窗口渲染：只渲染可见项（含上下缓冲），首尾 padding 占位撑起滚动高度，滚动事件按 rAF 节流。通用渲染原语，供 table / tree 复用。

## 基础用法

<DemoBlock title="定高虚拟列表">
  <div style="width: 100%">
    <oas-virtual-list id="vl-basic" height="320" item-height="36"></oas-virtual-list>
  </div>
</DemoBlock>

通过 `items` property（或 `items` 属性传 JSON 字符串）提供数据，`height` 定视口高度、`item-height` 定每项高度；未提供模板时默认渲染 `String(item)`。

## 自定义条目内容

<DemoBlock title="oas-item 事件绑定内容">
  <div style="width: 100%">
    <oas-virtual-list id="vl-item" height="280" item-height="44"></oas-virtual-list>
  </div>
</DemoBlock>

每个可见项渲染后派发 `oas-item`，`detail` 携带 `{ index, item, element }`，宿主据此填充条目内容；也可以在组件内放 `<template slot="item">` 作为每项静态模板。

## 滚动事件

<DemoBlock title="oas-scroll 窗口展示">
  <div style="width: 100%">
    <oas-virtual-list id="vl-scroll" height="200" item-height="32"></oas-virtual-list>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      可见窗口：<span id="vl-window">0–0</span> · scrollTop：<span id="vl-scrolltop">0</span>
    </p>
  </div>
</DemoBlock>

滚动事件按 rAF 节流派发 `oas-scroll`，`detail` 为 `{ scrollTop, start, end }`。

## 渲染缓冲

`buffer` 控制上下超出可视区的预渲染项数（默认 `4`）：buffer 越大，滚动时越少出现空白（白屏），代价是渲染的 DOM 节点更多。

<DemoBlock title="渲染缓冲 buffer">
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

## 自定义滚动容器

<DemoBlock title="scroll-target 外部容器">
  <div style="width: 100%">
    <div id="vl-outer" style="height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <oas-virtual-list id="vl-target" scroll-target="#vl-outer" height="240" item-height="36"></oas-virtual-list>
    </div>
  </div>
</DemoBlock>

设置 `scroll-target`（CSS 选择器）后，组件不自带滚动条，改由外部容器滚动整段内容（如页面级滚动），窗口按外部容器的 `scrollTop` 计算。

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

| 属性            | 说明                                                          | 类型        | 默认值 |
| --------------- | ------------------------------------------------------------- | ----------- | ------ |
| `items`         | 数据数组（property 通道，优先于 items 属性）                  | `unknown[]` | `[]`   |
| `items`         | 数据 JSON 字符串（属性通道）                                  | string      | —      |
| `height`        | 视口高度（px）                                                | number      | `320`  |
| `item-height`   | 每项固定高度（px）                                            | number      | `36`   |
| `buffer`        | 上下预渲染项数（超出可视区提前渲染，减少滚动白屏）            | number      | `4`    |
| `scroll-target` | 外部滚动容器 CSS 选择器；设置后组件不自带滚动条，监听外部滚动 | string      | —      |

| 事件         | 说明                                                      |
| ------------ | --------------------------------------------------------- |
| `oas-scroll` | 滚动事件（rAF 节流），`detail: { scrollTop, start, end }` |
| `oas-item`   | 每个可见项渲染后派发，`detail: { index, item, element }`  |

| 插槽                    | 说明                                       |
| ----------------------- | ------------------------------------------ |
| `template[slot="item"]` | 每项静态模板，克隆到每个可见项容器（可选） |

部件：`::part(viewport)` 滚动视口、`::part(inner)` 内容、`::part(padding-top)` / `::part(padding-bottom)` 占位、`::part(item)` 单项。
