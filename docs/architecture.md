# OAS-UI 技术架构

> 状态：初稿（v0 骨架期）。技术选型在落地前以本文档为准。

## 1. 技术选型（决策记录）

| 项 | 选型 | 理由 |
|---|---|---|
| 组件载体 | **Web Components**（Custom Elements + Shadow DOM） | 框架无关、浏览器原生、React/Vue/原生皆可用 |
| 组件基类 | 自研轻量基类（`OASElement`，基于 `HTMLElement`） | 核心无第三方运行时依赖；若体量失控再评估 第三方基类库 |
| 语言 | TypeScript strict | 全量类型、属性/事件类型导出 |
| 构建 | Vite（library mode）+ `vite-plugin-dts` | 产出 ESM + `.d.ts`，按需加载 |
| 单测 | Vitest + `@testing-library/web-components`（或 happy-dom） | 组件事件/属性/渲染 |
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

### 关键机制

- **`OASElement` 基类**：统一生命周期、属性观察（`observedAttributes` → 属性代理 state）、CSS 变量注入、`part` 暴露约定、事件命名约定。所有组件继承自它。
- **受控/非受控**：表单类组件支持"属性驱动"（外部绑 `value`）与"内部 state"双模式，对齐 React 心智。
- **事件命名**：一律 `oas-*` 前缀 CustomEvent，payload 挂 `detail`，bubbles + composed（穿透 Shadow DOM）。
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
│   └── docs/                    # Vitepress 文档站 + live demo
├── playground/                  # React / Vue 双宿主示例（验收用）
├── package.json                 # workspace 根
├── tsconfig.base.json
└── vitest.config.ts / playwright.config.ts
```

### `packages/ui` 组件目录分组（对齐 ROADMAP 批次）

| 目录 | 组件 |
|---|---|
| `basic/` | button, icon, tag, badge, space |
| `form/` | input, select, checkbox, radio, switch, form |
| `feedback/` | message, notification, modal, tooltip, popover, spin, skeleton |
| `data/` | table, pagination, tabs, tree, empty |
| `navigation/` | menu, dropdown, breadcrumb |
| `layout/` | layout, grid, container |

每个组件一个目录：`index.ts` + `oas-button.ts`（定义）+ `oas-button.test.ts`（单测）+ `oas-button.stories.ts`（demo）。

## 4. 构建与产物

- library mode：`es`（ESM）+ `d.ts`，`sideEffects: false` 支持 tree-shaking
- 每个组件可独立按需引入：`import '@oas-ui/ui/basic/button'`（side-effect 注册）与 `import { defineButton } from '@oas-ui/ui'`（显式注册）双路径
- 产物目录：`dist/`（esm）、`dist/types/`
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

| 里程碑 | 交付 |
|---|---|
| M0 骨架（本次） | monorepo + 构建 + 测试基础设施 + CI 脚本，一个 hello 组件跑通全链路 |
| M1 地基 | core 基类 + theme + icons + basic 5 件 + 文档站骨架 |
| M2 表单 | form 6 件 + 校验机制 + Playwright 视觉基线 |
| M3 反馈 | 浮层基础设施 + modal/tooltip/popover/message + 键盘/焦点完备 |
| M4 数据 | table（最重）/pagination/tabs/tree/empty |
| M5 布局导航 | layout/grid/menu/dropdown |
| M6 打磨 | SSR 边界、多主题完整、React/Vue playground、无障碍全审计 |
| v1.0.0 | 发布：npm 可用、文档站、CHANGELOG、贡献指南 |

---

下一份：`docs/ROADMAP.md`（产品路线图 + PRD 验收）。
