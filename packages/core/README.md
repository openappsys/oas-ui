# @oas-ui/core

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 组件运行时基础包 —— 提供 `OASElement` 组件基类（Shadow DOM 生命周期、属性观察、`oas-*` 事件封装、locale / 配置注入、DSD 水合支持）。`@oas-ui/ui` 中所有组件均继承自该类。

大多数情况不需要直接使用 —— 仅当编写自定义组件或需要底层能力时才引入。

```ts
import { OASElement } from '@oas-ui/core'
```

### 提供的能力

- `render()` / `updating()` 生命周期模板
- `observedAttributes` 静态声明 + `attributeChanged` 自动触发更新
- `emit()` 派发 `oas-*` 前缀事件（可选 `bubbles` / `composed`）
- `t()` 国际化文案查询（配合 `@oas-ui/i18n`）
- 主题上下文（`data-theme`）与 DSD 水合衔接

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（基于本包构建） |
| `@oas-ui/i18n` | 框架无关 locale registry |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/core` — the runtime base package of OAS-UI. It provides the `OASElement` base class (Shadow DOM lifecycle, attribute observation, `oas-*` event helpers, locale / config injection, DSD hydration support). Every component in `@oas-ui/ui` extends this class.

You normally don't need to use it directly — only when authoring custom components or needing lower-level capabilities.

```ts
import { OASElement } from '@oas-ui/core'
```

### What it provides

- `render()` / `updating()` lifecycle templates
- `observedAttributes` static declaration + automatic updates on `attributeChanged`
- `emit()` dispatches `oas-*` prefixed events (optional `bubbles` / `composed`)
- `t()` localized text lookup (with `@oas-ui/i18n`)
- Theme context (`data-theme`) and DSD hydration integration

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (built on this package) |
| `@oas-ui/i18n` | Framework-agnostic locale registry |
