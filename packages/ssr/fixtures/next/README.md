# Next.js App Router fixture

生产构建（Next 16 App Router + React 19）的 DSD / 水合 / locale 验收 fixture。安装、构建与 e2e 命令见上级 [`../README.md`](../README.md)。

## 包边界

本 fixture **不通过 `@oas-ui/next` 包入口**运行：`lib/ssr-runtime.ts` 在 Node 运行时按**绝对文件 URL** 加载主仓 `packages/ssr/dist/index.js`（`link:` + Turbopack 无法处理渲染器按 tag 的动态导入表）。因此它验证的是「主仓 dist 的 SSR 行为」；**fixture 不覆盖 npm 安装 / `exports` 路径**（包 `exports`、`react-server` 条件、client reference 与 peer 解析均不在验收内），**当前无 pack smoke**。

## DSD polyfill 的严格顺序（head 经典脚本）

顺序契约：`@oas-ui/ssr/polyfill` 必须先于组件注册求值，组件 upgrade 才能按 SSR 指纹真水合。

Next App Router 里**不能**靠 layout 注入满足这个契约：框架会把 head 里自己产出的 chunk 脚本（Turbopack 一律 `<script async>`）排在最前，layout 渲染的 head 内容一律排在其后；`<script type="module">` 又一律延迟执行。两者都让「polyfill 先于任何 chunk」退化成竞态。

本 fixture 按自托管部署的通行做法控制文档：

- `server.mjs`（替代 `next start`）在**文档响应**的 `<head>` 里、`<meta charset>` 之后注入 `<script src="/oas-dsd-polyfill"></script>`。它是文档里第一个脚本，经典同步（无 `async` / `defer` / `type=module`），解析到就立即执行，任何后续脚本都不可能在它之前运行；
- `app/oas-dsd-polyfill/route.ts` 从 `node_modules/@oas-ui/ssr/dist/polyfill.js` 读取产物，交给 `lib/polyfill-classic.ts` 转成经典脚本（去 `export`、包 IIFE，并校验产物形态），以 `text/javascript` 返回。产物更新即生效，不做构建期拷贝；
- `next.config.ts` 关闭响应压缩（压缩后的字节流无法按 HTML 文本改写）。真实接入应由边缘/网关在压缩前完成注入。

`firefox-dsd.e2e.ts`（`next-firefox` project）的三条用例覆盖：head 顺序断言（响应 HTML + 浏览器 DOM 双层）、原生 DSD 解析 + 真水合（同一 shadow root、指纹被消费）、运行期注入 DSD 的 polyfill 挂载与二次求值幂等。`app/oas-client-boot.tsx` 不再在 chunk 里 `import '@oas-ui/ssr/polyfill'`——用 chunk 承载 polyfill 无法证明顺序。

> `dev` 脚本仍是 `next dev`（不经过 `server.mjs`，因此无 head 注入）：现代引擎原生支持文档解析期 DSD，开发时页面与水合不受影响；严格顺序验收针对生产构建（`pnpm build` + `pnpm start`）。

## Next 16 客户端注册限制

`@oas-ui/next` 的 `OasRegistry` 在模块顶层 `import '@oas-ui/ui'`；Next 16 会在 Client Component 的服务端渲染阶段求值该模块，导致 `HTMLElement is not defined`。本 fixture 按文档的临时写法（`app/oas-client-boot.tsx`：`useEffect` 内动态导入）规避。适配器本批不改，follow-up 见 `docs/ROADMAP.md`。
