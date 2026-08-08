/**
 * 翻译函数钩子 —— core 不依赖任何 i18n 实现（避免 core ↔ i18n 循环依赖）。
 *
 * 约定：
 * - 组件统一走 OASElement.t()，内部委托到这里的 translator
 * - `@oas-ui/i18n` 在 setLocale 时通过 setTranslator() 注入当前语言的翻译函数
 * - translator 变化（locale 切换）时通过 onTranslatorChange() 通知已连接组件刷新文案
 * - 未注入 translator 时，t() 回退返回 key 本身（不抛错）
 */
export type Translator = (key: string, params?: Record<string, string | number>) => string

let translator: Translator | null = null

const listeners = new Set<() => void>()

/** 注入/清除翻译函数（locale 切换时由 i18n 包调用），会通知所有监听者 */
export function setTranslator(fn: Translator | null): void {
  translator = fn
  for (const cb of listeners) cb()
}

export function getTranslator(): Translator | null {
  return translator
}

/** 订阅 translator 变化（locale 切换），返回取消订阅函数 */
export function onTranslatorChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
