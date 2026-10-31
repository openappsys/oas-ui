# OAS-UI 技术架构

> 状态：初稿（v0 骨架期）。技术选型在落地前以本文档为准。

## 1. 技术选型（决策记录）

| 项            | 选型                                               | 理由                                                    |
| ------------- | -------------------------------------------------- | ------------------------------------------------------- |
| 组件载体      | **Web Components**（Custom Elements + Shadow DOM） | 框架无关、浏览器原生、React/Vue/原生皆可用              |
| 组件基类      | 自研轻量基类（`OASElement`，基于 `HTMLElement`）   | 核心无第三方运行时依赖；响应式自研（见 §2.1），不引第三方基类库 |
| 响应式        | **自研 signal + 自研断点/容器查询桥接**            | 零依赖原则的延伸；组件粒度小，自研成本可控（见 §2.1）   |
| 语言          | TypeScript strict                                  | 全量类型、属性/事件类型导出                             |
| 构建          | Vite（library mode）+ `tsc --emitDeclarationOnly`   | 产出 ESM + `.d.ts`，按需加载                            |
| 单测          | Vitest + happy-dom                                 | 组件事件/属性/渲染                                      |
| 视觉/交互测试 | Playwright（chromium/firefox/webkit）              | 真实浏览器交互、视觉回归（可先行 chromium）             |
| 主题          | CSS 变量（`:root` + `[data-theme]`）               | 运行时换肤、宿主可覆盖                                  |
| 数据族引擎    | **全部自研**（chart SVG 绘制 / code 正则 token 高亮 / equation LaTeX 子集解析 / qrcode 编码器） | 零依赖核心约束的延伸；现有覆盖度足够（六型图表、主流语言基础着色、常用公式子集、QR 全级别 v1–40）；token 配色与主题一致；组合坐标系/语法级高亮/完整 LaTeX 等复杂场景属后续增强，届时再评估引入引擎的取舍 |
| 包管理        | pnpm workspace（monorepo）                         | 多包（core/主题/图标/文档站）依赖清晰                   |

## 2. 架构分层

```text
┌────────────────────────────────────────────┐
│  宿主应用（React / Vue / 原生 / Svelte…）    │
├────────────────────────────────────────────┤
│  文档站（Vitepress + live demo）             │  packages/docs
├────────────────────────────────────────────┤
│  组件集  <oas-button> <oas-input> <oas-table>…│  packages/ui
│   ├── 行为层（键盘、焦点、状态机、定位）        │  src/behavior
│   ├── 渲染层（Shadow DOM 模板、样式）          │  src/components
│   └── 公共基础设施（事件、焦点陷阱、浮层、防抖） │  src/core
├────────────────────────────────────────────┤
│  主题（token CSS + 可选材质/皮肤层）           │  packages/theme
├────────────────────────────────────────────┤
│  图标（内联 SVG 集，tree-shakable）           │  packages/icons
└────────────────────────────────────────────┘
```

### 2.1 响应式系统（自研，决策记录 2026-08）

两种"响应式"分别自研，不引入第三方基类库 / Vue reactivity / 第三方信号库。

**决策理由**：零运行时依赖是本项目的核心卖点；组件库场景更新粒度小（单组件 shadow 内），自研成本远低于应用级场景。第三方基类库的响应式虽成熟，但引入即破坏零依赖承诺，且其模板体系（第三方模板体系）会重塑组件写法，沉没成本高。

**风险与对策**：自研 signal 的坑在内存泄漏（effect 未清理）与更新抖动（未批处理）——以测试矩阵兜底（见下"验收"）。

**A. 数据响应式（signal）**

core 提供约百行的最小实现，API 对齐signal 心智：

```ts
const count = signal(0) // 可读写的原子状态
const double = computed(() => count.value * 2) // 派生，惰性+缓存
effect(() => {
  /* 依赖自动收集 */
}) // 副作用，返回 dispose
```

- **依赖收集**：effect 执行期间访问的 signal 自动订阅（Push-Pull：写时标脏，读时重算）
- **批处理**：同一微任务内多次写只触发一次 effect（`queueMicrotask` 调度）
- **与 OASElement 集成**：组件 `render/update` 包在 effect 里，读到的 signal 变化自动触发增量 `update()`；attribute/property setter 写入 signal，打通"外部改属性 → 内部响应"
- **清理**：`disconnectedCallback` 统一 dispose 组件 effect，防泄漏
- **不做**：模板级细粒度 DOM 绑定（vdom/编译时优化）。组件级重渲染 + 既有增量 `update()` 已够用，table 等重组件靠 `update()` 的 diff 控制成本

