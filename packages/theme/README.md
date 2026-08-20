# @oas-ui/theme

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 设计 token 包 —— CSS 变量体系：light / dark / high-contrast 三套主题色板、间距、字号、圆角等。通过 `html[data-theme="dark"]` 切换主题。

### 安装

```bash
pnpm add @oas-ui/theme
```

### 使用

CDN 引入：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
```

包管理方式：

```ts
import '@oas-ui/theme'
```

切换主题只需修改根节点属性：

```js
document.documentElement.dataset.theme = 'dark' // light | dark | high-contrast
```

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（基于本包 token 构建） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/theme` — the design token package of OAS-UI. A CSS variable system: light / dark / high-contrast color palettes, spacing, font sizes, radii, etc. Switch themes via `html[data-theme="dark"]`.

### Install

```bash
pnpm add @oas-ui/theme
```

### Usage

CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
```

Via a package manager:

```ts
import '@oas-ui/theme'
```

Switch themes by setting the root attribute:

```js
document.documentElement.dataset.theme = 'dark' // light | dark | high-contrast
```

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (built on this package's tokens) |
