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

### Declarative Shadow DOM polyfill（`@oas-ui/ssr/polyfill`）

响应 HTML 里的 `<template shadowrootmode>` 由浏览器**文档解析期**消费：Chromium / Firefox / WebKit 现代版本均原生支持，无需 polyfill。需要本子路径的只有两种情况：**旧引擎**，以及**运行期注入**（`innerHTML` / `insertAdjacentHTML` 注入 SSR 快照——任何引擎的片段解析都不会自动附加声明式 shadow root，且快照模板会作为惰性元素残留）。

```ts
// 顺序契约：polyfill 必须先于组件注册求值，组件 upgrade 才能按 SSR 指纹真水合
import '@oas-ui/ssr/polyfill'
import '@oas-ui/ui'
```

模块求值即扫描并挂载整份文档内的 DSD 模板（文档仍在解析时等 `DOMContentLoaded`）；递归处理嵌套 DSD、支持 `open` / `closed`、幂等（已挂载的模板被移除，二次执行零命中），宿主已有 shadow root 时只清理残留模板、不覆盖已有内容。

运行期注入的场景可手动机注（原生支持片段解析的引擎需要 `force`）：

```ts
import { hydrateDeclarativeShadowRoots } from '@oas-ui/ssr/polyfill'

container.innerHTML = ssrSnapshotHtml
hydrateDeclarativeShadowRoots(container, { force: true }) // => 是否真的挂载了 shadow root
```

`isDeclarativeShadowDomSupported()` 是**片段解析**能力探测（结果模块级缓存）：返回 `true` 时 `hydrateDeclarativeShadowRoots` 直接 no-op（该引擎注入时已自动挂载）。探测不写页面、不刷控制台警告。

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

### Declarative Shadow DOM polyfill (`@oas-ui/ssr/polyfill`)

`<template shadowrootmode>` in the response HTML is consumed by the **document parser**: modern Chromium / Firefox / WebKit all support it natively, no polyfill needed. This subpath is for two cases only: **older engines**, and **runtime injection** (`innerHTML` / `insertAdjacentHTML` with an SSR snapshot — fragment parsing never attaches declarative shadow roots in any engine, and the templates stay behind as inert elements).

```ts
// Ordering contract: the polyfill must evaluate before component registration,
// so upgrade can hydrate the SSR snapshot by fingerprint
import '@oas-ui/ssr/polyfill'
import '@oas-ui/ui'
```

Module evaluation scans and mounts every DSD template in the document (defers to `DOMContentLoaded` if the document is still parsing); nested DSD is handled recursively, `open` / `closed` are supported, and it is idempotent (mounted templates are removed, a second run finds nothing). If a host already has a shadow root, only the leftover template is removed — existing content is never overwritten.

For runtime injection you can call it explicitly (engines with fragment-level DSD need `force`):

```ts
import { hydrateDeclarativeShadowRoots } from '@oas-ui/ssr/polyfill'

container.innerHTML = ssrSnapshotHtml
hydrateDeclarativeShadowRoots(container, { force: true }) // => whether a shadow root was mounted
```

`isDeclarativeShadowDomSupported()` probes **fragment-level** DSD (cached per module): when it returns `true`, `hydrateDeclarativeShadowRoots` is a no-op because the engine already attached the root on injection. The probe writes no DOM and logs no console warnings.

> **Acceptance fixtures (not shipped with this package)**: `packages/ssr/fixtures/{next,nuxt}` in the repository are Next.js / Nuxt production-build + real-browser checks with their own `package.json` / lockfiles, outside the npm `files` list and outside the root workspace. When integrating with a framework's SSR, note that the first `@oas-ui/ssr` render installs a happy-dom global DOM shim; **do not share the process with framework SSR** (it changes the framework's environment detection) — render in a worker, child process, or dedicated service.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library |
| `@oas-ui/next` | Next.js (App Router) integration |
| `@oas-ui/nuxt` | Nuxt 3/4 module integration |