**B. 响应式布局（断点 + 容器查询）**

- **断点 token**：`@media` 条件不支持 CSS 变量，断点值以 TS 常量+CSS 字面量双源维护（`xs 0 / sm 576 / md 768 / lg 992 / xl 1200 / xxl 1600`），core 导出 `breakpoints` 常量，CSS 侧写字面量并在注释中标明 token 对应
- **视口断点桥接**：core 提供 `matchBreakpoint(bp)`（`matchMedia` 封装）与 `useBreakpoint()`（signal 化的当前断点，供组件 JS 逻辑订阅）
- **容器查询优先**：组件自身布局响应一律 `@container`（组件感知宿主容器宽度而非视口，更符合"组件可被嵌入任意布局"的定位）；容器查询不可用的场景降级 `matchMedia`
- **尺寸监听**：core 提供 `observeResize(el, cb)`（`ResizeObserver` 封装 + disconnected 自动断开）
- **grid 等组件**：`span` 响应式对象（`{ xs: 24, md: 12 }`）经 `matchBreakpoint` 桥接到 class 切换

**验收（纳入测试矩阵）**

- signal：依赖收集正确性、批处理（多次写一次触发）、computed 缓存与惰性、dispose 后不再触发、组件断开无残留订阅
- 布局：各断点 `matchBreakpoint` 命中正确、grid 响应式切换、`@container` 在文档站 demo 可视验证

### 关键机制

- **`OASElement` 基类**：统一生命周期、属性观察（`observedAttributes` → 属性代理 state）、CSS 变量注入、`part` 暴露约定、事件命名约定。所有组件继承自它。
- **增量渲染**：`render()` 只在首次连接时构建 shadow DOM；属性变化走 `update()` 增量同步（class/aria/文本），禁止 innerHTML 全量重建——否则 input 丢光标、focus 丢失、table 行状态重建。
- **property / attribute 双通道**：标量（string/number/boolean）走 attribute + 反射；复杂数据（`options`/`columns`/`data`/`rules`）只走 property（JS 对象，不序列化进 attribute）。基类提供属性 setter 与变更通知约定。
  - **决策修订（v1.9）**：数据组件新增 attribute（JSON 字符串）回退通道，property 优先——动机是 DSD 序列化需要声明式内容（SSR 快照含数据行）。属性通道统一经 attribute 解析（property setter 反射到 attribute，`parse()` 从 attribute 读 JSON 并容错非法值回退空态），避免 attr↔prop 双向漂移。`data`/`columns` 等语义与 DOM API 重名的属性名，宿主框架 property 赋值正常命中实例属性；attribute 通道仅作声明式/SSR 场景的序列化载体。
- **受控/非受控**：表单类组件支持"属性驱动"（外部绑 `value`）与"内部 state"双模式，对齐 React 心智。
- **清理钩子**：基类提供 `disconnectedCallback` 统一 teardown 注册（计时器、全局监听、浮层引用），防止泄漏。
- **重连语义**：组件在 `bind()` 绑定 `document/window` 级监听（Esc、外点关闭、scroll/resize 跟随、快捷键等）时，必须在 `onReconnect` 重挂（基类清理是一次性的，`remove()` 再 `append()` 后监听丢失即交互失效）。浮层族（modal/drawer/dropdown/context-menu/sidebar/tour）的 Esc 层与滚动锁已在 `disconnectedCallback` 主动释放、重连后由 open 边沿重获。
- **事件命名**：一律 `oas-*` 前缀 CustomEvent，payload 挂 `detail`，bubbles + composed（穿透 Shadow DOM）。
- **跨 Shadow DOM 的 ARIA 关联**：idref（`aria-describedby`/`aria-labelledby`）不能穿透 shadow 边界。方案：core 提供 id 生成器；表单错误提示优先用 `aria-live` region 播报 + `aria-invalid` 标记，跨组件 idref 场景由 form 容器在 light DOM 侧协调。
- **overlay 管理器**：浮层栈、z-index 语义 token（`--oas-z-tooltip/popover/modal/message`）、点击外部关闭；Esc 层栈与 body 滚动锁由 `@oas-ui/ui` 的 `shared/overlay-stack` 提供（modal/drawer/tour/dropdown/context-menu/sidebar 共用），tooltip/message 等轻提示不走该栈。
- **i18n**：locale 注册表（`setLocale / t()`），组件内置文案（空态、确认/取消）走查表；当前内置 zh-CN，默认文案按家族切片分发（见 §2.2）。
- **主题注入**：组件样式只写 token 引用；宿主只需一次 `import '@oas-ui/theme'` 定义 `:root` 变量即可换肤。
- **SSR**：Web Components 原生不 SSR；提供"无 JS 占位 + 渐进增强"策略作为边界（见 ROADMAP SSR 项）。

