# @oas-ui/nuxt

OAS-UI 的 Nuxt 3 module —— SSR（DSD 快照）开箱即用。

## 安装

```bash
pnpm add @oas-ui/nuxt @oas-ui/ssr @oas-ui/theme
```

## 用法

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@oas-ui/nuxt'],
})
```

module 自动完成三件事：

1. **Vue isCustomElement**：`vite:extendConfig` 钩子把 `oas-*` 前缀注册进 `compilerOptions.isCustomElement`（与既有配置合并），Vue 不再把 `oas-*` 当组件解析、不再告警
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
