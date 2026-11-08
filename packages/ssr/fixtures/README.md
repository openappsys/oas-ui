# SSR 验收 fixture（Next / Nuxt）

> 这些目录是仓库内的**生产构建 + 真实浏览器验收 fixture**，不是 `@oas-ui/ui` / `@oas-ui/ssr` 等发布包的一部分：
> 不在根 `pnpm-workspace.yaml`（`packages/*`）中，不会被根 `pnpm install` / `pnpm build` 安装或构建，
> 也不进入任何 npm 包的 `files` 清单。

## Node 版本

fixture 与根仓库共享同一 Node 支持范围：`^22.18.0 || ^24.0.0 || >=26.0.0`（已写入各自 `engines`）；CI 随根 `.nvmrc` 跑 Node 26.13.0。`@types/node` 仍钉 `^22.18.0`，用于按最低支持线做类型检查，不代表 fixture 只能运行在 Node 22。

| fixture | 技术栈 | 端口 | 入口 |
| --- | --- | --- | --- |
| `next/` | Next.js 16 App Router + React 19 | 4301 | `app/[locale]/page.tsx`（RSC + DSD） |
| `nuxt/` | Nuxt 4 + Vue 3 | 4302 | Nitro 原样 HTML DSD 页 + `app/pages/vue.vue`（isCustomElement） |

## 安装 / 构建 / e2e

每个 fixture 有独立 `package.json` + `pnpm-lock.yaml`（以及仅承载 `allowBuilds` 的单包 `pnpm-workspace.yaml`）。
它们通过 `link:` 消费主仓 `packages/*` 的构建产物，因此**先构建主仓**：

```bash
# 仓库根
pnpm install --frozen-lockfile
pnpm build

# Next fixture
cd packages/ssr/fixtures/next
pnpm install --frozen-lockfile
pnpm build
pnpm start                       # http://127.0.0.1:4301/zh-CN

# Nuxt fixture（另开终端）
cd packages/ssr/fixtures/nuxt
pnpm install --frozen-lockfile
pnpm build
pnpm start                       # http://127.0.0.1:4302/?locale=zh-CN
```

e2e 由根 `playwright.ssr.config.ts` 收集（`*.e2e.ts`，`retries: 0`）：

```bash
# 仓库根；webServer 自行启动/复用 4301、4302
SSR_FIXTURE=next pnpm test:e2e:ssr --project=next
SSR_FIXTURE=nuxt pnpm test:e2e:ssr --project=nuxt
SSR_FIXTURE=nuxt pnpm test:e2e:ssr --project=nuxt-firefox
pnpm test:e2e:ssr                # 全部（两个 webServer 都起）
```

> **浏览器矩阵**：`next` / `nuxt` 跑 Chromium；`nuxt-firefox` 只跑 `nuxt/firefox-dsd.e2e.ts`（Firefox 下的原生 DSD 解析 + 真水合、运行期注入 DSD 的 polyfill 挂载、以及无 polyfill 的 CSR 降级）。禁 JS 可见性、逐 locale 文案等引擎无关用例不重复跑 Firefox。

> **`reuseExistingServer` 风险**：本地（`CI` 未设置）默认复用已存在的 4301/4302 服务。若端口上残留的是**陈旧进程/旧构建**，e2e 会对着旧产物跑（常见表现：旧 HTML 引用已删除的 chunk → 批量 404 或离奇失败）。遇到此类失败先杀掉端口进程再重跑；CI 下 `reuseExistingServer: false`，不复用。

## 包边界（Next fixture ≠ npm 安装的 `@oas-ui/next`）

Next fixture **不通过 `@oas-ui/next` 包入口**运行，而是由 `lib/ssr-runtime.ts` 在 Node 运行时按**绝对文件 URL** 加载主仓 `packages/ssr/dist/index.js`（linked 包 + Turbopack 无法处理渲染器按 tag 的动态导入表）。因此它验证的是「主仓 dist 的 SSR 行为」；**fixture 不覆盖 npm 安装 / `exports` 路径**（包 `exports`、`react-server` 条件、client reference 与 peer 解析均不在验收内），**当前无 pack smoke**。Nuxt fixture 则通过 `link:` 直接消费 `@oas-ui/nuxt` 入口。

## 覆盖内容

- 同一进程冷/热混合请求 `zh-CN` / `en-US`（归一到内置 `en`）/ `ar`（RTL），逐组件 ID 校验文案且互不串扰；
- 禁 JS（`javaScriptEnabled:false`）下 DSD 快照文本/结构可见；
- 延迟客户端脚本 → 给快照 shadow 内 `<style>` 打标 → 注册完成后标记仍在、指纹 meta 被消费（真水合、不重建）；
- `oas-tool-call` 真实点击展开/收起，每次点击恰好一次 `oas-toggle`；
- console error/warning 与 pageerror 零；
- Nuxt 额外覆盖 Vue SFC 中直接写 `<oas-*>` 的 isCustomElement 路径；
- Nuxt 的 DSD 页客户端入口（`client/oas-client.ts`）在组件注册前副作用导入 `@oas-ui/ssr/polyfill`；
  Firefox 项目（`nuxt-firefox`）覆盖三条：原生解析期 DSD + 入口 polyfill 零命中 + 真水合、
  运行期注入（`innerHTML`）DSD 的 polyfill 挂载与幂等、以及**无 polyfill** 时的 CSR 降级
  （页面可用、DSD 模板不被消费——如实断言降级，不假装水合）。

## 两个实现约束（真实环境）

1. **`@oas-ui/ssr` 会安装全局 DOM shim**：首次渲染把 happy-dom 的 `window`/`document`/`HTMLElement` 写到 `globalThis`。
   Nuxt 若在同一进程里渲染 DSD 再渲染 Vue 页面，Vue SSR 会误判为浏览器环境（实测 `/vue` 500：`history is not defined`）。
   本 fixture 的 Nuxt DSD 渲染放在常驻 `worker_threads` worker（`server/dsd-worker.mjs`）；生产接入请用 worker / 子进程 / 独立服务隔离。
2. **link 包 + 动态导入**：Next/Turbopack 会把 `link:` 的 `@oas-ui/ssr` 当源码打包，无法处理其按 tag 的 `import(目录入口)`
   动态表。fixture 通过 `lib/ssr-runtime.ts` 在 Node 运行时按真实文件 URL 加载引擎；从 npm 安装真实包时用
   `serverExternalPackages: ['@oas-ui/ssr', 'happy-dom']` 即可。这条文件 URL 路径也决定了它**不等价于**
   npm 安装后的 `@oas-ui/next` 包路径（见上「包边界」）。
