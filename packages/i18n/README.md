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

### 自定义语言包（内置 10 种之外）

以 `zh-CN` 为模板逐步落地（`zh-CN` 是 key 全集的单一事实源，以下每一步都有编译期或运行时护栏）：

```ts
// 1. 复制 zh-CN 为模板，标注 LocaleMessages——缺 key 编译期报错（类型护栏）
import zhCN from '@oas-ui/i18n/zh-CN'
import type { Locale, LocaleMessages } from '@oas-ui/i18n'
import { registerLocale, setLocale } from '@oas-ui/i18n'

const vi: Locale = {
  name: 'vi',
  dir: 'ltr', // RTL 语言标 'rtl'（getDirection() 查询、dir 属性下发由此驱动）
  messages: {
    ...zhCN, // 先全量继承（未翻译的 key 回落中文保底，可逐步替换）
    'common.confirm': 'Xác nhận',
    'common.cancel': 'Hủy',
    // ...逐个 key 替换为目标语言
  } as LocaleMessages, // 断言为全集类型：多 key 不报错（超集），缺 key 由 spread 保证
}

// 2. 注册（同名覆盖）并切换
registerLocale(vi)
setLocale('vi') // 或一步：setLocale(vi)（传对象自动注册并切换）
```

要点：

- **key 全集**：`packages/i18n/src/locales/zh-CN.ts`（约 500+ key，导出默认对象）——逐 key 翻译，组件内置文案全部走这些 key
- **类型约束**：`LocaleMessages = { [K in LocaleKey]: string }`——`messages` 标注后缺 key 编译期报错（不要省掉 `...zhCN` spread 除非你能保证全集）
- **按需分包**：自定义语言包走宿主自己的动态 `import()`（`loadLocale()` 只认内置 10 种的包名映射）；注册后 `setLocale(name)` 照常生效
- **运行时护栏**：`setLocale('未注册名')` 抛错并提示先注册；`getDirection()` 对 RTL 包返回 `'rtl'`

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

### Custom locale packs (beyond the built-in 10)

Use `zh-CN` as the template — it is the single source of truth for the full key set, and every step below has a compile-time or runtime guardrail:

```ts
// 1. Clone zh-CN as the template, tagged as LocaleMessages — missing keys fail at compile time
import zhCN from '@oas-ui/i18n/zh-CN'
import type { Locale, LocaleMessages } from '@oas-ui/i18n'
import { registerLocale, setLocale } from '@oas-ui/i18n'

const vi: Locale = {
  name: 'vi',
  dir: 'ltr', // RTL packs: 'rtl' (drives getDirection() and the dir attribute)
  messages: {
    ...zhCN, // inherit all keys first (untranslated keys fall back to Chinese, replace incrementally)
    'common.confirm': 'Xác nhận',
    'common.cancel': 'Hủy',
    // ...replace each key with the target language
  } as LocaleMessages, // assert the full-map type: extra keys are fine, missing keys are covered by the spread
}

// 2. Register (same-name overwrites) and switch
registerLocale(vi)
setLocale('vi') // or one step: setLocale(vi) (passing the object auto-registers and switches)
```

Notes:

- **Full key set**: `packages/i18n/src/locales/zh-CN.ts` (~500+ keys, default-exported object) — every built-in component text goes through these keys
- **Type constraint**: `LocaleMessages = { [K in LocaleKey]: string }` — keep the `...zhCN` spread unless you can guarantee the full set
- **Code splitting**: ship custom packs with your own dynamic `import()` (`loadLocale()` only maps the 10 built-in names); after `registerLocale`, `setLocale(name)` works as usual
- **Runtime guardrails**: `setLocale('unregistered-name')` throws with a hint; `getDirection()` returns `'rtl'` for RTL packs

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (consumes texts from this package) |
