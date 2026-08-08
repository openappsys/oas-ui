# OAS-UI 技术架构

> 状态：初稿（v0 骨架期）。技术选型在落地前以本文档为准。

## 1. 技术选型（决策记录）

| 项 | 选型 | 理由 |
|---|---|---|
| 组件载体 | **Web Components**（Custom Elements + Shadow DOM） | 框架无关、浏览器原生、React/Vue/原生皆可用 |
| 组件基类 | 自研轻量基类（`OASElement`，基于 `HTMLElement`） | 核心无第三方运行时依赖；响应式自研（见 §2.1），不引第三方基类库 |
| 响应式 | **自研 signal + 自研断点/容器查询桥接** | 零依赖原则的延伸；组件粒度小，自研成本可控（见 §2.1） |
| 语言 | TypeScript strict | 全量类型、属性/事件类型导出 |
| 构建 | Vite（library mode）+ `vite-plugin-dts` | 产出 ESM + `.d.ts`，按需加载 |
| 单测 | Vitest + happy-dom | 组件事件/属性/渲染 |
| 视觉/交互测试 | Playwright（chromium/firefox/webkit） | 真实浏览器交互、视觉回归（可先行 chromium） |
| 主题 | CSS 变量（`:root` + `[data-theme]`） | 运行时换肤、宿主可覆盖 |
| 包管理 | pnpm workspace（monorepo） | 多包（core/主题/图标/文档站）依赖清晰 |

## 2. 架构分层

```
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
│  主题 token（CSS 变量：色/字号/间距/圆角/动效） │  packages/theme
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
const count = signal(0)              // 可读写的原子状态
const double = computed(() => count.value * 2)  // 派生，惰性+缓存
effect(() => { /* 依赖自动收集 */ })  // 副作用，返回 dispose
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
- **受控/非受控**：表单类组件支持"属性驱动"（外部绑 `value`）与"内部 state"双模式，对齐 React 心智。
- **清理钩子**：基类提供 `disconnectedCallback` 统一 teardown 注册（计时器、全局监听、浮层引用），防止泄漏。
- **事件命名**：一律 `oas-*` 前缀 CustomEvent，payload 挂 `detail`，bubbles + composed（穿透 Shadow DOM）。
- **跨 Shadow DOM 的 ARIA 关联**：idref（`aria-describedby`/`aria-labelledby`）不能穿透 shadow 边界。方案：core 提供 id 生成器；表单错误提示优先用 `aria-live` region 播报 + `aria-invalid` 标记，跨组件 idref 场景由 form 容器在 light DOM 侧协调。
- **overlay 管理器**（v0.5 前置到 core）：浮层栈、z-index 语义 token（`--oas-z-tooltip/popover/modal/message`）、层叠 Esc 关闭、点击外部关闭。tooltip/modal/message 共用。
- **i18n 预留**：core 提供 locale 注册表（`setLocale/ t()`），组件内置文案（空态、确认/取消）走查表；当前内置 zh-CN，结构可扩展。
- **主题注入**：组件样式只写 token 引用；宿主只需一次 `import '@oas-ui/theme'` 定义 `:root` 变量即可换肤。
- **SSR**：Web Components 原生不 SSR；提供"无 JS 占位 + 渐进增强"策略作为边界（见 ROADMAP SSR 项）。

## 3. Monorepo 包结构

```
oas-ui/
├── docs/                        # 产品档案（本目录）
├── packages/
│   ├── core/                    # OASElement、工具、事件/焦点/浮层基础设施
│   ├── theme/                   # CSS 变量 token（light/dark/高对比）
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

| 目录 | 组件 |
|---|---|
| `basic/` | badge, button, divider, icon, link, space, tag, typography |
| `form/` | auto-complete, cascader, checkbox, form, input, input-number, radio, rate, select, slider, switch, textarea, tree-select |
| `feedback/` | alert, confirm, drawer, empty, loading-bar, message, modal, notification, popconfirm, progress, result, skeleton, spin |
| `floating/` | app, config-provider, contextmenu, dropdown, hover-card, menu, popover, tooltip |
| `data/` | avatar, avatar-group, card, carousel, collapse, descriptions, image, list, table, timeline, tree |
| `layout/` | affix, flex, float-button, grid, layout, page-header, pagination, segmented, splitter, steps, tabs |
| `navigation/` | anchor, back-top, breadcrumb, tour |
| `overlay/` | floating（overlay 管理器 + 浮层定位引擎） |

每个组件一个目录：`index.ts`（注册 + 导出）+ `oas-button.ts`（定义）+ `oas-button.test.ts`（单测）；组件 demo 页在 `packages/docs/docs/components/*.md`。

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

| 层 | 工具 | 覆盖 |
|---|---|---|
| 单测 | Vitest | 属性映射、事件派发、state 转移、边界（disabled/empty/loading） |
| 行为测试 | Vitest + jsdom | 键盘导航、焦点陷阱、受控模式 |
| 视觉回归 | Playwright screenshot | 每组件各状态、light/dark |
| 无障碍 | Playwright + axe-core | 键盘流 + ARIA |
| 互操作 | playground | React/Vue 真实宿主跑通、事件/属性桥接 |

## 7. 技术路线图（里程碑，对应产品 ROADMAP 批次）

> 状态：M0–M6 与 v1.0.0 均已交付（含 v0.10 i18n、v0.11 config-provider/app）。本表为历史里程碑记录；后续按 ROADMAP v1.x 推进。

| 里程碑 | 交付 |
|---|---|
| M0 骨架 | monorepo + 构建 + 测试基础设施 + CI 脚本，一个 hello 组件跑通全链路 |
| M1 地基 | core 基类（增量渲染）+ theme + icons + basic 8 件 + 文档站骨架 + 构建补课（d.ts/exports/tree-shaking） |
| M2 表单 | form 13 件 + 校验机制 + Playwright 视觉基线 |
| M3 反馈 | overlay 管理器 + 浮层基础设施 + 反馈 12 件 + tooltip/popover + 键盘/焦点完备 |
| M4 数据 | table（最重）/tree + 展示 8 件 |
| M5 布局导航 | layout/grid/flex/splitter + 导航 9 件 |
| M6 打磨 | SSR 边界、多主题完整、React/Vue playground、无障碍全审计 |
| v1.0.0 | 发布：npm 可用、文档站、CHANGELOG、贡献指南、i18n + config-provider/app |

---

下一份：`docs/ROADMAP.md`（产品路线图 + PRD 验收）。
