# OAS-UI 工程规范（Engineering）

> 本文档规定开发流程、测试策略与验收纪律。AI 辅助与人类协作均遵守。

## 1. 工作流：TDD（RED → GREEN → REFACTOR）

- 每个组件/特性先写失败的测试（RED），再实现到通过（GREEN），再重构
- 测试先行顺序：**事件/行为测试 → 状态矩阵 → 视觉基线**（越早暴露契约越稳）
- 复杂交互（浮层定位、焦点陷阱、键盘流）先写行为测试再写实现，禁止"先写码后补测"

## 2. 测试策略（分层）

| 层       | 工具/环境                             | 覆盖内容                                                                      | 命令                                |
| -------- | ------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| 单测     | Vitest + happy-dom                    | 属性映射、事件派发、state 转移、边界态（disabled/empty/loading）、受控/非受控 | `pnpm test`                         |
| 行为测试 | Vitest + happy-dom                    | 键盘导航、焦点陷阱、浮层定位、表单校验                                        | `pnpm test`                         |
| 视觉回归 | Playwright（chromium + firefox 抽样） | 每组件各状态 light/dark 截图基线                                              | `pnpm test:e2e`                     |
| 无障碍   | Playwright + axe-core                 | 键盘流 + ARIA + 无违规断言                                                    | `pnpm test:e2e`                     |
| 互操作   | playground                            | React / Vue 宿主事件/属性桥接                                                 | `packages/playground` 手动 dev 验证 |

**命名约定**：组件单测 `packages/ui/src/<组>/<组件>/oas-xxx.test.ts`（Vitest + happy-dom）；e2e spec 集中在 `packages/ui/*.spec.ts`，按职责命名：`a11y.spec.ts`（axe 审计）、`smoke.spec.ts`（全页渲染无 JS 错误/告警）、`console-sweep.spec.ts`（每页 console 零告警零报错门禁）、`qa-regression.spec.ts`（历次复核缺陷固化回归：选中态可见性/纵向布局/圆角合并/hover 可读性/addon 属性存活/点击不滚动/demo 事件反馈）、`dark.spec.ts`（暗色冒烟）、`demo.spec.ts`/`code.spec.ts`（demo 渲染与示例代码）、`interaction.spec.ts`/`onoas*.spec.ts`（交互/事件绑定）、`visual.spec.ts`（全页截图）。

**跨浏览器抽样**：全量 e2e 只在 chromium 跑；firefox 按抽样子集跑 `visual` / `smoke` / `qa-regression` 三个 spec，圈定逻辑在 `playwright.config.ts` 的 firefox project `testMatch`。抽样目的：暴露浏览器专有渲染/兼容问题（如 slider `::-webkit-slider-runnable-track` 在 Firefox 失效导致轨道不可见的历史缺陷），全量在 Firefox 上跑会翻倍耗时、不值得；交互密集或时序敏感的 spec（interaction/a11y/demo/onoas 等）不纳入——Firefox headless 时序差异可能引入 flaky，宁少勿滥。新增浏览器相关回归断言优先放进 `qa-regression.spec.ts`，会自动纳入 firefox 抽样。

## 3. 组件开发清单（每个新组件必经）

- [ ] 确认 ROADMAP/PRD 有该组件条目（或先补 PRD，拒绝"顺手加组件"）
- [ ] 完成设计前必答清单（见 AGENTS.md）
- [ ] 写测试（先 RED）→ 实现（GREEN）
- [ ] 属性/事件对照 ui-spec.md 的命名与 state 矩阵自查
- [ ] 视觉基线 + dark 主题截图确认
- [ ] axe 扫描 + 键盘流回归
- [ ] demo 进文档站
- [ ] 跑 `pnpm typecheck` `pnpm build` 全绿
- [ ] **用户视角验证门禁**（见 AGENTS.md）：涉及交互的 demo 块真点/真输入看可见反馈；该组件支持的 hover / focus-visible / selected / disabled / loading 逐一过；console 零告警；截图识图核对颜色/圆角/间距；dark 主题同样过一遍
- [ ] 发现的缺陷先在 `packages/ui/qa-regression.spec.ts` 固化回归再提交

## 4. 质量命令（根目录）

