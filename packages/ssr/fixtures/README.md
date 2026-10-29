# SSR 验收 fixture（Next / Nuxt）

> 这些目录是仓库内的**生产构建 + 真实浏览器验收 fixture**，不是 `@oas-ui/ui` / `@oas-ui/ssr` 等发布包的一部分：
> 不在根 `pnpm-workspace.yaml`（`packages/*`）中，不会被根 `pnpm install` / `pnpm build` 安装或构建，
> 也不进入任何 npm 包的 `files` 清单。

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
pnpm test:e2e:ssr                # 两个都跑（两个 webServer 都起）
```

## 覆盖内容

- 同一进程冷/热混合请求 `zh-CN` / `en-US`（归一到内置 `en`）/ `ar`（RTL），逐组件 ID 校验文案且互不串扰；
- 禁 JS（`javaScriptEnabled:false`）下 DSD 快照文本/结构可见；
- 延迟客户端脚本 → 给快照 shadow 内 `<style>` 打标 → 注册完成后标记仍在、指纹 meta 被消费（真水合、不重建）；
- `oas-tool-call` 真实点击展开/收起，每次点击恰好一次 `oas-toggle`；
- console error/warning 与 pageerror 零；
- Nuxt 额外覆盖 Vue SFC 中直接写 `<oas-*>` 的 isCustomElement 路径。

## 两个实现约束（真实环境）

1. **`@oas-ui/ssr` 会安装全局 DOM shim**：首次渲染把 happy-dom 的 `window`/`document`/`HTMLElement` 写到 `globalThis`。
   Nuxt 若在同一进程里渲染 DSD 再渲染 Vue 页面，Vue SSR 会误判为浏览器环境（实测 `/vue` 500：`history is not defined`）。
   本 fixture 的 Nuxt DSD 渲染放在常驻 `worker_threads` worker（`server/dsd-worker.mjs`）；生产接入请用 worker / 子进程 / 独立服务隔离。
2. **link 包 + 动态导入**：Next/Turbopack 会把 `link:` 的 `@oas-ui/ssr` 当源码打包，无法处理其按 tag 的 `import(目录入口)`
   动态表。fixture 通过 `lib/ssr-runtime.ts` 在 Node 运行时按真实文件 URL 加载引擎；从 npm 安装真实包时用
   `serverExternalPackages: ['@oas-ui/ssr', 'happy-dom']` 即可。
