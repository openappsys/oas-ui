# OAS-UI

框架无关的 Web Components UI 组件库（TypeScript + Vite + Vitest）。功能覆盖通用组件需求，但**不绑定任何前端框架**——`<oas-button>` 在 React、Vue、Svelte、原生
HTML 里都能直接用。

## 文档

- `docs/vision.md` —— 愿景、目标、设计原则
- `docs/ROADMAP.md` —— 版本路线图
- `docs/PRD.md` —— 各版本详细需求与验收
- `docs/architecture.md` —— 技术架构与选型
- `docs/ui-spec.md` —— 视觉规范（token/字号/间距/无障碍）
- `docs/engineering.md` —— 工程规范（TDD/测试/发布）
- `AGENTS.md` —— 工作约定

## 快速开始（当前为骨架期）

```bash
pnpm install
pnpm test        # 单测
pnpm typecheck   # 类型
pnpm build       # 构建（含 d.ts）
```

## 包结构

| 包               | 说明                            |
| ---------------- | ------------------------------- |
| `packages/core`  | `OASElement` 基类、公共基础设施 |
| `packages/theme` | CSS 变量 token（light/dark）    |
| `packages/ui`    | 组件集（当前：button）          |

## 状态

🚧 v0.1.0 工程骨架已跑通（Button 全链路 + 7 测试）。见 `docs/ROADMAP.md`。
