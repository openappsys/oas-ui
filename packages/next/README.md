# @oas-ui/next

[中文](#中文) | [English](#english)

## 中文

OAS-UI 的 Next.js（App Router）集成 —— RSC 服务端产 DSD 快照 + 客户端注册引导。

### 安装

```bash
pnpm add @oas-ui/next @oas-ui/ssr @oas-ui/ui
```

### 用法

#### 1. 服务端：RSC `OasComponent`（`@oas-ui/next/server`）

在服务端调用 `renderToString` 产出「宿主标签 + `<template shadowrootmode="open">` DSD 快照」，经 `dangerouslySetInnerHTML` 进入 SSR 输出流：

```tsx
// app/ssr-demo/page.tsx（Server Component）
import { OasComponent } from '@oas-ui/next/server'

export default function SsrDemoPage() {
  return (
    <section>
      <OasComponent tag="oas-button" attrs={{ type: 'primary' }}>
        提交
      </OasComponent>
      <OasComponent tag="oas-divider" attrs={{ 'content-position': 'left' }}>
        分割线
      </OasComponent>
    </section>
  )
}
```

`attrs` 值支持 `string | number | boolean`（自动序列化）；`slotHTML` 可直接传原始 HTML（与 `children` 同时给出时优先）；`renderOptions={{ locale: 'en' }}` 控制内置文案语言。

#### 2. 客户端：`OasRegistry` 注册引导（`@oas-ui/next`）

"use client" 副作用 `import '@oas-ui/ui'` 完成全局注册，整个应用的 `oas-*` 元素 upgrade 后由组件接管交互：

```tsx
// app/layout.tsx
import { OasRegistry } from '@oas-ui/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <OasRegistry>
      <html lang="zh-CN">
        <body>{children}</body>
      </html>
    </OasRegistry>
  )
}
```

#### 低层能力

`renderOas(tag, attrs, slotHTML, opts)`（`@oas-ui/next`）为 `renderToString` 的纯逻辑包装，无 React 依赖，适合自定义包装场景。

> 注意：DSD 模板由浏览器 **HTML 解析器**附加 shadow root——初始 SSR 由服务端输出流解析生效；客户端软导航（RSC flight 重建）走 `innerHTML` 注入不会附加 DSD，此时组件已在客户端注册（OasRegistry），由自定义元素自渲染接管，属渐进增强模型。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ssr` | 服务端 DSD 渲染引擎 |
| `@oas-ui/ui` | 组件库主包 |

[中文](#中文) | [English](#english)

## English

`@oas-ui/next` — the Next.js (App Router) integration for OAS-UI. RSC server-side DSD snapshots + client registration bootstrapping.

### Install

```bash
pnpm add @oas-ui/next @oas-ui/ssr @oas-ui/ui
```

### Usage

#### 1. Server: RSC `OasComponent` (`@oas-ui/next/server`)

Calls `renderToString` server-side to produce a host element + `<template shadowrootmode="open">` DSD snapshot, injected into the SSR output stream via `dangerouslySetInnerHTML`:

```tsx
// app/ssr-demo/page.tsx (Server Component)
import { OasComponent } from '@oas-ui/next/server'

export default function SsrDemoPage() {
  return (
    <section>
      <OasComponent tag="oas-button" attrs={{ type: 'primary' }}>
        提交
      </OasComponent>
      <OasComponent tag="oas-divider" attrs={{ 'content-position': 'left' }}>
        分割线
      </OasComponent>
    </section>
  )
}
```

`attrs` values accept `string | number | boolean` (auto-serialized); `slotHTML` accepts raw HTML (takes priority when `children` is also given); `renderOptions={{ locale: 'en' }}` controls the built-in text language.

#### 2. Client: `OasRegistry` registration (`@oas-ui/next`)

A "use client" side-effect `import '@oas-ui/ui'` performs global registration. After upgrade, `oas-*` elements across the app are managed by the components:

```tsx
// app/layout.tsx
import { OasRegistry } from '@oas-ui/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <OasRegistry>
      <html lang="zh-CN">
        <body>{children}</body>
      </html>
    </OasRegistry>
  )
}
```

#### Lower-level API

`renderOas(tag, attrs, slotHTML, opts)` (`@oas-ui/next`) is a pure logic wrapper around `renderToString` with no React dependency — suitable for custom wrappers.

> Note: the DSD template is attached to the shadow root by the browser's **HTML parser** — the initial SSR output stream parses and applies it. Client-side soft navigation (RSC flight rebuild) injects via `innerHTML` and won't attach DSD; at that point components are already registered client-side (OasRegistry) and the custom elements self-render — a progressive enhancement model.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ssr` | Server-side DSD rendering engine |
| `@oas-ui/ui` | Main UI library |
