# SSR 边界策略

OAS-UI 是 Web Components 组件库，组件在浏览器运行时自定义元素、Shadow DOM 与事件。在 SSR / 静态生成环境下需要遵循以下边界。

## 核心规则

**不要在服务端渲染期间执行组件库的副作用导入。**

组件库入口 `@oas-ui/ui` 会调用 `customElements.define` 与 DOM API，在 Node（无 DOM）环境下会抛错（如 `HTMLElement is not defined`）。

## DSD 路线（渐进增强）

组件库的 SSR 长期策略走 Declarative Shadow DOM（DSD）路线：服务端输出 `<template shadowrootmode="open">` 的静态结构 + 样式，浏览器 upgrade 自定义元素后由组件接管交互。

当前进展：

- 基类 `OASElement` 已支持复用 declarative shadow root：元素在 upgrade 前已由 `<template shadowrootmode="open">` 挂好 shadow root 时，构造器复用已有 root，不再调用 `attachShadow`（否则会抛 `NotSupportedError` 导致组件报废）。
- `@oas-ui/ssr` 渲染器已落地：Node 环境用 happy-dom 起最小 DOM shim，注册组件类后按入参渲染并把 shadow 快照序列化为 DSD，输出完整宿主 HTML 字符串（见「服务端渲染（实验）」）。
- 真水合：upgrade 检测到 DSD 快照指纹时跳过 shadow 重建，只缓存节点并绑定事件 + 增量 update；快照结构不符时回退全量重渲染（正确性优先）。
- 数据组件声明式数据通道：table / tree / select 的 `columns` / `data` / `options` 走 JSON attribute 声明式通道（property 优先，非法 JSON 回退空态），SSR 快照可序列化表头与数据行 / 树节点行 / 下拉选项。
- 测量组件首帧闪动治理：affix / ellipsis / scroll-area 检测到 DSD 快照时把布局写入延迟到首帧后（rAF）——快照 = 未校正态，upgrade 首帧与快照一致无跳动，rAF 后按真实布局校正。

尚未落地（ROADMAP backlog）：

- 框架集成插件（Nuxt / Next）。

白名单组件可直接服务端渲染；其余组件仍按"客户端专属"方式接入（见下）。

### Vue（Nuxt / Vite SSR）

使用动态导入并在客户端挂载后执行：

```ts
// 只在客户端加载
onMounted(async () => {
  const { OASMessage } = await import('@oas-ui/ui')
  OASMessage?.success?.('已加载')
})
```

```html
<ClientOnly>
  <oas-table :columns="…"></oas-table>
</ClientOnly>
```

### React（Next.js）

只在客户端渲染组件：

```tsx
'use client'
import { useEffect, useState } from 'react'
```

或在 `next/dynamic` 中禁用 SSR：

```tsx
const Table = dynamic(() => import('./TablePage'), { ssr: false })
```

### 原生 / 其他框架

服务端只输出静态占位，脚本资源由浏览器执行注册。

## 服务端渲染（实验）

`@oas-ui/ssr` 包提供渲染器 `renderToString(tag, attrs, slotHTML, { locale })`：在 Node 服务端把白名单组件渲染为「宿主标签 + `<template shadowrootmode="open">` 快照」的完整 HTML 字符串。浏览器拿到该字符串后无需 JS 即可呈现结构与样式；随后加载组件库脚本完成 upgrade，由组件接管交互。

> 注意：SSR 快照的 shadow 内联样式引用 `--oas-*` 主题 token（token 定义在 `@oas-ui/theme` 的 `:root`）。页面必须照常引入 `@oas-ui/theme`，否则快照中的组件没有颜色（token 解析失败回落到透明）。

```ts
import { renderToString } from '@oas-ui/ssr'

const html = await renderToString(
  'oas-button',
  { type: 'primary', size: 'large' },
  '提交',
  { locale: 'zh-CN' },
)
// '<oas-button type="primary" size="large"><template shadowrootmode="open">…</template>提交</oas-button>'
```

