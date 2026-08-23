**中文** | [English](README.en.md)

# OAS-UI

框架无关的 Web Components UI 组件库——一套组件，到处运行，无框架依赖，适配原生 HTML / React / Vue / 等。

TypeScript 全量类型 · tree-shakable · light/dark 双主题 · SSR + DSD · 框架无关 i18n · MIT OR Apache-2.0 双许可

## 真实数字

| 指标 | 数值 |
| --- | --- |
| 组件数 | 117 |
| CDN 全量单文件（gzip） | 153.2 KB |
| 按钮单链（gzip） | 20.7 KB |
| 单测 | 2200+ |
| 语言包 | zh-CN / en |
| 当前版本 | v2.0.0 |

## 快速开始

### CDN（零构建）

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn.js"></script>

<oas-button type="primary">主要按钮</oas-button>
<oas-input placeholder="输入"></oas-input>
```

按需（ESM，单组件 tree-shakable）：

```html
<script type="module">
  import 'https://esm.sh/@oas-ui/ui@2/basic/button'
</script>
```

### 包管理

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

```ts
import '@oas-ui/theme'
import '@oas-ui/ui'
```

按需引入（只打包用到的组件）：

```ts
import '@oas-ui/theme'
import '@oas-ui/ui/basic/button'
```

### 框架桥接（可选加分项）

Web Components 本身与任何框架互操作；以下官方插件补齐 SSR 与开发体验：

```bash
pnpm add @oas-ui/nuxt   # Nuxt 3 module：isCustomElement + theme 注入 + SSR helper
pnpm add @oas-ui/next   # Next.js：RSC OasComponent + OasRegistry 客户端注册引导
```

## 文档

完整组件文档与 demo：[oas-ui.dev](https://oas-ui.dev)。

SSR / DSD 指南见文档站 [SSR 页](https://oas-ui.dev/guide/ssr)与 `@oas-ui/ssr` 包。

## 包结构

| 包 | 说明 |
| --- | --- |
| `packages/core` | `OASElement` 基类、公共基础设施 |
| `packages/theme` | CSS 变量设计 token（light/dark），单源 index.css |
| `packages/i18n` | 框架无关 locale registry，语言包 tree-shakable |
| `packages/icons` | 内联 SVG 图标集（可 tree-shake，无图标字体） |
| `packages/ui` | 117 个组件（basic / form / data / floating / navigation / nav-layout / layout / overlay / feedback） |
| `packages/ssr` | DSD 快照渲染器 + Node-safe 入口 + 真水合 |
| `packages/nuxt` | Nuxt 3 集成插件 |
| `packages/next` | Next.js（RSC）集成插件 |
| `packages/docs` | Vitepress 文档站（中英双语） |

## 质量门禁（每个版本发布前必过）

1. `pnpm test` 全绿（单测 + 行为测试）
2. `pnpm typecheck` 零错误
3. `pnpm build` 成功（含 d.ts）
4. `pnpm test:e2e` 通过（Playwright：chromium 全量 + firefox 抽样；交互/视觉/axe 无障碍/console 扫描）
5. 性能基准不退化（CI 体积/耗时预算，`scripts/perf` 可复现）

## 开发

```bash
pnpm install
pnpm test        # 测试
pnpm typecheck   # 类型
pnpm build       # 构建（含 d.ts）
pnpm dev         # 文档站开发（组件源码改动自动生效）
```

## 产品档案

| 文档 | 说明 |
| --- | --- |
| `docs/vision.md` | 愿景：定位、目标、设计原则 |
| `docs/ROADMAP.md` | 版本路线图 |
| `docs/PRD.md` | 各版本详细需求与验收标准 |
| `docs/architecture.md` | 技术架构与选型 |
| `docs/ui-spec.md` | 视觉规范（token/字号/间距/色彩习惯） |
| `docs/engineering.md` | 工程规范（TDD/测试/发布/部署） |

## 许可

[MIT OR Apache-2.0](LICENSE) 双许可发布。