### 2.2 i18n 默认语言包按家族切片（包体止损批，未发布）

内置 zh-CN 默认文案拆成 **9 个家族切片**（basic / conversation / data / feedback / form / framework / layout / navigation / workbench），按需引入的组件链只携带本族默认文案，不再每条链都带约 6.8 KB（gzip）的全集。

- **单一事实源 + 生成物**：`packages/i18n/src/locales/zh-CN.ts` 保持手写全集（唯一事实源，完备性测试基准）；`node scripts/i18n/gen-slices.mjs` 静态扫描组件源码的 key 引用，生成 `packages/i18n/src/slices/<family>.ts`（文件头标注生成物，入库提交）；`--check` 模式做防漂移比对，接入 i18n 完备性单测。
- **消费形态：值导入 + 显式调用**（不依赖模块副作用与 `sideEffects`，各类打包器 tree-shake 下都保留）：

  ```ts
  import { registerDefaultMessages } from '@oas-ui/i18n/registry'
  import { dataMessages } from '@oas-ui/i18n/slices/data'

  registerDefaultMessages(dataMessages)
  ```

- **入口分工**：公共入口 `@oas-ui/i18n` 行为不变（9 切片全量注册）；新子路径 `@oas-ui/i18n/registry` 只含 registry API（无默认文案）、`@oas-ui/i18n/slices/<family>` 只导出本族消息对象；组件入口注册自己家族的切片。
- **`getLocale().messages` 语义**：按需消费下只保证**已加载的切片**；需要全集仍可用整包 `import zhCN from '@oas-ui/i18n/zh-CN'`（整包导出不变）。`t()` 未命中回退 key 本身，dev 下每个 key 输出一次去重告警（生产静默）。
- **跨家族 key 重复规则**：被多个族引用的 key **重复写入每个消费族的切片**（不按所有者单族分配）——重复实例约 0.2–0.3 KB，只在全量口径可见，按需链无恶化。无活代码引用的 8 个死键归 framework 族。
- **构建**：i18n 发布产物加 `removeComments`（发布产物去注释，d.ts 保留文档注释）；`packages/i18n` 的 `sideEffects` 增 `./dist/registry.js`（registry 有真实模块级副作用，须防消费方摇掉）。
- **顺带修复**：打包消费方（含 CDN）此前可能丢失默认语言包（裸副作用 import 在打包时被摇掉 → 界面出现 raw key）；现组件入口显式注册切片，CDN 产物含 9 族文案，`perf:size` 新增 `[CDN 默认文案]` 断言锁定。
- **实测收益**（gzip，dist 静态闭包口径）：form 28.9 → 22.4 KB、table 68.8 → 64.3 KB、gantt 66.7 → 61.1 KB、json-viewer 34.0 → 28.4 KB、diff-viewer 32.7 → 27.1 KB；helper 链（table/advanced、range、detail、glass-fluid）不变。

## 3. Monorepo 包结构

```text
oas-ui/
├── docs/                        # 产品档案（本目录）
├── packages/
│   ├── core/                    # OASElement、工具、事件/焦点/浮层基础设施
│   ├── theme/                   # 语义 token（CSS）+ 可选材质/皮肤层（glass.css/glass-fluid.js/skins.css，独立可选、不进 union）
│   ├── icons/                   # 内联 SVG 图标（生成）
│   ├── ui/                      # 全部组件（按目录分组，见下）
│   ├── i18n/                    # locale registry + 语言包（v0.10）
│   ├── docs/                    # Vitepress 文档站 + live demo
│   └── playground/              # React / Vue 双宿主示例（验收用）
├── package.json                 # workspace 根
├── tsconfig.base.json
└── vitest.config.ts / playwright.config.ts
```

