/**
 * locale registry —— 全局语言注册表与切换入口。
 *
 * - 默认内置 zh-CN；registerLocale() 注册自定义语言包
 * - setLocale(name) 按名字切换（需已注册），setLocale(locale) 直接传语言包对象（自动注册）
 * - t(key, params) 翻译 + {count} 插值
 * - onLocaleChange(cb) 订阅切换事件
 * - 模块加载即通过 core 的 setTranslator() 注入当前翻译函数，组件 OASElement.t() 委托到这里；
 *   core 不依赖本包（翻译钩子注入，无循环依赖）
 * - registerLocale() 同时通过 core 的 registerLocaleTranslator() 注册"按 locale 名"的翻译器，
 *   供 config-provider 就近注入 locale 时按名查找
 */
import { setTranslator, registerLocaleTranslator } from '@oas-ui/core'
import { zhCN } from './locales/zh-CN.js'
import type { Locale, LocaleKey, LocaleMessages, LocaleName, LocaleParams } from './types.js'

const locales = new Map<string, Locale>()
const listeners = new Set<(name: string) => void>()

const defaultLocale: Locale = { name: 'zh-CN', messages: zhCN }
locales.set(defaultLocale.name, defaultLocale)
let current: Locale = defaultLocale

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
  locales.set(locale.name, locale)
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
    const found = locales.get(nameOrLocale)
    if (!found) {
      throw new Error(`[oas-ui/i18n] 未注册的 locale「${nameOrLocale}」，请先 registerLocale() 或直接传入语言包对象`)
    }
    current = found
  } else {
    registerLocale(nameOrLocale)
    current = nameOrLocale
  }
  syncTranslator()
  for (const cb of listeners) cb(current.name)
  return current.name
}

/** 当前生效的 locale */
export function getLocale(): Locale {
  return current
}

/** 当前生效的 locale name */
export function getLocaleName(): string {
  return current.name
}

/**
 * 语言书写方向：传入 name / Locale 时取其标注方向；缺省取当前生效 locale。
 * 语言包未标注 dir 时回落 ltr。
 */
export function getDirection(nameOrLocale?: string | Locale): 'ltr' | 'rtl' {
  const locale = typeof nameOrLocale === 'string' ? locales.get(nameOrLocale) : (nameOrLocale ?? current)
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
 * 按需加载并注册内置语言包（已注册则直接返回，不重复下载）。
 * 纯异步：`await loadLocale('ja'); setLocale('ja')`。
 */
export async function loadLocale(name: LocaleName): Promise<Locale> {
  const registered = locales.get(name)
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

/** 翻译：key + 可选插值参数（{count} 等）；未知 key 回退返回 key 本身 */
export function t(key: LocaleKey, params?: LocaleParams): string {
  return translateIn(current.messages, key, params)
}

/** 订阅 locale 切换（回调收到新 locale name），返回取消订阅函数 */
export function onLocaleChange(cb: (name: string) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** 把当前翻译能力注入 core（OASElement.t 的委托目标） */
function syncTranslator(): void {
  setTranslator((key: string, params?: Record<string, string | number>) => t(key as LocaleKey, params))
}

// 模块加载即注入默认 zh-CN 翻译器，组件开箱即用中文
registerLocale(defaultLocale)
syncTranslator()
