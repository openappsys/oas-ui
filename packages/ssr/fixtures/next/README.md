# Next.js App Router fixture

生产构建（Next 16 App Router + React 19）的 DSD / 水合 / locale 验收 fixture。安装、构建与 e2e 命令见上级 [`../README.md`](../README.md)。

## 包边界

本 fixture **不通过 `@oas-ui/next` 包入口**运行：`lib/ssr-runtime.ts` 在 Node 运行时按**绝对文件 URL** 加载主仓 `packages/ssr/dist/index.js`（`link:` + Turbopack 无法处理渲染器按 tag 的动态导入表）。因此它验证的是「主仓 dist 的 SSR 行为」；**fixture 不覆盖 npm 安装 / `exports` 路径**（包 `exports`、`react-server` 条件、client reference 与 peer 解析均不在验收内），**当前无 pack smoke**。

## Next 16 客户端注册限制

`@oas-ui/next` 的 `OasRegistry` 在模块顶层 `import '@oas-ui/ui'`；Next 16 会在 Client Component 的服务端渲染阶段求值该模块，导致 `HTMLElement is not defined`。本 fixture 按文档的临时写法（`app/oas-client-boot.tsx`：`useEffect` 内动态导入）规避。适配器本批不改，follow-up 见 `docs/ROADMAP.md`。