### `packages/ui` 组件目录分组（对齐 ROADMAP 批次）

| 目录          | 组件                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `basic/`      | badge, button, button-group, divider, icon, kbd, label, link, space, tag, typography, visually-hidden                     |
| `form/`       | auto-complete, calendar, cascader, checkbox, color-picker, combobox, date-picker, dynamic-input, dynamic-tags, editable, form, form-item, input, input-number, mentions, pin-input, radio, rate, segmented, select, slider, switch, textarea, time-picker, toggle-button, toggle-group, transfer, tree-select, upload |
| `data/`       | avatar, avatar-group, card, carousel, chart, code, collapse, comment, countdown, descriptions, diff-viewer, ellipsis, equation, gradient-text, image, image-group, json-viewer, list, log, marquee, number-animation, qrcode, statistic, table, timeline, tree, virtual-list, watermark |
| `feedback/`   | alert, backdrop, bottom-sheet, confirm, drawer, empty, hover-card, loading-bar, message, modal, notification, popconfirm, popover, progress, result, skeleton, snackbar, spin, toast, tooltip |
| `navigation/` | affix, anchor, app-bar, back-top, bottom-navigation, breadcrumb, command, contextmenu, dropdown, float-button, menu, menubar, navigation-menu, page-header, pagination, speed-dial, stepper, steps, tabs, toolbar, tour |
| `layout/`     | aspect-ratio, container, flex, grid, layout, masonry, scroll-area, sidebar, splitter                                      |
| `framework/`  | app, config-provider, theme-editor                                                                                        |
| `overlay/`    | floating（浮层定位引擎，非组件）                                                                                          |
| `shared/` `families/` | 共享设施（direction / touch-target / mobile-sheet）与族包入口定义，非组件                                         |

每个组件一个目录：`index.ts`（注册 + 导出）+ `oas-button.ts`（定义）+ `oas-button.test.ts`（单测）；组件 demo 页在 `packages/docs/docs/components/*.md`。

### 3.1 打包分层模型（L1 / L2 / L3）

按需打包的三层入口模型：v2.4.1 拆出第三层（组件内能力子包）；v2.6.4 定稿按需语义（默认入口 = 基础形态，L3 能力显式 import）；v2.6.5 移除过渡别名 `/core`（见下文单点例外）。

**术语规范**：「L1 / L2 / L3」为**开发者语境**（本文档、PRD/ROADMAP、源码注释、提交信息）的架构术语，唯一定义锚点即本节；**用户语境**（组件文档、guide、CHANGELOG、API 描述、demo）一律用功能名「默认入口 / 能力子路径」，不出现层号——层号对使用者不承载可操作信息，对开发者携带层序语义。

| 层        | 入口                                                                 | 内容                                                 | 面向                                   |
| --------- | -------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| L1 全量层 | `@oas-ui/ui`、CDN 族包                                               | 全部组件 + 全部能力（含 edit/Pro）                   | 一把梭消费、原型 / CDN 场景            |
| L2 组件层 | `@oas-ui/ui/<族>/<组件>`（如 `data/table`）                           | 单组件基础形态；重型能力按需补引                     | 按需 tree-shaking 的常规消费           |
| L3 能力层 | `@oas-ui/ui/<族>/<组件>/<能力>`（如 `data/table/edit`）                | 组件内重型/可选能力独立成包                           | 需要该能力的消费者显式补引；大表面隔离 |

规则：

