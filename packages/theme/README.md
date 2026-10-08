# @oas-ui/theme

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 设计 token 包 —— CSS 变量体系：light / dark / high-contrast 三套主题色板、间距、字号、圆角等。通过 `html[data-theme="dark"]` 切换主题。

> 本包 = **语义 token（CSS）** + 若干**独立可选层**（皮肤 `skins.css`、玻璃材质 `glass.css` + 运行时 `glass-fluid.js`）。可选层均为 opt-in 独立文件：不引入即零影响，且不进 `@oas-ui/ui` 体积。详见[液态玻璃指南](https://oas-ui.dev/guide/glass)。

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

### 皮肤预设

`skins.css` 提供 6 套品牌色皮肤（`violet` / `emerald` / `rose` / `amber` / `graphite` / `teal`），在 `data-theme` 之上叠加 `data-skin` 切换（opt-in，不引则完全无影响）：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/skins.css" />
<html data-theme="dark" data-skin="violet">
```

```js
document.documentElement.dataset.skin = 'emerald' // violet | emerald | rose | amber | graphite | teal
```

### 可选材质层（玻璃）

`glass.css` 提供玻璃材质（半透明 surface + backdrop 模糊 + 高光折光边 + 边缘折射），`glass-fluid.js` 提供指针镜面高光运行时。两者都是**独立可选文件**（opt-in，不引则零影响、不进组件体积）：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/glass.css" />
<script type="module">
  import 'https://unpkg.com/@oas-ui/theme@2/glass-fluid.js'
</script>
<html data-glass>
```

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（基于本包 token 构建） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/theme` — the design token package of OAS-UI. A CSS variable system: light / dark / high-contrast color palettes, spacing, font sizes, radii, etc. Switch themes via `html[data-theme="dark"]`.

> This package = **semantic tokens (CSS)** + a few **independent optional layers** (skins `skins.css`, glass material `glass.css` + runtime `glass-fluid.js`). Every optional layer is an opt-in standalone file: zero effect unless imported, and it never adds to the `@oas-ui/ui` bundle. See the [Liquid Glass guide](https://oas-ui.dev/en/guide/glass).

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

### Skin presets

`skins.css` ships 6 brand-color skins (`violet` / `emerald` / `rose` / `amber` / `graphite` / `teal`): layer `data-skin` on top of `data-theme` (opt-in — no effect unless imported):

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/skins.css" />
<html data-theme="dark" data-skin="violet">
```

```js
document.documentElement.dataset.skin = 'emerald' // violet | emerald | rose | amber | graphite | teal
```

### Optional material layer (glass)

`glass.css` ships the glass material (translucent surface + backdrop blur + specular edge + edge refraction); `glass-fluid.js` ships the pointer specular-highlight runtime. Both are **opt-in standalone files** (zero effect unless imported; never added to the component bundle):

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/glass.css" />
<script type="module">
  import 'https://unpkg.com/@oas-ui/theme@2/glass-fluid.js'
</script>
<html data-glass>
```

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (built on this package's tokens) |