- 测试：`pnpm test`（单测+行为）；单文件 `pnpm vitest run packages/ui/src/basic/button/oas-button.test.ts`
- 类型：`pnpm typecheck`
- 构建：`pnpm build`；e2e：`pnpm test:e2e`
- 演示：`pnpm dev`（predev 先跑 ui build 保证 dist 完整，再并行起 core/i18n/icons/ui 的 watch 构建 + Vitepress dev，固定 5175 端口 strictPort，被占即报错不自增；dev 与生产共用 `packages/*/dist`，改组件源码 → watch 构建更新 dist → dev server 自动 full reload，无需重启/清缓存）
- **提交纪律**：涉及组件/样式/Shadow DOM 的改动，提交前必跑 `pnpm build`（happy-dom 与 vue-tsc 均抓不到 scoped CSS 语法错误，只有真实构建能抓）

### API 表格自动化

- **单一数据源纪律**：API 结构元数据（属性/事件/插槽/类型/默认值）的权威来源是组件源码；说明文案的权威来源是 `docs/api-descriptions.{zh,en}.json`；md 的 `## API` 章节是生成物，**禁止手改**
- **工作流**：改组件 API → `pnpm api:scan && pnpm api:gen`；改说明文案 → 改 descriptions JSON → `pnpm api:gen`；新组件 → 跑 scan+gen 后说明缺失处渲染 `—`，需补录语料再 gen
- **防漂移**：`pnpm api:check` 已在 CI 强制，md 与生成物不一致会红
- **脚本**：`scripts/api-docs/scan.mjs` 扫 AST 生成 `docs/api-manifest.json`；`gen.mjs` 合并 manifest + 语料渲染 md API 章节（`--check` 比对防漂移）；`harvest.mjs` 是一次性语料收割器，从既有手写 API 表收割说明文案，保留备查

### 性能基准（vision §5.8 性能领先）

- **体积基准（CI 强制）**：`pnpm perf:size`。基于 `pnpm build` 后的发布产物 dist 统计各包体积（ui 全量入口链 / cdn.js / theme / core / i18n / icons / ssr）+ button/table/form 单组件按需链（静态 import 图遍历，验证 tree-shaking 叙事），超预算非零退出；预算定档依据见 `docs/perf-baseline.md` §4，基线数据与断言结果写入 `docs/perf-baseline.json`（生成物，勿手改）。已在 `.github/workflows/ci.yml` test job 接线（build 之后）。
- **渲染基准（本地/发布前）**：`pnpm perf:bench`。happy-dom 环境测代表性组件首渲染与增量更新耗时（100 次迭代取均值/中位数），量级断言防退化。渲染耗时波动大，**不进 CI**；发布前本地跑一遍核对。
- **自评摘要**：`docs/perf-baseline.md` §3（体积/渲染对自身基线与预算的自评）。
- **发布前核对流程**：改动组件/依赖/构建配置后，发布前依次跑 `pnpm build && pnpm perf:size && pnpm perf:bench`；超预算或渲染 p95 明显退化时，在发布说明中给出原因与后续优化计划。
- **注意**：渲染基准用 happy-dom 合成环境（无排版/合成管线），数值只用于相对对比与退化监测，不代表真实浏览器首帧数字；如需真实基线，另用 Playwright/Lighthouse 采集。

## 5. 发布流程（v1.0 启用）

1. 全绿：test / typecheck / build / e2e
2. PRD 版本段更新（含测试数）+ ROADMAP 状态
3. CHANGELOG 记录（conventional commits 生成）
4. 版本号同步各包 `package.json`，打 tag，`git push --tags`（**CI 通道**：tag 触发自动 build + publish；**本地通道**：tag 仅作版本标记，发布走下方 `pnpm release`）

### 两种发布通道

**CI（首选，OIDC Trusted Publishing，免 token）**：

- 推 `v*` tag → `.github/workflows/release.yml` 自动 build + api:check + `pnpm -r publish`
- 硬性要求（npm 官方）：**仓库托管在 GitHub**（GitHub-hosted runner）；Node ≥ 22.14 + npm CLI ≥ 11.5.1（workflow 已升级）；各包 `package.json` 的 `repository.url` 必须与 GitHub 仓库精确一致。
- ⚠️ **适用范围**：本通道仅适用于**仓库托管在 GitHub** 的场景。若源码托管在**非 GitHub 的私有 / 内网仓库**（如自托管 Gitea），此通道不适用（无 GitHub-hosted runner、无 GitHub Actions），应走下方「**本地**」通道发布。
- 一次性配置（npm 网页操作）：每个可发布包（core/i18n/icons/ssr/theme/ui）→ Settings → Trusted Publisher → GitHub Actions → 填 GitHub org/user + 仓库名 + `release.yml`；**全新包首版可能需先手动发布一次**才能配置
- 无长期凭证（npm 已废 Classic Token，发布权限 token 最长 90 天），OIDC 每次交换一次性凭证

