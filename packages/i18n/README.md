# @oas-ui/i18n

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 国际化包 —— 框架无关的 locale registry：`setLocale` / `registerLocale` / `t` 接口。内置 10 种语言包：**zh-CN（默认）/ en / ja / ko / de / fr / es / pt / ru / ar（RTL）**，tree-shakable，支持按需加载。

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

按需动态加载（独立 chunk，调用时才下载；静态子路径 `import ja from '@oas-ui/i18n/ja'` 亦可）：

```ts
import { loadLocale, setLocale } from '@oas-ui/i18n'

await loadLocale('ja')
setLocale('ja')
```

组件内置文案（确认按钮、校验消息等）随 locale 全局切换。`oas-config-provider` 支持就近注入，无需全局设置。日期/数字格式化走原生 `Intl`（`Intl.DateTimeFormat` / `Intl.NumberFormat`），新增语言无需额外翻译；RTL 语言（`ar`）在语言包中标注 `dir: 'rtl'`，`getDirection()` 可查询方向。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（消费本包文案） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/i18n` — the internationalization package of OAS-UI. A framework-agnostic locale registry with `setLocale` / `registerLocale` / `t`. Built-in locale packs in **10 languages: zh-CN (default) / en / ja / ko / de / fr / es / pt / ru / ar (RTL)**, tree-shakable, with on-demand loading.

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

On-demand dynamic loading (a separate chunk, fetched when called; static subpath `import ja from '@oas-ui/i18n/ja'` works too):

```ts
import { loadLocale, setLocale } from '@oas-ui/i18n'

await loadLocale('ja')
setLocale('ja')
```

Built-in component texts (confirm buttons, validation messages, etc.) switch globally with the locale. `oas-config-provider` supports local injection without global setup. Date/number formatting goes through native `Intl` (`Intl.DateTimeFormat` / `Intl.NumberFormat`), so new locales need no extra translations; RTL locales (`ar`) are tagged `dir: 'rtl'` in the pack, and `getDirection()` reports the direction.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (consumes texts from this package) |
