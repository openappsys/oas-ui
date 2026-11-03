# 性能基准（OAS-UI）

> 状态：数据表为**生成块**（`BEGIN/END:generated:perf-baseline:*` 标记之间，`pnpm perf:docs` 写入），唯一数据真源是 [`docs/perf-baseline.json`](./perf-baseline.json)（`perf:size` / `perf:bench --update-baseline` 生成）与渲染阈值库 `scripts/perf/lib/render-budgets.mjs`；`pnpm perf:size` 内置一致性门禁校验三者一致（只报红不自动刷新，防止测量噪音洗白退化）。标记之外的叙述为手写区。
> 对应原则：`docs/vision.md` §5.8「性能领先」——性能可测量、有基准、有门槛（CI 体积预算），对自身基线逐版本不退化、持续更优。

## 1. 量纲与口径

| 项         | 口径                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 压缩       | gzip = zlib 默认档；brotli = zlib q11（HTTP/1.1 CDN 常见档）                                                                                                   |
| 全量入口链 | `import '@oas-ui/ui'`（dist/index.js）的静态 import 闭包，逐文件压缩求和（**上界估计**：浏览器原生 ESM 逐文件加载的上界，经打包器合并后单文件 gzip 更低，见 cdn.js） |
| 单组件链   | `import '@oas-ui/ui/<目录>'` 的静态 import 闭包（入口 + 依赖），逐文件压缩求和（同上，为上界）                                                                 |
| 渲染耗时   | happy-dom 合成环境（非真实浏览器渲染口径），100 次迭代的均值/中位数/p95（ms）                                                                                  |
| 基线版本   | 数据快照时间见 JSON 各 section 的 `generatedAt`；node / happy-dom 版本见 JSON `render.env`（`perf:size` 校验与实装一致）                                        |

**口径定位（防误读）**：`cdn.js`（单文件全量 bundle）与「全量入口链」都是**便利路径 / 上界估计**，代表「引入全部组件」的极端场景，**不代表单次消费的产品大小**；生产环境应按需引入单组件链（见 §2 tree-shaking 叙事）。

刷新命令：先 `pnpm build`，再 `pnpm perf:size` / `pnpm perf:bench`（两脚本各自 merge 写回同一个 JSON，互不覆盖；**默认只测不写**，更新数据加 `--update-baseline`）；文档生成块用 `pnpm perf:docs` 刷新。

## 2. 实测体积

### 各包发布体积

<!-- BEGIN:generated:perf-baseline:packages -->
| 包 | 文件数 | raw | gzip | brotli |
| --- | --- | --- | --- | --- |
| @oas-ui/ui（dist 总大小，含 map/d.ts） | — | 40.13 MB | — | — |
| @oas-ui/ui（浏览器可加载 JS） | 477 | 10533.8 KB | 2524.9 KB | — |
| @oas-ui/ui（全量入口链 `import '@oas-ui/ui'`） | 501 | 3732.1 KB | 1014.6 KB | — |
| @oas-ui/ui（dist/cdn.js 单文件全量 bundle） | 1 | 3093.2 KB | 678.0 KB | 464.6 KB |
| @oas-ui/theme（index.css） | 1 | 7.8 KB | 1.9 KB | — |
| @oas-ui/core | 8 | 44.3 KB | 18.5 KB | — |
| @oas-ui/i18n | 33 | 227.1 KB | 67.8 KB | — |
| @oas-ui/icons | 52 | 24.8 KB | 13.1 KB | — |
| @oas-ui/ssr | 3 | 45.9 KB | 14.7 KB | — |
<!-- END:generated:perf-baseline:packages -->

### 单组件按需引入链（tree-shaking 叙事验证）

