# 贡献指南

感谢你参与 OAS-UI 的开发。开发规范请以 `docs/engineering.md` 与 `AGENTS.md` 为准，这里只列协作流程。

## 环境

```bash
pnpm install        # 安装依赖
pnpm test           # 单测（vitest + happy-dom）
pnpm typecheck      # 类型检查
pnpm build          # 构建（含 d.ts）
pnpm test:e2e       # e2e + axe 无障碍审计（需 Chromium）
pnpm dev            # 文档站 + 组件 demo
```

## 新增组件流程

1. 先在 `docs/PRD.md` / `docs/ROADMAP.md` 对应版本段添加条目（含属性/事件，命名对照 `docs/ui-spec.md`）。
2. 遵循 TDD：先写测试（RED）→ 实现 → 独立 commit。
3. 颜色只走 CSS 变量 token（含暗色/高对比变体），禁止硬编码色值。
4. 提交前必跑 `pnpm build`（scoped CSS 语法错误只有 build 能抓到）。

## 提交信息风格

遵循 Conventional Commits：

```
feat(tabs): 新增 oas-tabs
fix(select): 修复外部点击关闭穿透 shadow 边界
docs: 更新 v0.9.0 状态
```

## 发布

版本发布由 tag 触发（见 `.github/workflows/release.yml`）：

```bash
git tag -a v1.0.0 -m "v1.0.0 正式发布"
git push origin v1.0.0
```

## 原创性与许可

- 代码、图标、插画、文案必须原创，或使用许可证兼容的素材并保留归属信息。
- 禁止复制他人受版权保护的代码与设计；引用第三方实现时遵循其开源许可证。
