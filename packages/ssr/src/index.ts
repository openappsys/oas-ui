/**
 * OAS-UI 服务端渲染（SSR）渲染器 —— `renderToString`。
 *
 * 能力：在 Node 环境用 happy-dom 起最小 DOM shim，装载组件类后按入参写 attributes 与 light DOM，
 * 触发首次 render，再把 shadowRoot 序列化为 Declarative Shadow DOM（DSD）`<template shadowrootmode="open">`，
 * 输出完整宿主 HTML 字符串。浏览器拿到该快照无需 JS 即可呈现结构与样式，upgrade 后复用已有 shadow root
 * 照常接管交互（基类已有 DSD 防御）。
 *
 * 范围：仅开放白名单纯展示组件（button/tag/empty/divider/typography）。property-only 数据组件与
 * 含布局测量的组件仍为客户端渲染。
 *
 * 为什么是 async：
 * - ESM 静态 import 会提升，无法保证「先装 DOM shim 再求值组件类」的顺序；
 * - 故首次调用时 `await import('@oas-ui/ui')`，此时组件目录 index.ts 的 define 副作用
 *   已注册到 shim 的 customElements 上（shim 在 import 之前先装好）；
 * - 之后模块已缓存，调用开销仅为渲染本身。同一进程内多次调用幂等。
 *
 * 用法：
 * ```ts
 * import { renderToString } from '@oas-ui/ssr'
 * const html = await renderToString('oas-button', { type: 'primary' }, '提交', { locale: 'zh-CN' })
 * // => '<oas-button type="primary"><template shadowrootmode="open">…</template>提交</oas-button>'
 * ```
 *
 * Node 安全说明：本模块的静态导入只含纯数据（i18n 语言包）与 happy-dom（shim），
 * 不经过 @oas-ui/core/i18n registry——那些模块求值 `class extends HTMLElement` 需要全局
 * HTMLElement 已就位，故全部走首次 renderToString 内的动态 import（shim 先装好再装载）。
 */
import zhCN from '@oas-ui/i18n/zh-CN'
import en from '@oas-ui/i18n/en'
import type { Locale } from '@oas-ui/i18n'
import { ensureShim } from './shim.js'

/** 渲染器开放的白名单 tag（纯展示、render 只依赖 attributes） */
export const WHITELIST = [
  'oas-button',
  'oas-tag',
  'oas-empty',
  'oas-divider',
  'oas-text',
  'oas-title',
  'oas-paragraph',
] as const

export type WhiteListTag = (typeof WHITELIST)[number]
export type RenderLocale = 'zh-CN' | 'en'

export interface RenderToStringOptions {
  /** 内置文案语言。不传则沿用当前全局 locale（默认 zh-CN） */
  locale?: RenderLocale
}

const LOCALES: Record<RenderLocale, Locale> = {
  'zh-CN': zhCN,
  en,
}

let uiLoaded: Promise<void> | null = null
let i18nApi: typeof import('@oas-ui/i18n') | null = null

/** 装载 UI 组件模块（define 副作用注册到 shim 的 customElements）。幂等。 */
async function ensureUI(): Promise<void> {
  if (!uiLoaded) {
    // 必须先装 shim：组件类求值需要全局 HTMLElement/customElements 已就位
    ensureShim()
    uiLoaded = import('@oas-ui/ui').then(() => undefined)
  }
  await uiLoaded
}

/**
 * 装载 i18n registry（其依赖链会求值 OASElement：class extends HTMLElement）。
 * 在 ensureUI 之后调用，此时 shim 已装好，故安全。幂等。
 */
async function ensureI18n(): Promise<typeof import('@oas-ui/i18n')> {
  if (!i18nApi) {
    i18nApi = await import('@oas-ui/i18n')
  }
  return i18nApi
}

/**
 * 渲染白名单组件为含 DSD 快照的宿主 HTML 字符串。
 *
 * @param tag 白名单组件标签（oas-button / oas-tag / oas-empty / oas-divider /
 *   oas-text / oas-title / oas-paragraph），其余抛错
 * @param attrs 宿主 attributes（kebab-case 键），值在序列化时做 & " < > 完整 HTML 转义
 * @param slotHTML 注入 light DOM 的 HTML 片段（默认插槽内容）
 * @param opts 选项（locale 控制内置文案语言）
 */
export async function renderToString(
  tag: string,
  attrs: Record<string, string> = {},
  slotHTML = '',
  opts: RenderToStringOptions = {},
): Promise<string> {
  if (!(WHITELIST as readonly string[]).includes(tag)) {
    throw new Error(
      `[oas-ui/ssr] 非白名单 tag「${tag}」：renderToString 仅支持 ${WHITELIST.join('、')}，其余组件仍为客户端渲染`,
    )
  }

  await ensureUI()
  if (opts.locale) await applyLocale(opts.locale)

  const { document } = ensureShim()
  const el = document.createElement(tag)
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value)
  }
  if (slotHTML) {
    el.innerHTML = slotHTML
  }

  // appendChild 触发 connectedCallback → render() + update()（与浏览器首帧行为一致）
  const host = document.body ?? document.documentElement
  host.appendChild(el)

  // shadowRoot 序列化为 DSD template 内容；宿主标签手动序列化：
  // happy-dom 的属性序列化只转义 & 与 "，不转义 < / >（属性值内的 < 可逃逸出属性），
  // 故这里自行做完整转义，同时保留组件在宿主侧同步的属性（如 oas-tag 的 role/tabindex）。
  const shadowHtml = el.shadowRoot?.innerHTML ?? ''
  const attrsHtml: string[] = []
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes.item(i)
    if (!attr) continue
    attrsHtml.push(` ${attr.name}="${escapeAttr(attr.value)}"`)
  }
  const tagName = el.tagName.toLowerCase()
  el.remove()

  return `<${tagName}${attrsHtml.join('')}><template shadowrootmode="open">${shadowHtml}</template>${slotHTML}</${tagName}>`
}

/** 属性值 HTML 转义（& " < >），防止注入闭合引号/标签 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** registerLocale + setLocale：先注册语言包再按名切换（与 @oas-ui/i18n 约定一致） */
async function applyLocale(locale: RenderLocale): Promise<void> {
  const { registerLocale, setLocale } = await ensureI18n()
  const pack = LOCALES[locale]
  registerLocale(pack)
  setLocale(pack.name)
}