<!-- BEGIN:generated:perf-baseline:components -->
| 组件链 | 入口 | 文件数 | raw | gzip |
| --- | --- | --- | --- | --- |
| button | `@oas-ui/ui/basic/button` | 14 | 81.3 KB | 25.4 KB |
| table | `@oas-ui/ui/data/table` | 31 | 217.9 KB | 66.6 KB |
| tableEdit | `@oas-ui/ui/data/table/edit` | 46 | 308.1 KB | 90.7 KB |
| tableAdvanced | `@oas-ui/ui/data/table/advanced` | 8 | 19.9 KB | 7.8 KB |
| tableFormat | `@oas-ui/ui/data/table/format` | 5 | 11.7 KB | 4.6 KB |
| tableView | `@oas-ui/ui/data/table/view` | 1 | 2.4 KB | 1.0 KB |
| tableRange | `@oas-ui/ui/data/table/range` | 6 | 40.6 KB | 11.9 KB |
| tableHistory | `@oas-ui/ui/data/table/history` | 4 | 8.0 KB | 3.5 KB |
| tableDetail | `@oas-ui/ui/data/table/detail` | 3 | 9.3 KB | 3.7 KB |
| tablePivot | `@oas-ui/ui/data/table/pivot` | 1 | 3.4 KB | 1.2 KB |
| tableValueFormat | `@oas-ui/ui/data/table/value-format` | 2 | 4.2 KB | 1.9 KB |
| tableQuery | `@oas-ui/ui/data/table/query` | 1 | 4.8 KB | 1.8 KB |
| infiniteScroll | `@oas-ui/ui/layout/scroll-area/infinite` | 3 | 14.5 KB | 4.1 KB |
| ganttExport | `@oas-ui/ui/data/gantt/export` | 2 | 2.6 KB | 1.1 KB |
| ganttEvm | `@oas-ui/ui/data/gantt/evm` | 1 | 3.1 KB | 1.3 KB |
| ganttAlap | `@oas-ui/ui/data/gantt/alap` | 1 | 4.2 KB | 1.6 KB |
| ganttRecurring | `@oas-ui/ui/data/gantt/recurring` | 1 | 3.5 KB | 1.5 KB |
| resourceCost | `@oas-ui/ui/data/resource/cost` | 1 | 2.0 KB | 0.9 KB |
| resourcePool | `@oas-ui/ui/data/resource/pool` | 1 | 1.4 KB | 0.6 KB |
| resourceLoad | `@oas-ui/ui/data/resource/load` | 2 | 4.4 KB | 1.8 KB |
| form | `@oas-ui/ui/form/form` | 10 | 65.2 KB | 23.4 KB |
| gantt | `@oas-ui/ui/data/gantt` | 20 | 240.2 KB | 68.9 KB |
| jsonViewer | `@oas-ui/ui/data/json-viewer` | 13 | 85.9 KB | 29.5 KB |
| diffViewer | `@oas-ui/ui/data/diff-viewer` | 11 | 80.0 KB | 28.0 KB |
<!-- END:generated:perf-baseline:components -->

**tree-shaking 叙事成立（2026-10-08 图标库 opt-in 后增强）**：按需引入单组件链 gzip 仅为全量入口链的约 **2.5~6%**（逐版数据见上方生成表与 JSON `fileList`）；且**不再背整套图标**——单组件链只含其自身所需的少量图标 path（全量入口仍内含整套图标，开箱即用不变）。

**固定开销拆分**（以 button 链为例）：

- @oas-ui/core 基类运行时 ≈ 13.5 KB gzip；
- 图标：**仅含自身所需的精确 path**（不再含全量注册表）——2026-10-08 图标库 opt-in 后，button 链 **34.1 → 26.6 KB**（卸掉整套 47 图标 ≈ 9.5 KB）；全量入口 `@oas-ui/ui` 仍自动注册全量集，开箱即用不变。

**table 分层计量（2026-10-28 收口）**：默认入口 `data/table`（不含 edit/Pro）与各能力子路径独立计量、各有独立预算档；`table/edit` 为注册型 L3，**含于 L1 全量入口与 CDN 族包**（编辑器族依赖浮层组件，链大于默认 table 链正是默认入口不含 edit 的原因）；`advanced / format / view / range / history / detail` 为纯函数/宿主侧 helper 型 L3（激活唯一入口是导出函数，可含 import 期惰性注册但无 HTML/属性触发面），**不进 L1/CDN**（按需显式 import）。登记表与结构门禁见 `scripts/perf/lib/l3-registry.mjs`（`perf:size` 强制，含各 CDN 族包构建输入逐一断言）。

## 3. 自评摘要

### 体积

