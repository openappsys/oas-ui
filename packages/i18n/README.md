# @oas-ui/i18n

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 国际化包 —— 框架无关的 locale registry：`setLocale` / `registerLocale` / `t` 接口。内置 zh-CN / en 语言包，tree-shakable。

### 安装

```bash
pnpm add @oas-ui/i18n
```

### 使用

```ts
import zhCN from '@oas-ui/i18n/zh-CN'
import { registerLocale, setLocale } from '@oas-ui/i18n'

registerLocale(zhCN)
setLocale('zh-CN')
```

组件内置文案（确认按钮、校验消息等）随 locale 全局切换。`oas-config-provider` 支持就近注入，无需全局设置。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（消费本包文案） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/i18n` — the internationalization package of OAS-UI. A framework-agnostic locale registry with `setLocale` / `registerLocale` / `t`. Built-in zh-CN and en locale packs, tree-shakable.

### Install

```bash
pnpm add @oas-ui/i18n
```

### Usage

```ts
import zhCN from '@oas-ui/i18n/zh-CN'
import { registerLocale, setLocale } from '@oas-ui/i18n'

registerLocale(zhCN)
setLocale('zh-CN')
```

Built-in component texts (confirm buttons, validation messages, etc.) switch globally with the locale. `oas-config-provider` supports local injection without global setup.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (consumes texts from this package) |
