/**
 * locale registry —— 全局语言注册表与切换入口。
 *
 * - 默认内置 zh-CN（按家族切片渐进注册，见 registerDefaultMessages()）；registerLocale() 注册自定义语言包
 * - setLocale(name) 按名字切换（需已注册），setLocale(locale) 直接传语言包对象（自动注册）
 * - t(key, params) 翻译 + {count} 插值
 * - onLocaleChange(cb) 订阅切换事件
 * - 模块加载即通过 core 的 setTranslator() 注入当前翻译函数，组件 OASElement.t() 委托到这里；
 *   core 不依赖本包（翻译钩子注入，无循环依赖）
 * - registerLocale() 同时通过 core 的 registerLocaleTranslator() 注册"按 locale 名"的翻译器，
 *   供 config-provider 就近注入 locale 时按名查找
 *
 * 默认文案与切片：zh-CN 整包不再静态打进 registry，而是由 `@oas-ui/i18n` 主入口
 * 通过 `./slices/all-register.js` 把 9 个家族切片逐个 registerDefaultMessages() 注册进来；
 * 组件按需消费时可只注册自己家族的切片（`@oas-ui/i18n/slices/<family>`），按需链不携带整包。
 * `loadLocale('zh-CN')` 仍可整包装载（见函数注释）。`getLocale().messages` 语义为
 * 「已注册的部分默认文案」（整包入口下即全集）。
 */
import { setTranslator, registerLocaleTranslator } from '@oas-ui/core'
import type { Locale, LocaleKey, LocaleMessages, LocaleName, LocaleParams } from './types.js'

interface RegistryState {
  locales: Map<string, Locale>
  listeners: Set<(name: string) => void>
  current: Locale | null
  /** 默认（zh-CN）文案的共享累积对象：切片逐个 Object.assign 进来 */
  defaultMessages: LocaleMessages
}

/**
 * 单例状态挂到 globalThis：`link:` / workspace / 依赖提升失败时，同一进程可能出现
 * 多份 @oas-ui/i18n 模块实例；模块级 Map/Set/current 会让各副本各存一份 locale，
 * 宿主 setLocale 只更新其中一份，组件仍回落 raw key。用 Symbol.for 共享同一状态。
 * defaultMessages 也在共享状态上：切片可能由另一份副本（独立入口模块）注册，
 * 各副本必须读写同一个对象。状态结构变更时 bump key 的版本号（v2 起含 defaultMessages）。
 */
const STATE_KEY = Symbol.for('@oas-ui/i18n/registry/v2')
const globalStore = globalThis as unknown as { [key: symbol]: unknown }
function createState(): RegistryState {
  // defaultMessages 运行时从空对象开始、由切片渐进 Object.assign（Partial 语义）；
  // 类型按 LocaleMessages 标注以贴合 defaultLocale.messages 的类型口径（getLocale().messages 语义 =「已加载部分」）。
  return { locales: new Map(), listeners: new Set(), current: null, defaultMessages: {} as LocaleMessages }
}
const state: RegistryState = (globalStore[STATE_KEY] as RegistryState | undefined) ?? createState()
if (!globalStore[STATE_KEY]) globalStore[STATE_KEY] = state

/** 默认（zh-CN）locale 对象：messages 是共享的 defaultMessages（切片注册目标，不可换对象） */
const defaultLocale: Locale = { name: 'zh-CN', messages: state.defaultMessages }

/**
 * 注册默认（zh-CN）文案片段：Object.assign 合并进共享 defaultMessages，幂等。
 * 家族切片（`@oas-ui/i18n/slices/<family>`）由组件入口显式调用注册——
 * 值导入 + 显式调用，不依赖模块副作用，任意 bundler 的 tree-shake 配置下都不会丢失。
 */
export function registerDefaultMessages(m: Partial<LocaleMessages>): void {
  Object.assign(state.defaultMessages, m)
}

/** dev 判定：vite/vitest 下 import.meta.env.DEV 为 true；裸 Node/SSR 无 import.meta.env → 静默；生产构建被静态替换为 false */
const canDevWarn: boolean = ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? false) === true
/** 未命中告警按 key 去重（每份模块副本一份集合，跨副本重复告警可接受） */
const warnedKeys = new Set<string>()
function warnMissingKey(key: string): void {
  if (!canDevWarn || warnedKeys.has(key)) return
  warnedKeys.add(key)
  console.warn(
    `[oas-ui/i18n] 默认文案未命中 key「${key}」——对应家族切片可能未注册（漏 import @oas-ui/i18n/slices/<family>）或 key 拼写错误`,
  )
}

/** 用指定语言包翻译（供 config-provider 按 locale 名取翻译器复用） */
function translateIn(messages: LocaleMessages, key: string, params?: LocaleParams): string {
  const template: string | undefined = messages[key as LocaleKey]
  if (template === undefined) return key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  )
}

/** 注册语言包（同名覆盖），并登记"按 locale 名"的翻译器供 config-provider 注入 */
export function registerLocale(locale: Locale): void {
  state.locales.set(locale.name, locale)
  registerLocaleTranslator(locale.name, (key, params) => translateIn(locale.messages, key, params))
}