| 口径           | 自评                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------- |
| 全量           | 天花板制（cdn.js / 全量入口链）：随能力增长属预期，达 90% 预警线启动瘦身评估或再定档（§4 生成表） |
| 按需（button） | 图标库 opt-in 后卸掉整套图标（34.1→26.6 KB）；绝对值预算（§4）                                |
| 按需（table）  | 默认入口不含 edit/Pro；`table/edit` 与六个 Pro helper 子路径独立计量、独立预算档（§2/§4）    |
| 主题           | 一套语义 token 变量即全部主题成本；组件样式内联进组件，无独立样式文件                        |
| 可选运行时     | glass-fluid.js 独立档（独立可选、不进 union）；2026-10-31 逐行复核无冗余可清后按实测重定档 9.5 KB，新增大改前先做包体评估 |
| 图标集         | 组件链只含精确 path；全量集仅全量入口自动注册（开箱即用），按需链不背整套                    |

### 渲染耗时（happy-dom）

<!-- BEGIN:generated:perf-baseline:render -->
| 场景 | median / p95（ms） | 门槛（ms） |
| --- | --- | --- |
| button 首渲染 | 0.2 / 0.5 | 5 |
| input 首渲染 | 0.8 / 5.9 | 15 |
| table 100 行首渲染 | 6.0 / 13.0 | 50 |
| select 100 选项首渲染 | 12.8 / 14.6 | 50 |
| tabs 10 面板 | 2.3 / 3.6 | 15 |
| form 10 字段 | 13.2 / 14.9 | 40 |
| table 数据更新 | 8.3 / 15.8 | 50 |
| select 选项更新 | 4.9 / 158.2 | 160 |
<!-- END:generated:perf-baseline:render -->

> 渲染口径诚实声明：happy-dom 无排版/合成管线，数值仅供**相对对比与退化监测**；p95 受 GC 尾延迟支配跨轮次波动明显（如 select 选项更新曾同机测得 58~158 ms），真实浏览器首帧数字需另行用 Playwright/Lighthouse 建立基线后评估。渲染段数据由 `pnpm perf:bench` 写入 JSON，不进 CI。

### 结论（对照 vision §5.8）

1. **体积**：按需口径保持轻量（生成表逐链数据）；全量口径在两层制预算内随组件能力增长，纪律由单组件链绝对值预算守住。
2. **渲染**：合成环境数据仅作退化监测；真实浏览器基线待补。
3. **已完成 / 已知优化方向**：
   - **图标库 opt-in（已完成 2026-10-08）**：全量集从组件链解耦——组件链只含自身所需图标 path（不再背整套 47 图标），全量入口 `@oas-ui/ui` 自动注册保持开箱即用；按需模式用内置图名需 `import '@oas-ui/icons/register'` 一次；
   - **table 分层收口（已完成 2026-10-28）**：默认入口不含 edit/Pro + L3 登记表结构门禁（L1 包含关系 / 零泄漏 / 独立预算）+ `table/edit` 首次独立计量；
   - 提供官方按需打包配置示例，帮助消费者吃到 tree-shaking；
   - 新 L3 能力子包（大表面能力）按同机制以子路径隔离体积（见 `docs/architecture.md` §3.1）。

## 4. 预算与门槛

### 体积预算（CI 强制，`pnpm perf:size` 超预算非零退出）

**两层制（2026-08-23 定夺，2026-10-08 重定档）**：

- **全量类 = 天花板制**（cdn.js / 全量入口链）：组件能力持续增强，体积随之增长属预期内行为，天花板只为防灾难性膨胀；达 90% 预警线（WARN，不拦截）时启动瘦身评估或再定档；
- **单组件链与 theme / 可选运行时 = 绝对值制**（实测 + 上浮约 15~20%）：守住按需引入叙事的纪律，超预算即 FAIL。
- **可选层零泄漏（结构断言）**：任何可选层文件（`glass-fluid.js` / `glass.css` / `skins.css` 等）都**不得出现在基础链（全量入口链与各单组件链）的可达文件清单**里——新增可选层不必新增预算行，泄漏即报红。
- **图标全量注册表零进入按需链（结构断言）**：`packages/icons/dist/registry.js` 不得出现在**已测单组件链**闭包（全量入口链内含有属预期——它经 `@oas-ui/icons/register` 注册全量集以开箱即用）。
- **L3 分层门禁（结构断言，2026-10-28 起）**：登记表驱动——注册型 L3 必须含于 L1、helper 型 L3 不得混入 L1、默认 table 链零 L3（含 edit）、table 家族 L3 独立计量且各有独立预算档（见 `scripts/perf/lib/l3-registry.mjs`）。

