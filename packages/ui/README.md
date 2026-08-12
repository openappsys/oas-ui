# @oas-ui/ui

OAS-UI 组件库主包 —— 框架无关的 Web Components UI 组件库（Custom Elements + Shadow DOM）。

## 安装

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

## 使用

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script type="module">
  import '@oas-ui/ui'
</script>

<oas-button type="primary">Hello OAS-UI</oas-button>
```

React / Vue / Svelte / 原生 HTML 均可直接使用，事件通过 `oas-*` CustomEvent 桥接。

## 按需引入

```ts
import '@oas-ui/ui/basic/button'
```

## SSR

服务端渲染（DSD 快照）见 `@oas-ui/ssr` 包与文档站 SSR 指南。

## 文档

完整组件文档与 demo：[文档站](https://oas-ui.dev)（建设中）。
