# @oas-ui/ui

[中文](#中文) | [English](#english)

## 中文

OAS-UI 组件库主包 —— 框架无关的 Web Components UI 组件库（Custom Elements + Shadow DOM）。

- TypeScript 全量类型，tree-shakable
- light / dark 双主题（CSS 变量 token，无需重新引入 JS）
- SSR + Declarative Shadow DOM（DSD）快照支持
- 框架无关 i18n（zh-CN / en）
- MIT OR Apache-2.0 双许可

### 安装

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

### 快速开始

CDN 一键引入：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script type="module" src="https://unpkg.com/@oas-ui/ui@2/dist/cdn.js"></script>

<oas-button type="primary">Hello OAS-UI</oas-button>
```

包管理方式：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script type="module">
  import '@oas-ui/ui'
</script>

<oas-button type="primary">Hello OAS-UI</oas-button>
```

React / Vue / Svelte / 原生 HTML 均可直接使用，事件通过 `oas-*` CustomEvent 桥接。

### 按需引入

```ts
import '@oas-ui/ui/basic/button'
```

### SSR

服务端渲染（DSD 快照）见 `@oas-ui/ssr` 包与文档站 SSR 指南。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/theme` | 设计 token（light / dark / high-contrast） |
| `@oas-ui/core` | 组件基类 `OASElement` |
| `@oas-ui/icons` | SVG 图标集合 |
| `@oas-ui/ssr` | 服务端 DSD 渲染 |
| `@oas-ui/next` | Next.js（App Router）集成 |
| `@oas-ui/nuxt` | Nuxt 3 module 集成 |
| `@oas-ui/i18n` | 框架无关 locale registry |

### 文档

完整组件文档与 demo：[文档站](https://oasui.dev) · [GitHub](https://github.com/openappsys/oas-ui)

[中文](#中文) | [English](#english)

## English

`@oas-ui/ui` — the main package of OAS-UI, a framework-agnostic Web Components UI library (Custom Elements + Shadow DOM).

- Fully typed TypeScript, tree-shakable
- light / dark themes (CSS variable tokens, no extra JS needed)
- SSR + Declarative Shadow DOM (DSD) snapshot support
- Framework-agnostic i18n (zh-CN / en)
- Dual-licensed MIT OR Apache-2.0

### Install

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

### Quick start

CDN, one-liner:

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script type="module" src="https://unpkg.com/@oas-ui/ui@2/dist/cdn.js"></script>

<oas-button type="primary">Hello OAS-UI</oas-button>
```

Via a package manager:

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script type="module">
  import '@oas-ui/ui'
</script>

<oas-button type="primary">Hello OAS-UI</oas-button>
```

Works directly with React / Vue / Svelte / vanilla HTML. Events are bridged via `oas-*` CustomEvents.

### On-demand import

```ts
import '@oas-ui/ui/basic/button'
```

### SSR

Server-side rendering (DSD snapshots) is provided by `@oas-ui/ssr`. See the SSR guide on our docs site.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/theme` | Design tokens (light / dark / high-contrast) |
| `@oas-ui/core` | Base class `OASElement` |
| `@oas-ui/icons` | SVG icon collection |
| `@oas-ui/ssr` | Server-side DSD rendering |
| `@oas-ui/next` | Next.js (App Router) integration |
| `@oas-ui/nuxt` | Nuxt 3 module integration |
| `@oas-ui/i18n` | Framework-agnostic locale registry |

### Documentation

Full component docs and demos: [Docs site](https://oasui.dev) · [GitHub](https://github.com/openappsys/oas-ui)