- 包含关系：L1 ⊇ L2；**注册型 L3 必须含于 L1**（否则 CDN 一把梭消费者声明对应属性时能力静默失效），**纯函数/宿主侧 helper 型 L3 不进 L1/CDN**（无 HTML 触发面，进 union 即死重，按需显式 import）；L2 **不默认含 L3**（v2.6.4 起）。过渡别名 `/core` 已于 v2.6.5 删除（未发布）。
- 注册语义：注册型 L3 import 即注册、晚加入自愈（已挂载元素自动补齐）；helper 型 L3 的**激活唯一入口是导出函数**（可含 import 期惰性注册，但没有 HTML/属性触发面），宿主不调用导出函数则无效果（`format` / `range` 内部虽调用能力注册表，仍属 helper 类）。
- L3 现有实例（登记表 = `scripts/perf/lib/l3-registry.mjs`，单一登记源驱动 `perf:size` 结构门禁）：
  - **注册型（含于 L1/CDN）**：`table/edit`、`tabs/manager`、`modal/prompt`、`popover/contextmenu`、`color-picker/designer`；
  - **helper 型（不进 L1/CDN）**：`table/advanced`（透视/公式/查询/条件格式/TSV/历史栈/windowed 纯函数）、`table/format`（条件格式）、`table/view`（视图状态）、`table/range`（区域选择）、`table/history`（撤销重做）、`table/detail`（主从详情宿主侧 helper）、`layout/scroll-area/infinite`（无限滚动 headless 控制器 `createInfiniteScroll` / `InfiniteScrollController`）。
  - **量化决策（2026-10-24，v2.6.4）**：默认入口 `data/table` 改为基础表格，编辑能力外置为 `table/edit`；全量入口 `@oas-ui/ui` 显式补 edit。旧 `table/core` 保留为 deprecated 别名一个版本，v2.6.5 删除。
  - **单点例外（2026-10-28，v2.6.5，用户批准）**：`table/core` 删除落在 minor（2.6.5）而非下一个 major。理由：它是默认入口的**等价别名**（re-export 同一构造器，非独立 API 面），且 v2.6.4 发布时已随默认入口语义切换预告移除。此例外已登记 `docs/deprecations.json` DEP-EXPORT-0001（`minorException` 字段；该条 `state=removed` 且 `removeIn` 指向未发布版本，表示代码已删、将随 2.6.5 发布生效），`deprecations:check` 仅对 `package-export` 面放行该豁免，且仅限「同 major、严格高于当前版本的合法 x.y.z」的非 major 提升（patch 或 minor 提升均可）——**组件 API 面（attribute/prop/event/method/css-var/export）的 minor/patch 移除一律拒绝**，本例外不构成先例。
  - **历史决策（2026-10-08）**：v2.5.0 曾定「L2 主路径默认含能力、`/core` 为纯核」；该结论已被 v2.6.4 的按需模型替代。
- 体积纪律：L3 与 L2 的共享常量/判定落在零依赖叶子模块；L3 不得被 L2 默认 import，各 L3 立独立预算档。

**新增 L3 的判据（何时把能力拆为子包）**：① 该能力**成本显著**（单独引入会明显抬高主链，或依赖某重组件）；② 存在**不需要它**的消费者群；③ 拆出后能独立按需 import，且不破坏 L2 API。满足即拆；L3 不得反向被 L2 默认 import。

**层间演进与一致性门禁（并入 CI，`perf:size` 强制）**：

- 关系不变量：L1 ⊇ L2；注册型 L3 含于 L1 **与所属 CDN 族包**（`perf:size` 按 `dist/cdn/<family>.js.map` 的构建输入逐一断言）、helper 型 L3 不进 L1/族包，L2 不默认含 L3；过渡别名 `/core` 已删除（v2.6.5，用户批准的单点例外，见上文）；
- **可选层零泄漏**：`perf:size` 断言所有可选层文件（`theme/glass-fluid.js` / `theme/glass.css` / `theme/skins.css` 等）**不出现在**全量入口链与任一单组件链的可达闭包内；
- **L2 不吸 L3**：`table` 默认链不得包含 edit 或任何 Pro 能力子路径；table 家族 L3 与 `layout/scroll-area/infinite` 独立计量；
- **登记表驱动**：L3 分类与包含关系以 `scripts/perf/lib/l3-registry.mjs` 为单一登记源，判定函数红绿两侧进 `perf:size --self-test`，live dist 断言随构建把关；
- **新增 L3 / 可选运行时须登记并配独立体积预算档**（登记表 + `docs/perf-baseline.md` §4）。

**可选层登记表**（新增可选层须登记；机制复用既有 `registerXxx` 能力注册 + `warnXxx` dev 告警先例）：

