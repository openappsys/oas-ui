# @oas-ui/i18n

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 国际化包 —— 框架无关的 locale registry：`setLocale` / `registerLocale` / `t` 接口。内置 16 种语言包：**zh-CN（默认）/ zh-Hant / en / ja / ko / de / fr / es / pt-BR / ru / ar / hi / th / uk / he / fa**（ar/he/fa 为 RTL），另保留 `pt` 兼容别名；语言名按 BCP 47 归一，tree-shakable，支持按需加载。

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

**内置中文默认文案按家族切片分发**：按需引入 `@oas-ui/ui/<族>/<组件>` 时，组件入口会自动注册所属家族的切片（`@oas-ui/i18n/slices/<family>`），宿主无需手动注册中文默认文案；公共入口 `import '@oas-ui/i18n'` 行为不变（导入即全量注册 9 个家族切片：basic / conversation / data / feedback / form / framework / layout / navigation / workbench）。因此 `getLocale().messages` 在按需消费下只包含**已加载的切片**——需要全集兜底时用上面的整包 `import zhCN from '@oas-ui/i18n/zh-CN'` + `registerLocale(zhCN)`，或直接引入公共入口。深度定制/自建组件场景可用 `@oas-ui/i18n/registry`（只含 registry API，无默认文案）+ `<family>Messages` + `registerDefaultMessages` 显式组装。

按需动态加载（独立 chunk，调用时才下载；静态子路径 `import ja from '@oas-ui/i18n/ja'` 亦可）：

```ts
import { loadLocale, setLocale } from '@oas-ui/i18n'

await loadLocale('ja')
setLocale('ja')
```

组件内置文案（确认按钮、校验消息等）随 locale 全局切换。`oas-config-provider` 支持就近注入，无需全局设置。日期/数字格式化走原生 `Intl`（`Intl.DateTimeFormat` / `Intl.NumberFormat`），新增语言无需额外翻译；RTL 语言（`ar`）在语言包中标注 `dir: 'rtl'`，`getDirection()` 可查询方向。

> **用 `link:` / workspace 引用 `@oas-ui/ui` 时**：ui 与宿主可能各解析一份 `@oas-ui/i18n`。locale registry 与 core translator 已挂到 `globalThis` 版本化 `Symbol.for` 键，同一进程的副本共享状态，`setLocale()` 无需改 import；仍建议在 Vite 配 `resolve.dedupe: ['@oas-ui/i18n', '@oas-ui/core']`（或 pnpm `overrides`）减少重复包体。发布态同版本 registry 包无此问题。

### 自定义语言包（内置 16 种之外）

以 `zh-CN` 为模板逐步落地（`zh-CN` 是 key 全集的单一事实源，以下每一步都有编译期或运行时护栏）：

```ts
// 1. 以 zh-CN 的消息为模板逐步替换（vi 标注为 Locale：messages 缺 key 编译期报错）
import zhCN from '@oas-ui/i18n/zh-CN'
import type { Locale } from '@oas-ui/i18n'
import { registerLocale, setLocale } from '@oas-ui/i18n'

const vi: Locale = {
  name: 'vi',
  dir: 'ltr', // RTL 语言标 'rtl'（getDirection() 查询、dir 属性下发由此驱动）
  messages: {
    ...zhCN.messages, // 先全量继承（未翻译的 key 回落中文保底，可逐步替换）
    'modal.ok': 'Xác nhận',
    'modal.cancel': 'Hủy',
    // ...逐个 key 替换为目标语言
  },
}

// 2. 注册（同名覆盖）并切换
registerLocale(vi)
setLocale('vi') // 或一步：setLocale(vi)（传对象自动注册并切换）
```

要点：