<!-- BEGIN:generated:perf-baseline:budgets -->
| 预算项 | 实测 gzip | 预算（制式） | 依据 |
| --- | --- | --- | --- |
| dist/cdn.js gzip | 678.0 KB | 770.0 KB（天花板） | 天花板制：实测 gzip 665.4 KB（并入 workbench 构件族后；含 gantt/barcode/chart 扩展/glass/图标 opt-in），上浮约 15% 定档 770 KB；前档 730 KB 定档于 2026-10-07（628.7 KB 实测），再前档 700 KB 定档于 2026-10-05（608.5 KB 实测） |
| @oas-ui/ui 全量入口链 gzip | 1014.6 KB | 1140.0 KB（天花板） | 天花板制：实测 gzip 984.6 KB（并入 workbench 构件族后），上浮约 15% 定档 1140 KB；前档 1080 KB 定档于 2026-10-07（917.7 KB 实测），再前档 1024 KB 定档于 2026-10-05（890.9 KB 实测） |
| @oas-ui/ui/basic/button 链 gzip | 25.4 KB | 30.0 KB（绝对值） | 实测 gzip 26.7 KB（2026-10-12：dev-warn 统一告警通道（101 处 console.warn 迁移，含模块本体）+ 当批行为修复增量；此前 25.0 KB 为图标库 opt-in 后口径），上浮约 12% 定档 30 KB；前档 29 KB 定档于 2026-10-08（25.0 KB 实测），再前档 39 KB 定档于 2026-10-05（33.5 KB 实测，含全量图标注册表） |
| @oas-ui/ui/data/table 链 gzip | 66.6 KB | 74.0 KB（绝对值） | 实测 gzip 66.2 KB（v2.6.4 默认入口 = 基础表格，不含 edit；链含 core 骨架 + virtual-list + i18n + pagination + 列设置/导出/移动降级与展示集快照，不含编辑器族），上浮约 12% 定档 74 KB；前档 108 KB 为默认入口含 edit 口径 |
| @oas-ui/ui/data/table/edit 链 gzip | 90.7 KB | 104.0 KB（绝对值） | 实测 gzip 89.7 KB / 43 文件（首次独立计量：链含 edit 控制器 + 编辑器族 + select/switch 浮层编辑通道 + i18n；edit 链大于默认 table 链是「编辑器族依赖浮层组件」的合理结果，也正是默认入口不含 edit 的原因）；上浮约 16% 定档 104 KB（89.7×1.16≈104，取整） |
| @oas-ui/ui/form/form 链 gzip | 23.4 KB | 29.0 KB（绝对值） | 实测 gzip 29692 B / 预算 29696 B（余量仅 4 B，全库最危险档；链含 core + i18n；四批合并后 25.6 KB 上浮约 15% 定档 29 KB，前档 28 KB 定档于 2026-10-05 24.8 KB 实测）。预算上限不抬高：2026-10-29 新增外部 label 动态 observer 后已饱和，后续 form 链任何扩展前必须先评估/瘦身或按流程重新定档，禁止把余量当常量 |
| @oas-ui/ui/data/gantt 链 gzip | 68.9 KB | 80.0 KB（绝对值） | v2.6.2 定档 70 KB → 2026-11-03 定档 75 KB（P2 审计无冗余）→ 2026-11-03 定档 80 KB：其后增量全部已归因真实特性——pool 超配检测 +2.2 KB（静态引 resourcePool + 检测/事件/tooltip）、show-resource-load 负荷面板 +2.9 KB（shared 实现本体 1.74 + 渲染/CSS 1 + i18n 3 键 0.15，@oas-ui/ui/data/resource/load helper 档独立计量 1.8 KB）；2026-11-02 P2 式归因审计结论继续有效（无冗余、core barrel 上界口径产物真实可摇除）。预警线 72 KB；下次扩展仍须先归因评估 |
| @oas-ui/ui/data/json-viewer 链 gzip | 29.5 KB | 35.0 KB（绝对值） | 实测 gzip 31.5 KB（链含 core + i18n + 树模型/虚拟窗口/工具栏/搜索/复制/复制浮层；无第三方运行时、无图标全量注册），上浮约 10% 定档 35 KB；PRD 目标 ≤32 KB。 |
| @oas-ui/ui/data/diff-viewer 链 gzip | 28.0 KB | 34.0 KB（绝对值） | 实测 gzip 30.6 KB（链含 core + i18n + 自研 Myers 行级差异/词级高亮/折叠/并排/虚拟窗口；无第三方 diff 依赖、无图标全量注册），上浮约 11% 定档 34 KB；PRD 目标 ≤32 KB。 |
| @oas-ui/theme index.css gzip | 1.9 KB | 4.0 KB（绝对值） | 实测 gzip 3.52 KB（skins 皮肤层变量族 + 阴影双层精修后），上浮约 15%；前档 3.5 KB 定档于 2026-09-15（3.0 KB 实测） |
| @oas-ui/theme glass-fluid.js gzip | 8.1 KB | 9.5 KB（绝对值） | 实测 gzip 8.0 KB（B 档 + 修复批：注册表 + 注入样式表并入运行时——ui 包相应减少同量玻璃规则体；高光层改「surface 背景之上、文字之下」，补 .box 基态/命中成对、isolation:isolate、z-index:-1、禁用守卫（含链接形态 aria-disabled，且同时 background/box-shadow:none）、实心按钮 hover 高光 + 按压边缘内描边（:where 归零特异性）、全根观察 + 帧内 prune 防泄漏）。2026-10-31 复核：把派生式生成器烘焙成静态字面量实测只省 108 B（不值得牺牲「派生防漂移」），无操作三元 7 B、HIT_SELECTORS 函数包装 0 B —— 无冗余可清；前档 8.5 KB 时利用率 95.1%、×1.10 档会让实测距预警线只差 16 B，故按实测上浮 17.5% 重定档 9.5 KB（利用率 85.1%，预警线恢复有效）。再次加功能前先做包体评估。前档 4.5 / 4 KB 首次定档于 2026-10-07（3.6 / 2.97 KB 实测）（指针镜面高光运行时：监听/命中/坐标/rAF/守卫/清理） |
| @oas-ui/theme glass.css gzip | 3.4 KB | 6.0 KB（绝对值） | 本次实测 gzip 3516 B（2026-10-29；玻璃静态层新增 switch 轨道加深 token 后复核：surface 半透明 token + 折光边 + 阴影 + switch mix；独立可选，不进 union），保留 6 KB 上限 |
| @oas-ui/theme skins.css gzip | 0.9 KB | 2.0 KB（绝对值） | 实测 gzip 约 0.91 KB（皮肤层变量族：预设色板皮肤档；独立可选，不进 union），上浮定档 2 KB |
| @oas-ui/ui/data/table/advanced 链 gzip | 7.8 KB | 9.0 KB（绝对值） | 首档 2026-10-25：实测 7.0 KB 上浮约 14% 定档 8 KB。2026-10-28 收口：视觉适配器协议批使链增至 8146 B（余量仅 46 B 触顶）；无行为变化瘦身（公式解析器 class → 模块函数，消除产物方法名税）后实测 8011 B。2026-10-31 复核重定档：逐文件复读 8 个模块（formula 2317 / windowed 1996 / pivot 1097 / query 851 / conditional 565 / history 490 / clipboard 363 / index 332），无可无行为变化清除的冗余（最大可清项 evaluateFormula 仅 19 B 且属公开导出，geometrySummary 的 try/catch 25 B 属已声明防御路径）；2.2% 余量已无预警意义，按实测上浮 15% 重定档 9 KB（利用率 86.9%）。再次扩展前必须先做包体评估或瘦身 |
| @oas-ui/ui/data/table/format 链 gzip | 4.6 KB | 6.0 KB（绝对值） | 实测 gzip 4.7 KB（条件格式 capability + 规则引擎，无表单控件；不进入 table 默认链），上浮约 27% 定档 6 KB |
| @oas-ui/ui/data/table/view 链 gzip | 1.0 KB | 1.5 KB（绝对值） | 实测 gzip 1.0 KB（完整视图快照 + 可配置 key 的持久化适配器，无 table 运行时依赖），上浮定档 1.5 KB |
| @oas-ui/ui/data/table/range 链 gzip | 11.9 KB | 13.5 KB（绝对值） | 实测 gzip 12181 B（range/index 9715 = 选区控制器本体，未内联 table 运行时；window-data 840 / interactive 626 / clipboard 363 / capability 340 / row-key 297），其中 662 B 为本链未使用的导出（window-data 534 / clipboard 128），真实消费者构建经 tree-shaking 不携带，故真实量级约 11.5 KB。2026-10-31 复核：唯一可去重项是 findRowPath 与 indexRowPaths 的双实现（69 B），低于瘦身阈值；旧宿主视图签名回退（30 B）无测试覆盖但属 getDisplaySnapshot? 兼容契约，保留。按实测上浮 13.5% 重定档 13.5 KB（利用率 88.1%） |
| @oas-ui/ui/data/table/history 链 gzip | 3.5 KB | 4.0 KB（绝对值） | 实测 gzip 3.4 KB（撤销/重做栈 + 受控记录/事务 + oas-edit 行键/原类型回写 + 树形子行递归 + 交互宿主穿透），上浮约 18% 定档 4 KB |
| @oas-ui/ui/data/table/detail 链 gzip | 3.7 KB | 4.5 KB（绝对值） | 实测 gzip 3805 B（detail/index 2882 / interactive 626 / row-key 297，无未用导出虚高）。2026-10-31 复核：唯一重复实现是 isInputTarget 与 isInteractiveEvent（排除清单已含 input/select/textarea/[contenteditable]），实测仅 60 B；其余（内联 findIndex / activeEscapeClose 冗余状态）合计 ≤25 B。无冗余可清，按实测上浮 18% 重定档 4.5 KB（利用率 82.6%） |
| @oas-ui/ui/data/table/pivot 链 gzip | 1.2 KB | 1.8 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1276 B / 1 文件（二维透视矩阵：行列分组 + 5 种聚合 + 多值指标展列 + 可选合计行/列/全表，单文件零依赖），上浮约 40% 取整定档 1.75 KB |
| @oas-ui/ui/data/table/value-format 链 gzip | 1.9 KB | 2.5 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1899 B / 2 文件（格式化器本体 1651 + 统一 dev-warn 248；数值/日期/文本/自定义四类 spec + 本地时区 ISO 子集 token + 非法 spec 告警回落），上浮约 35% 取整定档 2.5 KB |
| @oas-ui/ui/data/table/query 链 gzip | 1.8 KB | 2.5 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1818 B / 1 文件（查询状态 + 过滤树 13 种算子 + 稳定排序 + 分页，纯函数零依赖），上浮约 41% 取整定档 2.5 KB |
| @oas-ui/ui/layout/scroll-area/infinite 链 gzip | 4.1 KB | 5.0 KB（绝对值） | 实测 gzip 3916 B / 3.8 KB / 3 文件（2026-10-29 首次独立定档；headless 控制器：滚动/尺寸/资源监听、双边缘状态机、prepend 锚定与 keyed 重查、ResizeObserver 资源补偿；仅 dev-warn 一个共享依赖，无滚动引擎/无自定义元素），上浮约 31% 定档 5 KB 绝对值 |
| @oas-ui/ui/data/gantt/export 链 gzip | 1.1 KB | 1.5 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1110 B / 2 文件（csv 本体 1056 + 入口转发 54，链含拍平/类型推导/CSV 转义，无组件运行时/无 core/i18n），上浮约 30% 取整定档 1.5 KB |
| @oas-ui/ui/data/gantt/evm 链 gzip | 1.3 KB | 1.5 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1097 B / 1 文件（EVM 预算/PV/EV/AC/指标 + 拍平 + DST 安全日索引，单文件零依赖），上浮约 30% 取整定档 1.5 KB |
| @oas-ui/ui/data/gantt/alap 链 gzip | 1.6 KB | 2.0 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1423 B / 1 文件（后向 CPM 反推最晚日期：Kahn 拓扑 + 四类依赖 lag 公式 + 环 best-effort + hour 成分保留，单文件零依赖），上浮约 30% 取整定档 2 KB |
| @oas-ui/ui/data/gantt/recurring 链 gzip | 1.5 KB | 2.0 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1380 B / 1 文件（daily/weekly/monthly 周期展开 + count/until/窗口终止 + 短月跳过 + hour 成分保留，单文件零依赖），上浮约 30% 取整定档 2 KB |
| @oas-ui/ui/data/resource/cost 链 gzip | 0.9 KB | 1.3 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 828 B / 1 文件（任务成本核算：taskCost 优先 + 资源时薪推导 + resourceIds 限定 + perResource 均摊，单文件零依赖），上浮约 30% 取整定档 1.25 KB |
| @oas-ui/ui/data/resource/pool 链 gzip | 0.6 KB | 0.8 KB（绝对值） | 运行时依赖（gantt pool 静态引入）+ 可独立按需 import；实测 gzip 490 B / 1 文件（ResourcePool id 去重登记表 + version 变更计数 + globalThis Symbol.for 共享单例，单文件零依赖），上浮约 30% 取整定档 0.75 KB |
| @oas-ui/ui/data/resource/load 链 gzip | 1.8 KB | 2.5 KB（绝对值） | helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1822 B / 2 文件（shared/resource-load 实现本体 1740（day/week/month 三粒度 + 周锚定/部分桶/超配累计 + gantt 清洗最小子集；本体与 gantt show-resource-load 属性共用，随组件链进 L1/族包，helper 入口路径不进）+ 入口转发 82），上浮约 37% 取整定档 2.5 KB |
<!-- END:generated:perf-baseline:budgets -->