| 入口                            | 进 union？       | 未引入时行为                          | dev 告警               | 面向             |
| ------------------------------- | ---------------- | ------------------------------------- | ---------------------- | ---------------- |
| `@oas-ui/theme/glass.css`       | 否               | 无玻璃材质（回落基础样式）            | 无                     | 材质皮肤消费者   |
| `@oas-ui/theme/glass-fluid.js`  | 否               | 无指针高光（其余玻璃层不受影响）      | 无                     | 动态材质消费者   |
| `@oas-ui/theme/skins.css`       | 否               | 无预设皮肤                            | 无                     | 皮肤消费者       |
| 注册型 L3（`table/edit` 等 5 个） | **是**（含于 L1/CDN 族包） | 默认入口不含；显式 import 才启用 | `warnEditNotImported`  | 按需能力消费者   |
| helper 型 L3（table 6 个 Pro 子路径 + `layout/scroll-area/infinite`） | 否（无 HTML 触发面，进 union 即死重） | 默认入口不含；宿主显式 import 并调用导出函数 | 无 | 按需能力消费者   |

> 原则：**整包级可选层**（材质/皮肤/运行时，独立文件）不进 union；**注册型 L3** 必须含于 L1（否则 CDN 一把梭消费者用不到该能力）；**helper 型 L3** 不进 union（宿主代码显式调用，CDN 无 JS 场景本就调不到）。三类"可选"不可混同。

**效果层扩展点（预留锚点）**：新增"效果/材质运行时"（如指针高光、实时材质）一律按**既有运行时注册表机制**挂接——单文档命中（`composedPath`）+ surface 注册表 + 按注册表注入/降级，`glass-fluid.js` 即首个实例。**不预设抽象层**：等第二个运行时真实出现再按 §3.1「JS 运行时的包归属」的触发条件收敛，避免为不存在的第二实现投机泛化。

**JS 运行时的包归属（决策记录 2026-10-08）**：可选 JS 运行时（当前仅 `glass-fluid.js`）**暂留 `@oas-ui/theme` 子路径，不为单文件新建发布包**——拆包只有语义纯度收益、**零体积收益**（本就不进 union），却带来发布拓扑成本（`release-check` 包清单、OIDC Trusted Publisher、构建/dev 链路接线）。**拆包触发条件**（任一命中即报批拆分）：**T1** 效果运行时族出现第二个 JS 成员（族外首个 runtime 立项即算）；**T2** `glass-fluid.js` 需拆多文件或实测超其独立预算档 2 倍；**T3** 出现「只要效果层、不要 token」的真实解耦消费需求。**硬规则**：届时若拆，**必须保留 `@oas-ui/theme/glass-fluid.js` 为 re-export shim**（`export * from '@oas-ui/<新包>'`），不得硬删——把可避免的 breaking 消解掉。

### 3.2 SSR 验收 fixture 与真实浏览器基线（独立依赖图）

- **位置与隔离**：`packages/ssr/fixtures/{next,nuxt}` 是生产构建验收 fixture。每个 fixture 是**独立单包 workspace**（自带 `package.json` + `pnpm-lock.yaml` + 仅含 `allowBuilds` 的 `pnpm-workspace.yaml`），**不是根 workspace 成员**：根 `pnpm-workspace.yaml` 保持 `packages/*`，层级不匹配；根 install/build 不触碰 fixture，fixture 也不会进入 `@oas-ui/ssr` 的 npm `files`（仍只有 `dist` + LICENSE）。
- **依赖获取**：fixture 用 `link:` 指向主仓 `packages/*` 的构建产物（`@oas-ui/ssr` / `ui` / `theme` / `i18n` / `nuxt`），因此 **先 `pnpm build` 主仓**；依赖版本由 fixture 自己的 lockfile 锁定（Next 16.x / Nuxt 4.x / React 19 / Vue 3），CI 用 `--frozen-lockfile`。**Next fixture 不消费 `@oas-ui/next` 包入口**：它由 `lib/ssr-runtime.ts` 在 Node 运行时按绝对文件 URL 加载 `packages/ssr/dist/index.js`（linked 包 + Turbopack 无法处理按 tag 的动态导入表），验证的是主仓 dist 的 SSR 行为；**fixture 不覆盖 npm 安装 / `exports` 路径**（包 `exports` / `react-server` 条件 / client reference / peer 解析均不在验收内），**当前无 pack smoke**。
- **执行边界**：fixture e2e 文件命名 `*.e2e.ts`，由独立 `playwright.ssr.config.ts` 收集（端口 4301/4302）；根 `playwright.config.ts` 只收 `*.spec.ts`，全量 e2e 不会带上 fixture。CI 使用独立 job（root install/build → fixture install/build → fixture e2e）。
- **全局 DOM shim 的进程边界**：`@oas-ui/ssr` 首次渲染把 happy-dom 的 `window`/`document`/`HTMLElement` 装到 `globalThis`（组件类求值需要）。与框架 SSR 同进程会改变框架的环境探测（Nuxt 实测：DSD 请求后 Vue 页面 500 `history is not defined`）。Nuxt fixture 因此把 DSD 渲染放进常驻 `worker_threads` worker；生产接入同栈时应采用 worker/子进程/独立服务隔离，而不是在同一进程混跑。
- **性能基线**：`scripts/perf/browser-bench.mjs` + `docs/perf-browser-baseline.json` 记录真实 Chromium 的 CSR/DSD 首屏数据（原始样本 + 每轮 min/median/p95 + 环境元数据 + gitSha/包版本/同 SHA 噪声）。它是**观测档案，不是预算**：数值回归只 WARN，只有测量无效（构建失败/选择器缺失/样本不足/指标非有限/count ≠ rounds×perRound/LCP 未采集/pageerror/console error）才非零退出；`--update-baseline` 写盘前走同一校验，性能预算仍由 `perf:size` 负责。

