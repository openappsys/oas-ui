# SSR 边界策略

OAS-UI 是 Web Components 组件库，组件在浏览器运行时自定义元素、Shadow DOM 与事件。在 SSR / 静态生成环境下需要遵循以下边界。

## 核心规则

**不要在服务端渲染期间执行组件库的副作用导入。**

组件库入口 `@oas-ui/ui` 会调用 `customElements.define` 与 DOM API，在 Node（无 DOM）环境下会抛错（如 `HTMLElement is not defined`）。

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

## 为什么

1. `customElements.define` 需要真实 DOM。
2. Shadow DOM 样式与布局依赖浏览器渲染。
3. 事件派发（`oas-change` 等 CustomEvent）只在浏览器有意义。

## 三行引入（客户端）

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css">
<script type="module">
  import '@oas-ui/ui'
</script>
```

## 测试验证

- 单测在 happy-dom（模拟 DOM）环境执行。
- e2e 在真实 Chromium 中执行，同时跑 axe 无障碍审计。
- 文档站（Vitepress）为 SSR 站点，demo 页一律在 `onMounted` 后动态 import 组件，作为 SSR 边界回归用例。