- **key 全集**：`packages/i18n/src/locales/zh-CN.ts`（438 个 key）——逐 key 翻译，组件内置文案全部走这些 key
- **类型约束**：`LocaleMessages = { [K in LocaleKey]: string }`——`messages` 标注为 `Locale` 的 `messages` 后缺 key 编译期报错（`...zhCN.messages` spread 提供全量 key，逐 key 覆盖即得新语言）
- **按需分包**：自定义语言包走宿主自己的动态 `import()`（`loadLocale()` 内置包名之外需先 `registerLocale`）；注册后 `setLocale(name)` 照常生效
- **命名避开内置别名**：`registerLocale({ name })` 会先做 BCP 47 归一（`en-GB` → `en`、`zh-TW` → `zh-Hant` 等），命中别名会覆盖内置同名语言包；自定义包请用独立名（如 `vi`、`en-XA`），不要复用内置别名。
- **运行时护栏**：`setLocale('未注册名')` 抛错并提示先注册；`getDirection()` 对 RTL 包返回 `'rtl'`

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（消费本包文案） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/i18n` — the internationalization package of OAS-UI. A framework-agnostic locale registry with `setLocale` / `registerLocale` / `t`. Built-in locale packs in **16 languages: zh-CN (default) / zh-Hant / en / ja / ko / de / fr / es / pt-BR / ru / ar / hi / th / uk / he / fa** (ar/he/fa are RTL), plus the `pt` compatibility alias; language tags are normalized as BCP 47, tree-shakable, with on-demand loading.

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

**Built-in Chinese default texts ship as per-family slices**: importing a component on demand (`@oas-ui/ui/<family>/<component>`) auto-registers its family's slice (`@oas-ui/i18n/slices/<family>`) from the component entry — hosts never register the Chinese defaults manually; the public entry `import '@oas-ui/i18n'` is unchanged (it registers all 9 family slices on import: basic / conversation / data / feedback / form / framework / layout / navigation / workbench). `getLocale().messages` therefore contains only the **loaded slices** under on-demand consumption — for a full-set fallback use the whole-pack `import zhCN from '@oas-ui/i18n/zh-CN'` + `registerLocale(zhCN)` above, or import the public entry. For deep customization / host-built components, compose explicitly via `@oas-ui/i18n/registry` (registry API only, no default texts) + `<family>Messages` + `registerDefaultMessages`.

On-demand dynamic loading (a separate chunk, fetched when called; static subpath `import ja from '@oas-ui/i18n/ja'` works too):

```ts
import { loadLocale, setLocale } from '@oas-ui/i18n'

await loadLocale('ja')
setLocale('ja')
```

Built-in component texts (confirm buttons, validation messages, etc.) switch globally with the locale. `oas-config-provider` supports local injection without global setup. Date/number formatting goes through native `Intl` (`Intl.DateTimeFormat` / `Intl.NumberFormat`), so new locales need no extra translations; RTL locales (`ar`) are tagged `dir: 'rtl'` in the pack, and `getDirection()` reports the direction.

> **When ui is linked via `link:` / workspace**: the host and `@oas-ui/ui` may resolve two copies of `@oas-ui/i18n`. The locale registry and core translator now live on `globalThis` under versioned `Symbol.for` keys, so copies in the same process share state and `setLocale()` works without changing imports. Deduplicating via Vite `resolve.dedupe: ['@oas-ui/i18n', '@oas-ui/core']` (or pnpm `overrides`) is still recommended to avoid duplicate bundle weight. Same-version registry packages have a single instance, so this only affects linked/workspace setups.

### Custom locale packs (beyond the built-in 16)

Use `zh-CN` as the template — it is the single source of truth for the full key set, and every step below has a compile-time or runtime guardrail:

```ts
// 1. Use zh-CN's messages as a template and replace incrementally (tagged as Locale — missing keys fail at compile time)
import zhCN from '@oas-ui/i18n/zh-CN'
import type { Locale } from '@oas-ui/i18n'
import { registerLocale, setLocale } from '@oas-ui/i18n'

const vi: Locale = {
  name: 'vi',
  dir: 'ltr', // RTL packs: 'rtl' (drives getDirection() and the dir attribute)
  messages: {
    ...zhCN.messages, // inherit all keys first (untranslated keys fall back to Chinese, replace incrementally)
    'modal.ok': 'Xác nhận',
    'modal.cancel': 'Hủy',
    // ...replace each key with the target language
  },
}

// 2. Register (same-name overwrites) and switch
registerLocale(vi)
setLocale('vi') // or one step: setLocale(vi) (passing the object auto-registers and switches)
```

Notes:

- **Full key set**: `packages/i18n/src/locales/zh-CN.ts` (438 keys) — every built-in component text goes through these keys
- **Type constraint**: `LocaleMessages = { [K in LocaleKey]: string }` — tag `messages` as a `Locale`'s `messages` to fail at compile time on missing keys (the `...zhCN.messages` spread supplies every key; override each to build the new locale)
- **Code splitting**: ship custom packs with your own dynamic `import()` (`loadLocale()` covers the built-in names; register custom packs first); after `registerLocale`, `setLocale(name)` works as usual
- **Avoid built-in aliases as custom names**: `registerLocale({ name })` normalizes BCP 47 first (`en-GB` → `en`, `zh-TW` → `zh-Hant`, etc.), so a name that matches an alias overwrites the built-in pack; use a distinct name (e.g. `vi`, `en-XA`) for custom packs.
- **Runtime guardrails**: `setLocale('unregistered-name')` throws with a hint; `getDirection()` returns `'rtl'` for RTL packs

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (consumes texts from this package) |
