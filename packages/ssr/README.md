# @oas-ui/ssr

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 服务端渲染（SSR）包 —— 在 Node 环境将组件渲染为 Declarative Shadow DOM（DSD）静态快照，首屏不依赖 JS 即可呈现结构与样式，水合（upgrade）后组件接管交互。

### 安装

```bash
pnpm add @oas-ui/ssr
```

### 使用

```ts
import { renderToString } from '@oas-ui/ssr'

const html = await renderToString('oas-button', { type: 'primary' }, '提交', { locale: 'zh-CN' })
// <oas-button type="primary"><template shadowrootmode="open">…</template>提交</oas-button>
```

支持按需（单组件 / 部分 / 全部）渲染，首屏无 JS 样式闪现。`locale` 支持内置语言名子集 `zh-CN` / `zh-Hant` / `en` / `ja` / `ko` / `de` / `fr` / `es` / `pt`（指向 `pt-BR` 的兼容别名） / `pt-BR` / `ru` / `ar` / `hi` / `th` / `uk` / `he` / `fa`（ar/he/fa 为 RTL，并接受 BCP 47 别名，如 `zh-TW` → `zh-Hant`、`en_US` → `en`；按需装载语言包）；类型为 `RenderLocale | (string & {})`，自定义 locale 名无需断言。未注册 locale 会 devWarn 一次并回退 `en`。**自定义语言包必须在首次 `renderToString`（安装 DOM shim）之后再 `registerLocale()`** 并按名传入——`@oas-ui/i18n` 主入口求值 `class extends HTMLElement`，裸 Node 下先注册会抛 `HTMLElement is not defined`。devWarn 在 `NODE_ENV=production` 下静默。详见文档站 SSR 指南。

> **验收 fixture（不随本包分发）**：仓库内 `packages/ssr/fixtures/{next,nuxt}` 是 Next.js / Nuxt 生产构建 + 真实浏览器验收用例，独立 `package.json` / lockfile 安装与构建，不在 npm `files` 内，也不属于根 workspace。使用本包做真实框架接入时，`@oas-ui/ssr` 首次渲染会安装 happy-dom 全局 DOM shim；**不要与框架 SSR 共用同一进程**（会改变框架的环境探测），请放到 worker / 子进程或独立服务。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包 |
| `@oas-ui/next` | Next.js（App Router）集成 |
| `@oas-ui/nuxt` | Nuxt 3/4 module 集成 |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/ssr` — the server-side rendering (SSR) package of OAS-UI. Renders components to static Declarative Shadow DOM (DSD) snapshots on Node. Structure and styles are visible on first paint without JavaScript; interactivity is taken over after hydration (upgrade).

### Install

```bash
pnpm add @oas-ui/ssr
```

### Usage

```ts
import { renderToString } from '@oas-ui/ssr'

const html = await renderToString('oas-button', { type: 'primary' }, '提交', { locale: 'zh-CN' })
// <oas-button type="primary"><template shadowrootmode="open">…</template>提交</oas-button>
```

Supports on-demand rendering (single / partial / all components) with no style flash on first paint. `locale` accepts the built-in subset plus any custom name (`RenderLocale | (string & {})`); register a custom pack with `registerLocale()` **after** the first `renderToString` call (which installs the DOM shim) — importing `@oas-ui/i18n` first in bare Node throws `HTMLElement is not defined`. Unregistered locales warn once (`devWarn` is silent under `NODE_ENV=production`) and fall back to `en`. See the SSR guide on our docs site.

> **Acceptance fixtures (not shipped with this package)**: `packages/ssr/fixtures/{next,nuxt}` in the repository are Next.js / Nuxt production-build + real-browser checks with their own `package.json` / lockfiles, outside the npm `files` list and outside the root workspace. When integrating with a framework's SSR, note that the first `@oas-ui/ssr` render installs a happy-dom global DOM shim; **do not share the process with framework SSR** (it changes the framework's environment detection) — render in a worker, child process, or dedicated service.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library |
| `@oas-ui/next` | Next.js (App Router) integration |
| `@oas-ui/nuxt` | Nuxt 3/4 module integration |
