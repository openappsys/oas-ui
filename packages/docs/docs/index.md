---
layout: home
title: OAS-UI — 框架无关的 Web Components 组件库
description: 一套组件，用于任何宿主——React / Vue / Svelte / 原生 HTML。TypeScript 全量类型、tree-shakable、light/dark 双主题、SSR + DSD。

hero:
  name: OAS-UI
  text: 框架无关的 Web Components UI 组件库
  tagline: 一套组件，用于任何宿主——React / Vue / Svelte / 原生 HTML。TypeScript 全量类型 · tree-shakable · light/dark 双主题 · SSR + DSD。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/openappsys/oas-ui
---

## 安装

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

```ts
import '@oas-ui/theme'
import '@oas-ui/ui'
```

然后直接写 HTML：

```html
<oas-button type="primary">开始使用</oas-button>
```
