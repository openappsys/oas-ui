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

## 滚动到指定项

`scrollToIndex(index, options?)` 方法滚动到指定索引：`options.align` 支持 `start`（项顶对齐视口顶）/ `center`（垂直居中）/ `end`（项底对齐视口底）/ `auto`（默认，已完整可见则不滚动，否则最小距离滚入视口）；`options.smooth` 开启平滑滚动。list / tree 等内嵌消费方的行定位也走这一公共契约（不直查内部 DOM）。

<DemoBlock title="scrollToIndex 滚动定位">
  <div style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-2); margin-bottom: var(--oas-space-3); align-items: center; flex-wrap: wrap">
      <oas-input id="vl-jump-index" type="number" value="500" style="width: 120px"></oas-input>
      <select id="vl-jump-align" style="padding: 5px var(--oas-space-2); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg); color: var(--oas-color-text-primary); font-size: var(--oas-font-size-md)">
        <option value="auto">auto（最小滚动）</option>
        <option value="start">start（顶对齐）</option>
        <option value="center">center（居中）</option>
        <option value="end">end（底对齐）</option>
      </select>
      <oas-button id="vl-jump-btn" size="small" type="primary">跳转</oas-button>
      <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前 scrollTop：<span id="vl-jump-top">0</span></span>
    </div>
    <oas-virtual-list id="vl-jump" height="240" item-height="32"></oas-virtual-list>
  </div>
</DemoBlock>

## 动态行高

`dynamic-height` 开启后各行高度可不同：未测行按 `estimated-item-height`（缺省沿用 `item-height`）预估排布，窗口行由 `ResizeObserver` 实测回写并逐步修正总高与偏移；视口上方行高变化会自动补偿 scrollTop 保持视觉锚定（向上滚动不跳动）。`scrollToIndex` 在动态模式下同样可用（按高度表定位）。预估值取接近真实平均行高时修正幅度最小。

<DemoBlock title="动态行高（不等高条目混排）">
  <div style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-2); margin-bottom: var(--oas-space-3); align-items: center">
      <oas-button id="vl-dyn-jump" size="small">scrollToIndex(40)</oas-button>
      <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">总行高随实测逐步修正，滚动流畅不跳动</span>
    </div>
    <oas-virtual-list id="vl-dyn" height="280" dynamic-height estimated-item-height="56"></oas-virtual-list>
  </div>
</DemoBlock>

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

  // 滚动到指定项：索引输入 + 对齐方式
  const jump = document.querySelector('#vl-jump')
  if (jump) {
    jump.items = Array.from({ length: 1000 }, (_, i) => `条目 ${i + 1}`)
    jump.addEventListener('oas-scroll', (e) => {
      const top = document.querySelector('#vl-jump-top')
      if (top) top.textContent = String(e.detail.scrollTop)
    })
    const jumpBtn = document.querySelector('#vl-jump-btn')
    jumpBtn?.addEventListener('click', () => {
      // whenDefined 守卫：方法调用必须晚于自定义元素升级
      customElements.whenDefined('oas-virtual-list').then(() => {
        const raw = Number(document.querySelector('#vl-jump-index')?.value)
        const index = Math.min(Math.max(1, Math.trunc(raw) || 1), 1000) - 1
        const align = document.querySelector('#vl-jump-align')?.value ?? 'auto'
        jump.scrollToIndex(index, { align })
      })
    })
  }

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

  // 动态行高：不等高卡片行混排（标题 + 行数不一的描述文本）
  const dyn = document.querySelector('#vl-dyn')
  if (dyn) {
    const rows = Array.from({ length: 80 }, (_, i) => ({
      title: `事项 ${i + 1}`,
      lines: (i % 3) + 1,
      tag: ['常规', '重点', '加急'][i % 3],
    }))
    dyn.items = rows
    dyn.addEventListener('oas-item', (e) => {
      const { item, element } = e.detail
      element.style.padding = 'var(--oas-space-2) var(--oas-space-3)'
      element.style.borderBottom = '1px solid var(--oas-color-border)'
      element.style.boxSizing = 'border-box'
      const head = document.createElement('div')
      head.style.cssText = 'display:flex;justify-content:space-between;font-weight:500'
      head.innerHTML = `<span></span><span style="color:var(--oas-color-primary);font-size:var(--oas-font-size-xs)"></span>`
      head.children[0].textContent = item.title
      head.children[1].textContent = item.tag
      element.appendChild(head)
      for (let k = 0; k < item.lines; k++) {
        const p = document.createElement('div')
        p.style.cssText = 'color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);line-height:1.5'
        p.textContent = `描述第 ${k + 1} 行：高度随行数变化`
        element.appendChild(p)
      }
    })
    const jumpBtn = document.querySelector('#vl-dyn-jump')
    jumpBtn?.addEventListener('click', () => dyn.scrollToIndex(40, { align: 'start' }))
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `buffer` | 上下预渲染项数（超出可视区提前渲染，减少滚动白屏） | `string` | `4` |
| `dynamic-height` | 动态行高：各行高度可不同（未测行按预估排布，窗口行实测回写逐步修正；视口上方行高变化自动补偿 scrollTop 防跳动） | `boolean` | — |
| `estimated-item-height` | 动态行高的预估行高（px，缺省沿用 item-height；取接近真实平均行高修正幅度最小） | `string` | — |
| `height` | 视口高度（px） | `string` | `320` |
| `item-height` | 每项固定高度（px） | `string` | `36` |
| `items` | 数据数组（property 通道，优先于 items 属性）；数据 JSON 字符串（属性通道） | `unknown[]` | `[]` |
| `scroll-target` | 外部滚动容器 CSS 选择器；设置后组件不自带滚动条，监听外部滚动 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-item` | 每个可见项渲染后派发，`detail: { index, item, element }` |
| `oas-scroll` | 滚动事件（rAF 节流），`detail: { scrollTop, start, end }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="item"]` | 每项静态模板，克隆到每个可见项容器（可选） |

部件：`::part(viewport)` 滚动视口、`::part(inner)` 内容、`::part(padding-top)` / `::part(padding-bottom)` 占位、`::part(item)` 单项。