**本地（备用，两种方式）**：

- **交互式（免 token，官方 manual publish 路径）**：`npm login` 浏览器交互登录 → `pnpm release`，发布时按提示输 2FA OTP。无需维护任何长期凭证
- **granular token（90 天期，应急）**：npm → Access Tokens → Granular（限 `@oas-ui/*` + publish，可勾 Bypass 2FA 免每次 OTP）→ 写入用户级 `~/.npmrc`（**勿提交仓库**），到期重新生成
- 可选最严姿态：包 Settings → Publishing access → "Require 2FA and disallow tokens"，则 token 全废，本地只能交互式、CI 只能 OIDC

## 6. 文档站部署（Cloudflare + oas-ui.dev）

文档站是 Vitepress SSG，静态构建产物部署到 Cloudflare（Workers Static Assets，`wrangler deploy`），绑定自定义域名 `oas-ui.dev`（域名 DNS 托管到 Cloudflare，自动 HTTPS）。

**双域策略**：`oas-ui.dev` 为主域（可发音、可传播，去连字符可读化）；`oas-ui.dev`（与包名逐字符一致）持作 301 跳转域——Cloudflare 后台 → Rules → Redirect Rules，单条规则把 `oas-ui.dev/*` 301 到 `oas-ui.dev` 对应路径（保路径跳转，不在 wrangler.jsonc 里声明）。

仓库根已提供 `wrangler.jsonc`（Workers 静态资产配置，`assets.directory` 指向构建产物；`$schema` 是 IDE 提示，本地未装 wrangler 时无害）。

**部署流程（CI/远程 wrangler，本地无需安装 wrangler）**：

1. 构建：`pnpm install --frozen-lockfile && pnpm build`
   - 必须全量 `pnpm build`（拓扑序 core→i18n→icons→theme→ui→…→docs）：ui 的 `tsconfig.build.json` paths 指向 `../core/dist/index.d.ts`、`../i18n/dist/index.d.ts`，**只 build ui 会因 core/i18n 的 d.ts 未生成而 tsc 报基类缺失**（如 `OASTour` 的 `extends OASElement` 失效）；docs build 依赖 ui dist，拓扑序自动先构建
2. 部署：CI 中用 Cloudflare 官方 action（`cloudflare/wrangler-action`）或 `npx wrangler deploy`（上传 `packages/docs/docs/.vitepress/dist` 为静态资产，凭证用 Cloudflare API token，存 CI secret）
3. 绑域名：Cloudflare 后台 → Workers → 该项目 → Custom Domains → Add `oas-ui.dev`

**要点**：

- `docs build` 依赖 `@oas-ui/ui` 的 dist（workspace symlink）——全量 `pnpm build` 拓扑序自动先构建 ui，无需手动指定
- `base: '/'`（自定义域名，无子路径）；`404.html` 由 Vitepress 自动生成（深层直达兜底）
- 本地预览：`pnpm dev`（5175，dev 链路自带 watch 构建）
- 备选：Cloudflare Pages（UI 连 Git 自动构建，构建命令同上、输出目录 `packages/docs/docs/.vitepress/dist`）

## 7. 代码规范

- TypeScript strict；无 `any`（有理由时注释）
- 组件对外类型集中导出：每个组件导出 `ButtonProps`（属性）与事件类型 `ButtonEventMap`
- 无框架依赖：`packages/*` 运行时零第三方依赖（devDependencies 允许工具）
- 提交信息：conventional commits（`feat:` `fix:` `test:` `docs:` `refactor:`），中文描述
- 不提交 secrets、不提交 node_modules/dist
- CSS `!important` 只用于「语义硬不变量」：`hidden` 不渲染、visually-hidden 不可见、reduced-motion 停动画等宿主本就不该覆盖的声明——它是对外防御（宿主全局 reset/工具类），跨树级联中内层树 important 优先是规范预留通道。**视觉默认值**（颜色/间距/hover 等可被主题化的表现）绝不用；组件内部规则互抢时用 important 压是层级失控信号，先重构选择器/结构（如 slot 不出盒、flex 化内容器）
