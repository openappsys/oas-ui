# @oas-ui/nuxt

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 的 Nuxt 3/4 module —— SSR（DSD 快照）开箱即用。

### 安装

```bash
pnpm add @oas-ui/nuxt @oas-ui/ssr @oas-ui/theme
```

> peer 范围：`@nuxt/kit` 为 `^3.16.0 || ^4.0.0`。仓库内 Nuxt 4 fixture（`packages/ssr/fixtures/nuxt`）
> 以 `--frozen-lockfile` 安装并跑通生产构建 + e2e，等于在真实 Nuxt 4 工程里证明该 peer 可满足；
> `@nuxt/schema` 仅用于类型（`NuxtModule`），登记为同范围的 optional peer（Nuxt 3/4 自带）。

### 用法

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@oas-ui/nuxt'],
})
```

module 自动完成三件事：

1. **Vue isCustomElement**：setup 阶段写入 `nuxt.options.vue.compilerOptions.isCustomElement`（Nuxt 4 实际读取的位置），并保留 `vite:extendConfig` 钩子兼容早期 Nuxt 3；`oas-*` 前缀与既有配置合并，Vue 不再把 `oas-*` 当组件解析、不再告警
2. **theme CSS 注入**：`@oas-ui/theme` 自动追加到 `nuxt.options.css`（DSD 快照引用的 `--oas-*` token 全局可用）；可用 `oasUi: { theme: false }` 关闭或传自定义 CSS 入口
3. **SSR helper 自动导入**：`renderOasToString` / `useOasRender`（来自 `@oas-ui/nuxt/ssr`）免 import 直接调用

```ts
// server/api/ssr-demo.ts（renderOasToString 已自动导入）
export default defineEventHandler(async () => {
  const button = await renderOasToString('oas-button', { type: 'primary' }, '提交')
  const empty = await renderOasToString('oas-empty', { description: '暂无数据' }, '', {
    locale: 'zh-CN',
  })
  return `<div class="ssr-demo">${button}${empty}</div>`
})
```

也可显式导入：

```ts
import { renderOasToString } from '@oas-ui/nuxt/ssr'
```

客户端 upgrade：页面按需动态 import `@oas-ui/ui`（见文档站 SSR 指南「客户端专属」小节）。

> 进程级副作用声明：`renderOasToString` 首次调用会装载 happy-dom DOM shim 到 `globalThis`（`@oas-ui/ssr` 的既有行为，详见其声明）。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ssr` | 服务端 DSD 渲染引擎 |
| `@oas-ui/theme` | 设计 token（CSS 变量） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/nuxt` — the Nuxt 3/4 module for OAS-UI. SSR (DSD snapshots) works out of the box.

### Install

```bash
pnpm add @oas-ui/nuxt @oas-ui/ssr @oas-ui/theme
```

> Peer range: `@nuxt/kit` is `^3.16.0 || ^4.0.0`. The in-repo Nuxt 4 fixture (`packages/ssr/fixtures/nuxt`)
> installs with `--frozen-lockfile` and passes the production build + e2e, which proves this peer is
> satisfiable in a real Nuxt 4 project; `@nuxt/schema` is type-only (`NuxtModule`) and registered as an
> optional peer with the same range (Nuxt 3/4 ships it).

### Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@oas-ui/nuxt'],
})
```

The module does three things automatically:

1. **Vue isCustomElement**: setup writes `nuxt.options.vue.compilerOptions.isCustomElement` (the location Nuxt 4 actually reads) and keeps the `vite:extendConfig` hook for early Nuxt 3; the `oas-*` prefix is merged with existing config, so Vue no longer parses `oas-*` as components or warns about them
2. **theme CSS injection**: `@oas-ui/theme` is appended to `nuxt.options.css` automatically (making `--oas-*` tokens referenced by DSD snapshots globally available); disable with `oasUi: { theme: false }` or pass a custom CSS entry
3. **SSR helper auto-import**: `renderOasToString` / `useOasRender` (from `@oas-ui/nuxt/ssr`) are callable without an explicit import

```ts
// server/api/ssr-demo.ts（renderOasToString auto-imported）
export default defineEventHandler(async () => {
  const button = await renderOasToString('oas-button', { type: 'primary' }, '提交')
  const empty = await renderOasToString('oas-empty', { description: '暂无数据' }, '', {
    locale: 'zh-CN',
  })
  return `<div class="ssr-demo">${button}${empty}</div>`
})
```

Or import explicitly:

```ts
import { renderOasToString } from '@oas-ui/nuxt/ssr'
```

Client-side upgrade: pages dynamically `import('@oas-ui/ui')` on demand (see the "Client-only" section of the SSR guide on our docs site).

> Process-level side-effect note: the first call to `renderOasToString` mounts a happy-dom DOM shim onto `globalThis` (existing behavior of `@oas-ui/ssr`; see its declaration).

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ssr` | Server-side DSD rendering engine |
| `@oas-ui/theme` | Design tokens (CSS variables) |
