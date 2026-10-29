/**
 * fixture 的 locale 解析与 ar 语言包注册。
 *
 * 关键约束：`@oas-ui/ssr` 与 `@oas-ui/i18n` 都会求值 `class extends HTMLElement`（经 core），
 * 因此**不能静态 import i18n**——必须先由首次 `renderToString` 装好 happy-dom shim。
 * 这里用一次幂等的 bootstrap 渲染（无 locale，不触发 i18n 装载）建立 shim，再动态注册 ar；
 * zh-CN / en 由 `renderToString` 的显式 locale 路径自行注册。
 */
import type { RenderToStringOptions } from '@oas-ui/ssr'
import { loadSsr } from './ssr-runtime'

/** 请求可用的 locale URL 段（fixture 约定：en-US 在渲染层归一到内置 en 语言包） */
export const REQUEST_LOCALES = ['zh-CN', 'en-US', 'ar'] as const
export type RequestLocale = (typeof REQUEST_LOCALES)[number]

/** 实际注入 `<oas-config-provider locale>` 的语言包名 */
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

let localesReady: Promise<void> | null = null

/**
 * 幂等注册 ar：首次调用先跑一次无 locale 的 bootstrap 渲染（装 shim、不装载 i18n），
 * 再动态 import i18n registry 与 ar 语言包。失败不缓存 rejected Promise，后续请求可重试。
 */
export function ensureFixtureLocales(): Promise<void> {
  localesReady ??= (async () => {
    const { renderToString } = await loadSsr()
    await renderToString('oas-divider', {}, '')
    const [{ registerLocale }, { default: ar }] = await Promise.all([import('@oas-ui/i18n'), import('@oas-ui/i18n/ar')])
    registerLocale(ar)
  })().catch((error: unknown) => {
    localesReady = null
    throw error
  })
  return localesReady
}

/**
 * `RenderToStringOptions.locale` 的公开联合类型目前只有 zh-CN / en；ar 是官方内置语言包，
 * fixture 注册后按 locale 名就近注入的运行时路径与 en 完全一致。这里只在 fixture 内做类型拓宽，
 * 不修改发布包的公开 API。
 */
export function renderOptionsFor(locale: RenderLocale): RenderToStringOptions {
  return { locale: locale as unknown as RenderToStringOptions['locale'] }
}
