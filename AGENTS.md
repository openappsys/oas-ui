# OAS-UI 工作约定

> 框架无关的 Web Components UI 组件库。产品档案唯一权威：`docs/`（vision / ROADMAP / PRD / architecture / ui-spec / engineering）。

## 文档分工

| 层       | 工具                                                 | 用途                                                      |
| -------- | ---------------------------------------------------- | --------------------------------------------------------- |
| 产品档案 | `docs/PRD.md` + `docs/ROADMAP.md` + `docs/vision.md` | 版本需求、验收标准、愿景与边界；粒度停在产品行为/架构决策 |
| 技术架构 | `docs/architecture.md` + `docs/ui-spec.md`           | 选型决策、包结构、测试矩阵；视觉语言与组件规范            |
| 工程纪律 | `docs/engineering.md`                                | TDD（RED→GREEN）、测试策略、组件开发清单、发布流程        |

### 细则

- **不写重复 spec**：变更不单开 plan 文件；组件级决策写进对应组件目录 README 或 PRD 版本段
- **版本收尾清单**（每个版本发布前必做，见 engineering.md §5）
- **新组件前置规矩**：新增组件必须先在 PRD/ROADMAP 有条目；属性/事件命名对照 ui-spec §2；颜色只走 CSS 变量 token（含暗色变体）
- **文档同步**：组件/版本/场景变更时，同步更新 `PRD.md` + `ROADMAP.md`。
- **设计前必答清单**（写实现前先答完，再动手）：
  1. 每个操作的取消路径——零操作吗？有孤儿产物吗（如浮层未销毁）？
  2. 每个属性——有合理的默认值/空态吗？
  3. 每个多步交互——失败点在哪？加载/禁用态覆盖吗？事件何时派发？
  4. 破坏性选项——默认项是非破坏的吗？边界（empty/disabled/loading）呢？
  5. 键盘可达吗？ARIA 状态同步吗？屏幕阅读器有可读名称吗？
  6. 受控/非受控双模式都验证了吗？宿主框架（React/Vue）桥接能通吗？

## 质量命令

- 测试：`pnpm test`（vitest）；单文件 `pnpm vitest run <path>`
- 类型：`pnpm typecheck`
- e2e：`pnpm test:e2e`（playwright + axe；chromium 全量 + firefox 抽样跑 visual/smoke/qa-regression 子集，抽样说明见 docs/engineering.md §2 跨浏览器抽样）
- 构建：`pnpm build`（含 d.ts）
- 演示：`pnpm dev`（同时起 core/i18n/icons/ui 的 watch 构建 + Vitepress dev，固定 5173 端口 strictPort；改动 package.json 脚本/依赖后必须手动验证能启动）
- **dev 链路（无盲区）**：dev 与生产共用同一份 `packages/*/dist`（workspace symlink 直连真实产物，vitepress 不预构建 linked 包，`.vitepress/config.ts` 已 `optimizeDeps.exclude` 兜底）。`pnpm dev` 会自动 predev（先跑 ui build 保证首次 dist 完整），再并行起 watch 构建 + dev server。**改组件源码 → watch 构建自动更新 dist → dev server 自动 full reload 生效，不重启、不清缓存**；ui 的 watch 构建已配 `emptyOutDir: false`（避免 Windows 上 dev server 占用 dist 文件句柄时 `vite build --watch` 清目录触发 EPERM）。docs 的 md 改动走原生 HMR。shadow DOM 里 `::slotted()` 后不支持链 `::part()`，跨 shadow 改内部样式走 CSS 自定义属性穿透。⚠️ **Windows 已知缺陷**：pnpm workspace symlink + Vite 内存模块图在 dist 被 watch 重写时可能不失效——磁盘 dist 是最新但 dev 页面仍服务旧组件（表现：新增属性/方法不生效、新 demo 空白或布局乱、`observedAttributes` 缺新项）。遇此现象**重启 `pnpm dev` 或删 `packages/docs/.vitepress/cache`** 即恢复；若重启后仍怪，先查 5173/5174 是否有陈旧残留进程。
- **提交纪律**：涉及组件/Shadow DOM 样式的提交，提交前必跑 `pnpm build`（单测与 typecheck 抓不到 scoped CSS 语法错误）
- **API 防漂移**：`pnpm api:check`（CI 强制）。md 的 `## API` 章节是生成物，禁止手改——改组件属性/事件/插槽后跑 `pnpm api:scan && pnpm api:gen`；改说明文案改 `docs/api-descriptions.{zh,en}.json` 再 gen（详见 engineering.md §4 API 表格自动化）

## 用户视角验证门禁

> 教训：曾经"只查状态不查感知"导致 tag hover 不可读、button-group 选中态无视觉、纵向布局失效、demo 事件反馈静默失败等漏检。**机制正确 ≠ 用户看到的东西正确。**

**触发条件**：改动组件源码，或改动 demo 的交互/结构时必做（纯文档/单测/类型等不影响渲染的改动可跳过浏览器验证）。

**验证环境**：人工/截图审查用 `pnpm dev`（5173，dev 链路自带 watch 构建，改组件源码后等自动 full reload 即可，无需重启/清缓存）；自动化 e2e 用 `pnpm test:e2e`（4173 preview，webServer 自动 build docs + preview，改组件源码后须先 `pnpm --filter @oas-ui/ui build`，否则 preview 用旧 dist）。截图用 playwright。

- **新增文档站页面后必跑全量 e2e**：smoke/dark/code/visual/console-sweep/vue-prop-hijack 等 spec 用 `readdirSync` 自动收集 components 目录，新页面会被自动纳入（总览页无 demo 块曾致 4 个 spec 失败漏检）
- **陈旧 preview 陷阱**：e2e 遇大批量离奇失败先查 4173 是否有残留旧 preview 进程（旧 server 吐旧 HTML 引用已删除的 chunk → 404 雪崩），杀掉后由 playwright 自起

除跑通单测/typecheck/build，还必须在浏览器里以用户视角验证：

1. **demo 实际可交互**：涉及交互的 demo 块要真点/真输入，确认有**可见反馈**（选中态、消息、浮层等），不能只看 console/状态；纯静态展示块核对视觉即可
2. **交互态检查**：该组件支持的 hover / focus-visible / selected / disabled / loading / empty 等态逐一过——这些态只靠静态截图查不出来
3. **console 零告警**：打开 devtools 确认无 error/warning（含 Vue isCustomElement 类告警）
4. **视觉核对截图**：截图后逐块看图识图，颜色/圆角/间距/对齐是否符合预期
5. **dark 主题**：暗色下同样过视觉与交互态（颜色类 bug 在 dark 下更易暴露）
6. **宿主框架桥接**：demo 是在 Vue 里跑的，属性在 Vue 下可能被剥离（如 `prepend` 冲突）；新增属性时确认 demo 里属性存活

**新发现任何缺陷 → 先固化回归再继续**：凡是本次修的问题，立即在 `packages/ui/qa-regression.spec.ts` 加一条断言（或新建对应 spec），防止复发。只修不加回归 = 质量问题没闭环。

## 语言规则

- 默认用简体中文交流与写注释；专有名词（Web Components、Custom Elements、Shadow DOM、React、Vue、Vitest、Playwright、Vite、Vitepress、pnpm）保留英文
- 代码标识符、文件路径、命令行输出、报错原文保留英文
- 仅当用户明确要求输出英文时才输出英文（如组件对外 API 文档、CHANGELOG）

## 原创性与许可

- 项目代码、图标、插画、文案全部原创。