**为什么 async**：组件类求值依赖全局 DOM shim（`class extends HTMLElement` 需要 `HTMLElement` / `customElements` 已就位），静态 import 会提前求值、无法保证「先装 shim 再装载组件」的顺序，故首次调用时动态装载组件模块（shim 先就位）；模块加载后缓存，后续调用开销仅为渲染本身。

> 注意：DSD 模板由浏览器** HTML 解析器**附加 shadow root，`innerHTML` 等运行时字符串注入不会触发附加。产出字符串应经由 SSR 输出流（服务端渲染的 HTML 响应）送达浏览器。

### Nuxt（Nitro server route）

```ts
// server/api/ssr-demo.ts
import { renderToString } from '@oas-ui/ssr'

export default defineEventHandler(async () => {
  const button = await renderToString('oas-button', { type: 'primary' }, '提交')
  const empty = await renderToString('oas-empty', { description: '暂无数据' })
  return `<div class="ssr-demo">${button}${empty}</div>`
})
```

页面侧把该 HTML 合入服务端渲染输出流，浏览器解析即呈现结构，随后加载组件库脚本接管交互。

### Next.js（RSC async 组件）

```tsx
// app/ssr-demo/page.tsx
import { renderToString } from '@oas-ui/ssr'

export default async function SsrDemoPage() {
  const button = await renderToString('oas-button', { type: 'primary' }, '提交')
  const divider = await renderToString('oas-divider', { 'content-position': 'left' }, '分割线')
  return (
    <section
      dangerouslySetInnerHTML={{ __html: `<div class="ssr-demo">${button}${divider}</div>` }}
    />
  )
}
```

RSC 在服务端完成渲染，`dangerouslySetInnerHTML` 的字面量进入 SSR 输出流，由浏览器解析器附加 DSD。

### 白名单与边界

- 白名单（纯展示组件 + 声明式数据组件 + 测量组件闪动治理试点）：`oas-button`、`oas-tag`、`oas-empty`、`oas-divider`、`oas-text`、`oas-title`、`oas-paragraph`、`oas-table`、`oas-affix`、`oas-ellipsis`、`oas-scroll-area`、`oas-tree`、`oas-select`。
- 非白名单调用直接抛错，不会静默降级。
- `oas-table` / `oas-tree` / `oas-select` 的 `columns` / `data` / `options` 走 JSON attribute 声明式通道（property 优先，非法 JSON 回退空态），SSR 快照含表头与数据行 / 树节点行 / 下拉选项。
- 测量组件（affix / ellipsis / scroll-area）快照为未校正态（happy-dom 布局测量全 0），upgrade 首帧与快照一致，rAF 后按真实布局校正——这是闪动治理的设计语义。
- 真水合：upgrade 时跳过 shadow 重建（DOM 引用保持），只缓存节点并绑定事件 + 增量 update；快照结构不符时回退全量重渲染。

## 为什么

1. `customElements.define` 需要真实 DOM。
2. Shadow DOM 样式与布局依赖浏览器渲染。
3. 事件派发（`oas-change` 等 CustomEvent）只在浏览器有意义。

DSD 静态快照解决的是"无 JS 时能看到结构"的渐进增强问题；交互仍由浏览器运行时水合完成，`customElements.define` 与事件派发的边界不变。

## 三行引入（客户端）

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script type="module">
  import '@oas-ui/ui'
</script>
```

## 测试验证

- 单测在 happy-dom（模拟 DOM）环境执行；基类对已有 declarative shadow root 的复用行为有专门回归用例。
- e2e 在真实 Chromium 中执行，同时跑 axe 无障碍审计。
- DSD 静态页 e2e：构建期用 `renderToString` 产 DSD 静态页，验证禁 JS 时结构样式完整可见、upgrade 无 `NotSupportedError` 且 console 零报错、前后截图无闪动、事件可触发。
- 文档站（Vitepress）为 SSR 站点，demo 页一律在 `onMounted` 后动态 import 组件，作为 SSR 边界回归用例。
