import { normalizeLocaleTag, stripLocaleExtensions } from './locale-tag.js'

/**
 * 翻译函数钩子 —— core 不依赖任何 i18n 实现（避免 core ↔ i18n 循环依赖）。
 *
 * 约定：
 * - 组件统一走 OASElement.t()，内部委托到这里的 translator
 * - `@oas-ui/i18n` 在 setLocale 时通过 setTranslator() 注入当前语言的翻译函数
 * - translator 变化（locale 切换）时通过 onTranslatorChange() 通知已连接组件刷新文案
 * - 未注入 translator 时，t() 回退返回 key 本身（不抛错）
 *
 * 按 locale 命名的翻译器：
 * - config-provider 注入 locale 时，t() 会先查最近 config-provider 的 locale 对应的翻译器
 * - i18n 在 registerLocale() 时通过 registerLocaleTranslator() 注册每个语言包
 */
export type Translator = (key: string, params?: Record<string, string | number>) => string

interface TranslatorState {
  translator: Translator | null
  listeners: Set<() => void>
  localeTranslators: Map<string, Translator>
}

/**
 * 单例状态挂到 globalThis：`link:` / workspace / 依赖提升失败时，同一进程可能出现
 * 多份 @oas-ui/core 模块实例；模块级 let 会让各副本各存一份 translator，i18n 注入
 * 只更新其中一份，组件仍回落 raw key。用 Symbol.for 共享同一状态，所有副本读写同一槽位。
 * 状态结构变更时 bump key 的版本号（v1 → v2），避免跨大版本误共享。
 */
const STATE_KEY = Symbol.for('@oas-ui/core/translator/v1')
const globalStore = globalThis as unknown as { [key: symbol]: unknown }
function createState(): TranslatorState {
  return { translator: null, listeners: new Set(), localeTranslators: new Map() }
}
const state: TranslatorState = (globalStore[STATE_KEY] as TranslatorState | undefined) ?? createState()
if (!globalStore[STATE_KEY]) globalStore[STATE_KEY] = state

/** 注入/清除翻译函数（locale 切换时由 i18n 包调用），会通知所有监听者 */
export function setTranslator(fn: Translator | null): void {
  state.translator = fn
  for (const cb of state.listeners) {
    // 广播隔离：单个监听者（组件刷新回调）抛错不阻断其余监听者收通知，
    // 否则一个组件的文案刷新异常会让全库 locale 切换失效
    try {
      cb()
    } catch (e) {
      console.error('[oas-ui] translator 变更监听器抛错：', e)
    }
  }
}

export function getTranslator(): Translator | null {
  return state.translator
}

/** 注册某个 locale 名对应的翻译函数（i18n 包在 registerLocale 时调用）；名称按 BCP 47 大小写归一 */
export function registerLocaleTranslator(name: string, fn: Translator): void {
  state.localeTranslators.set(normalizeLocaleTag(name), fn)
}

/** 读取某个 locale 名的翻译函数，未注册返回 null；查询名按 BCP 47 归一，扩展段可回退到基础标签（en_US / en-US-u-ca-gregory 均可命中） */
export function getLocaleTranslator(name: string): Translator | null {
  const normalized = normalizeLocaleTag(name)
  const direct = state.localeTranslators.get(normalized)
  if (direct) return direct
  const stripped = stripLocaleExtensions(normalized)
  if (stripped !== normalized) return state.localeTranslators.get(stripped) ?? null
  return null
}

/** 订阅 translator 变化（locale 切换），返回取消订阅函数 */
export function onTranslatorChange(cb: () => void): () => void {
  state.listeners.add(cb)
  return () => state.listeners.delete(cb)
}