## 4. 构建与产物

- library mode：`es`（ESM），`preserveModules` 保持每组件独立文件，`sideEffects` 白名单仅含注册入口与 CSS，支持 tree-shaking
- 每个组件可独立按需引入：`import '@oas-ui/ui/basic/button'`（side-effect 注册）与 `import { OASButton } from '@oas-ui/ui'`（显式注册）双路径
- `.d.ts` 由 `tsc --emitDeclarationOnly` 产出到 `dist/types/`（构建必含，发布验收项）
- 产物目录：`dist/`（esm，保持 src 目录结构）、`dist/types/`
- 图标库由源 SVG 目录脚本生成，产出按名称树摇

## 5. 可访问性基线（架构级承诺）

- 每个交互组件必须有：键盘可达（Tab/方向键/Enter/Space）、ARIA 角色与状态同步（`aria-*` 随 state 更新）、焦点可见性、屏幕阅读器可读名称
- 表单类组件原生元素优先（`<input>`/`<select>`/`<button>`），自定义组件补 aria 同步
- 新组件默认在 Playwright 里带 axe-core 无障碍断言

## 6. 测试矩阵（架构级）

| 层       | 工具                  | 覆盖                                                           |
| -------- | --------------------- | -------------------------------------------------------------- |
| 单测     | Vitest                | 属性映射、事件派发、state 转移、边界（disabled/empty/loading） |
| 行为测试 | Vitest + happy-dom    | 键盘导航、焦点陷阱、受控模式                                   |
| 视觉回归 | Playwright screenshot | 每组件各状态、light/dark                                       |
| 无障碍   | Playwright + axe-core | 键盘流 + ARIA                                                  |
| 互操作   | playground            | React/Vue 真实宿主跑通、事件/属性桥接                          |

## 7. 技术路线图（里程碑，对应产品 ROADMAP 批次）

> 状态：M0–M6 与 v1.0.0 均已交付（含 v0.10 i18n、v0.11 config-provider/app）。本表为历史里程碑记录；后续按 ROADMAP v1.x 推进。

| 里程碑      | 交付                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| M0 骨架     | monorepo + 构建 + 测试基础设施 + CI 脚本，一个 hello 组件跑通全链路                                    |
| M1 地基     | core 基类（增量渲染）+ theme + icons + basic 8 件 + 文档站骨架 + 构建补课（d.ts/exports/tree-shaking） |
| M2 表单     | form 13 件 + 校验机制 + Playwright 视觉基线                                                            |
| M3 反馈     | overlay 管理器 + 浮层基础设施 + 反馈 12 件 + tooltip/popover + 键盘/焦点完备                           |
| M4 数据     | table（最重）/tree + 展示 8 件                                                                         |
| M5 布局导航 | layout/grid/flex/splitter + 导航 9 件                                                                  |
| M6 打磨     | SSR 边界、多主题完整、React/Vue playground、无障碍全审计                                               |
| v1.0.0      | 发布：npm 可用、文档站、CHANGELOG、贡献指南、i18n + config-provider/app                                |

---

下一份：`docs/ROADMAP.md`（产品路线图 + PRD 验收）。
