# @oas-ui/icons

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 图标包 —— 原创 SVG 图标集合，tree-shakable：可按需导入单个图标路径，也可经 `oas-icon` 组件用**图标名**渲染内置图标。

### 安装

```bash
pnpm add @oas-ui/icons
```

### 用法

**按需导入单个图标路径**（tree-shakable，推荐）：

```ts
import { alertCirclePath, checkPath } from '@oas-ui/icons'
```

**用内置图标名渲染**（配合 `oas-icon` 组件）：

```html
<oas-icon name="alert-circle" size="24"></oas-icon>
```

> 内置图标名需要内置全量集已注册：引入全量入口 `@oas-ui/ui` 会自动注册；**按需引入单个组件**时，使用内置图名需先 `import '@oas-ui/icons/register'` 一次。

每个图标是 24×24 viewBox 的 path 字符串；颜色走 CSS `currentColor` 继承，自动适配 light / dark。

### 子路径

| 子路径 | 用途 |
| --- | --- |
| `@oas-ui/icons` | 逐个图标 path 导出（`checkPath` 等）+ 注册/查询 API（`registerIcon` / `registerIconAlias` / `registerIconLibrary` / `lookupIcon`）+ `IconName` 类型 |
| `@oas-ui/icons/register` | 副作用入口：注册**内置全量集**（按需场景用内置图名时引入一次） |
| `@oas-ui/icons/registry` | 内置全量数据（`iconRegistry` / `iconNames`）——内部数据，一般无需直接使用 |
| `@oas-ui/icons/runtime` | 仅运行时（`lookupIcon` / 注册 API），**不含**全量集（组件链用，避免背整套图标） |

自定义 / 远程图标走 `registerIcon(name, svg)`、`registerIconAlias`、`registerIconLibrary({ resolver, ... })`（远程 / sprite / iconfont），或 `<oas-icon>` 的 `src` / `slot`。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（含 `oas-icon` 组件；全量入口自动注册内置图标） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/icons` — the icon package of OAS-UI. An original tree-shakable SVG icon set: import individual icon paths on demand, or render a built-in icon **by name** via the `oas-icon` component.

### Install

```bash
pnpm add @oas-ui/icons
```

### Usage

**Import a single icon path** (tree-shakable, recommended):

```ts
import { alertCirclePath, checkPath } from '@oas-ui/icons'
```

**Render a built-in icon by name** (with the `oas-icon` component):

```html
<oas-icon name="alert-circle" size="24"></oas-icon>
```

> Built-in names require the full set to be registered: the full entry `@oas-ui/ui` registers it automatically; when importing a **single component on demand**, add `import '@oas-ui/icons/register'` once to use built-in names.

Each icon is a 24×24 viewBox path string; colors inherit via CSS `currentColor` and adapt to light / dark.

### Subpaths

| Subpath | Purpose |
| --- | --- |
| `@oas-ui/icons` | Per-icon path exports (`checkPath`, …) + register/lookup APIs (`registerIcon` / `registerIconAlias` / `registerIconLibrary` / `lookupIcon`) + the `IconName` type |
| `@oas-ui/icons/register` | Side-effect entry: registers the **full built-in set** (import once when using built-in names on demand) |
| `@oas-ui/icons/registry` | The full built-in data (`iconRegistry` / `iconNames`) — internal, rarely needed directly |
| `@oas-ui/icons/runtime` | Runtime only (`lookupIcon` / register APIs), **without** the full set (used by component chains to avoid carrying every icon) |

Custom / remote icons go through `registerIcon(name, svg)`, `registerIconAlias`, `registerIconLibrary({ resolver, ... })` (remote / sprite / iconfont), or `<oas-icon>`'s `src` / `slot`.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (includes the `oas-icon` component; the full entry auto-registers built-in icons) |