/**
 * 全局切换 locale。
 * - 传 string：按 name 查找（未注册抛错）
 * - 传 Locale 对象：自动注册并切换
 * 返回切换后的 locale name。
 */
export function setLocale(nameOrLocale: string | Locale): string {
  if (typeof nameOrLocale === 'string') {
    const found = state.locales.get(nameOrLocale)
    if (!found) {
      throw new Error(`[oas-ui/i18n] 未注册的 locale「${nameOrLocale}」，请先 registerLocale() 或直接传入语言包对象`)
    }
    state.current = found
  } else {
    registerLocale(nameOrLocale)
    state.current = nameOrLocale
  }
  syncTranslator()
  const current = state.current ?? defaultLocale
  for (const cb of state.listeners) cb(current.name)
  return current.name
}

/** 当前生效的 locale */
export function getLocale(): Locale {
  return state.current ?? defaultLocale
}

/** 当前生效的 locale name */
export function getLocaleName(): string {
  return getLocale().name
}

/**
 * 语言书写方向：传入 name / Locale 时取其标注方向；缺省取当前生效 locale。
 * 语言包未标注 dir 时回落 ltr。
 */
export function getDirection(nameOrLocale?: string | Locale): 'ltr' | 'rtl' {
  const locale =
    typeof nameOrLocale === 'string'
      ? state.locales.get(nameOrLocale)
      : (nameOrLocale ?? state.current ?? defaultLocale)
  return locale?.dir === 'rtl' ? 'rtl' : 'ltr'
}

/**
 * 内置语言包的按需加载器（静态 import() 映射：bundler 可把每个语言包切成独立 chunk，
 * 调用时才下载；不调用 loadLocale 时整张表可被 tree-shake）。
 * 新增内置语言包时在此登记，并同步 package.json 的 exports 子路径。
 */
const loaders: Record<LocaleName, () => Promise<{ default: Locale }>> = {
  'zh-CN': () => import('./zh-CN.js'),
  en: () => import('./en.js'),
  ja: () => import('./ja.js'),
  ko: () => import('./ko.js'),
  de: () => import('./de.js'),
  fr: () => import('./fr.js'),
  es: () => import('./es.js'),
  pt: () => import('./pt.js'),
  ru: () => import('./ru.js'),
  ar: () => import('./ar.js'),
}

/**
 * 按需加载并注册内置语言包。
 * 纯异步：`await loadLocale('ja'); setLocale('ja')`。
 *
 * zh-CN 特判（默认文案是切片渐进注册的）：
 * - 注册表里的 'zh-CN' 就是默认 locale 对象 → 整包 Object.assign 进共享 defaultMessages
 *   并返回该对象本身（不得 registerLocale 换对象——换对象后切片注册会写进孤儿对象）；
 * - 用户已 registerLocale 覆盖同名 'zh-CN' → 按用户注册优先，直接返回用户对象，不装载整包
 *   （与「已注册则早退」契约一致）。
 */
export async function loadLocale(name: LocaleName): Promise<Locale> {
  const registered = state.locales.get(name)
  if (name === defaultLocale.name && registered === defaultLocale) {
    const mod = await loaders[name]()
    Object.assign(defaultLocale.messages, mod.default.messages)
    return defaultLocale
  }
  if (registered) return registered
  const loader = loaders[name]
  if (!loader) {
    throw new Error(`[oas-ui/i18n] 不支持按需加载的 locale「${name}」；内置：${Object.keys(loaders).join(', ')}`)
  }
  const mod = await loader()
  const locale = mod.default
  registerLocale(locale)
  return locale
}

/**
 * 翻译：key + 可选插值参数（{count} 等）；未知 key 回退返回 key 本身。
 * dev 下走默认 locale 时对未命中 key 告警一次（按 key 去重；生产/裸 Node 静默）——
 * 组件按需消费漏注册家族切片时的最后提示。
 */
export function t(key: LocaleKey, params?: LocaleParams): string {
  const current = state.current ?? defaultLocale
  const out = translateIn(current.messages, key, params)
  if (out === key && current === defaultLocale) warnMissingKey(key)
  return out
}

/** 订阅 locale 切换（回调收到新 locale name），返回取消订阅函数 */
export function onLocaleChange(cb: (name: string) => void): () => void {
  state.listeners.add(cb)
  return () => state.listeners.delete(cb)
}

/** 把当前翻译能力注入 core（OASElement.t 的委托目标） */
function syncTranslator(): void {
  setTranslator((key: string, params?: Record<string, string | number>) => t(key as LocaleKey, params))
}

// 模块加载即注入默认 zh-CN 翻译器，组件开箱即用中文；
// 重复模块副本共享 globalThis 状态，只有第一份注册默认 locale，后续副本复用。
// 默认文案本身由切片注册（主入口的 ./slices/all-register.js 或按需消费方显式注册）。
if (!state.locales.has(defaultLocale.name)) registerLocale(defaultLocale)
if (!state.current) state.current = state.locales.get(defaultLocale.name) ?? defaultLocale
syncTranslator()