> `@oas-ui/ui/data/table/core` 兼容别名已删除（v2.6.5 未发布，DEP-EXPORT-0001 单点例外），不再单独计量；`perf:size` 含 dist 零残留门禁。历史计量口径（删除前各版本）不变。

> **Headroom（v2.6.4 实测，历史记录）**：CDN 38.7 KB、全量入口 76.6 KB、table 9.0 KB、theme index 2.3 KB、glass-fluid 0.4 KB。下一版新增能力前先做预算评审；低于 3% headroom 的入口默认不加功能，先做瘦身或独立子包。

> 规则：**新增 L3 能力子包 / 可选运行时须配独立绝对值档**（见 `docs/architecture.md` §3.1；登记进 `scripts/perf/lib/l3-registry.mjs`）；可选层文件不参与全量天花板（不进 union，由泄漏断言保证）。

### 渲染预算（本地/发布前，`pnpm perf:bench` 量级防退化）

<!-- BEGIN:generated:perf-baseline:render-budgets -->
阈值取多轮实测 p95 的约 3~5 倍取整（happy-dom 下耗时跨轮次波动明显）：button 首渲染 5 ms / input 首渲染 15 ms / table 100 行首渲染 50 ms / select 100 选项首渲染 50 ms / tabs 10 面板 15 ms / form 10 字段 40 ms / table 数据更新 50 ms / select 选项更新 160 ms。渲染耗时波动大，**不进 CI**。
<!-- END:generated:perf-baseline:render-budgets -->

阈值单一真源为 `scripts/perf/lib/render-budgets.mjs`（含各档定档依据）；渲染耗时波动大，**不进 CI**。

## 5. 文件清单

| 文件                            | 作用                               |
| ------------------------------- | ---------------------------------- |
| `scripts/perf/size.mjs`         | 体积基准 + 预算断言 + L3 分层/档案一致性等结构门禁（CI） |
| `scripts/perf/render-bench.mjs` | 渲染基准 + 量级断言（本地/发布前） |
| `scripts/perf/gen-baseline-docs.mjs` | perf-baseline.md 生成块刷新（`pnpm perf:docs`） |
| `scripts/perf/lib/baseline.mjs` | 基线读写共享助手                   |
| `scripts/perf/lib/l3-registry.mjs` | L3 能力子路径登记表（单一登记源）+ 分层判定函数 |
| `scripts/perf/lib/render-budgets.mjs` | 渲染阈值单一真源 + 实装 happy-dom 版本读取 |
| `scripts/perf/lib/baseline-docs.mjs` | 生成块构建 + 性能档案一致性门禁   |
| `docs/perf-baseline.json`       | 生成物：结构化基线数据             |
| `docs/perf-baseline.md`         | 本文档：口径 / 对比 / 预算依据     |
