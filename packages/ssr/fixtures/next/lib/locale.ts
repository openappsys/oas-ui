/**
 * fixture 的请求 locale 解析。
 *
 * `@oas-ui/ssr` 的 `RenderToStringOptions.locale` 已内置全部官方语言名（含 ar），
 * 因此 fixture 直接把渲染 locale 交给渲染器：渲染器按需装载并注册对应语言包，
 * 不需要在 fixture 里做类型拓宽或手工 registerLocale。
 */
import type { RenderToStringOptions } from '@oas-ui/ssr'

/** 请求可用的 locale URL 段（fixture 约定：en-US 在渲染层归一到内置 en 语言包） */
export const REQUEST_LOCALES = ['zh-CN', 'en-US', 'ar'] as const
export type RequestLocale = (typeof REQUEST_LOCALES)[number]

/** 实际注入 `<oas-config-provider locale>` 的内置语言包名 */
export type RenderLocale = 'zh-CN' | 'en' | 'ar'

export interface ResolvedLocale {
  request: RequestLocale
  render: RenderLocale
  dir: 'ltr' | 'rtl'
}

const RESOLVED: Record<RequestLocale, ResolvedLocale> = {
  'zh-CN': { request: 'zh-CN', render: 'zh-CN', dir: 'ltr' },
  'en-US': { request: 'en-US', render: 'en', dir: 'ltr' },
  ar: { request: 'ar', render: 'ar', dir: 'rtl' },
}

/** URL 段 → 渲染 locale；未知段返回 null（页面 404，不做静默回落） */
export function resolveRequestLocale(input: string): ResolvedLocale | null {
  return (RESOLVED as Record<string, ResolvedLocale | undefined>)[input] ?? null
}

/** 渲染选项：RenderLocale 是 RenderToStringOptions['locale'] 的子集，直接赋值即可 */
export function renderOptionsFor(locale: RenderLocale): RenderToStringOptions {
  return { locale }
}
