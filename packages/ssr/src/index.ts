/**
 * OAS-UI 服务端渲染（SSR）渲染器 —— `renderToString`。
 *
 * 能力：在 Node 环境用 happy-dom 起最小 DOM shim，按需装载白名单组件后按入参写 attributes 与 light DOM，
 * 触发首次 render，再把 shadowRoot 序列化为 Declarative Shadow DOM（DSD）`<template shadowrootmode="open">`，
 * 输出完整宿主 HTML 字符串。浏览器拿到该快照无需 JS 即可呈现结构与样式，upgrade 后复用已有 shadow root
 * 照常接管交互（基类已有 DSD 防御）。
 *
 * 范围：白名单纯展示组件（button/tag/empty/divider/typography）+ 数据组件（table/tree/select/transfer/
 * toggle-group 等，数据走 JSON attribute 声明式通道，property 优先）+ 测量组件闪动治理试点（affix/
 * ellipsis/scroll-area，快照为未校正态，浏览器 upgrade 后 rAF 校正）+ 表单组件批次 1（input/textarea/
 * checkbox/radio/switch/slider/input-number/rate/auto-complete/combobox/cascader/tree-select/mentions/
 * date-picker/time-picker/calendar/upload/color-picker/toggle-button/pin-input/dynamic-input/dynamic-tags/
 * editable/form/form-item 等，快照含骨架与已选值；下拉面板默认关闭态、上传列表为空态属预期）+
 * 反馈组件批次 2（alert/progress/spin/skeleton/result/backdrop/modal/drawer/popconfirm，可见态直出快照；
 * modal/drawer 默认关闭态为宿主骨架、popconfirm 为隐藏气泡，服务端直出 visible/open 时快照含完整弹层）。
 *
 * 为什么按需装载（而不是 `import('@oas-ui/ui')` 全量）：
 * - 全量入口会求值全部 ~115 个组件目录（每个目录 index.ts 的 define 副作用 + 各自依赖图），
 *   测试环境首次 renderToString 实测约 1.8~3.5s；
 * - 本渲染器按 tag 只动态 import 对应组件目录（如 `@oas-ui/ui/basic/button`），白名单组件
 *   首载实测 < 200ms。目录 index.ts 的 define 副作用注册到 shim 的 customElements 上
 *   （shim 在 import 之前先装好），无需手动 define，安全；
 * - 为什么不走 `@oas-ui/ui/ssr`（Node-safe 类导出入口）：该入口 re-export 全部组件类，
 *   import 任一具名导出都会求值全部 ~115 个类文件（模块装载量不降，只是不 define）；
 *   单独 `@oas-ui/ui/basic/button/oas-button` 子路径与 ui exports 的 `./*` 通配
 *   （映射到 `dist/<目录>/index.js`）形态不符不可达；目录 index 才是真正的按需最小单元。
 *
 * 为什么是 async：
 * - ESM 静态 import 会提升，无法保证「先装 DOM shim 再求值组件类」的顺序；
 * - 故组件目录一律在首次 renderToString 内动态 import（shim 先装好再装载）；
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

/**
 * 渲染器开放的白名单 tag。
 * 纯展示组件（render 只依赖 attributes）+ 数据组件（table/tree/select/transfer/toggle-group，
 * 数据走 JSON attribute 声明式通道、非虚拟模式同步渲染、快照可序列化数据行/选项）+ 测量组件闪动治理
 * 试点（affix/ellipsis/scroll-area：SSR 快照为未校正态，浏览器端 rAF 校正，属设计语义）+ 表单组件
 * 批次 1（DSD 白名单化：template/bind/hydrate 拆分，快照为骨架/已选值/关闭态下拉）+ 反馈组件批次 2
 * （可见态反馈组件 + 浮层组件，命令式组件 message/notification/toast/snackbar/loading-bar/confirm
 * 无初始 DOM 不纳入）。
 */
export const WHITELIST = [
  'oas-button',
  'oas-tag',
  'oas-empty',
  'oas-divider',
  'oas-text',
  'oas-title',
  'oas-paragraph',
  'oas-table',
  'oas-affix',
  'oas-ellipsis',
  'oas-scroll-area',
  'oas-tree',
  'oas-select',
  'oas-input',
  'oas-textarea',
  'oas-checkbox',
  'oas-checkbox-group',
  'oas-radio',
  'oas-radio-group',
  'oas-switch',
  'oas-slider',
  'oas-input-number',
  'oas-rate',
  'oas-auto-complete',
  'oas-combobox',
  'oas-cascader',
  'oas-tree-select',
  'oas-mentions',
  'oas-date-picker',
  'oas-time-picker',
  'oas-calendar',
  'oas-upload',
  'oas-transfer',
  'oas-color-picker',
  'oas-toggle-button',
  'oas-toggle-group',
  'oas-pin-input',
  'oas-dynamic-input',
  'oas-dynamic-tags',
  'oas-editable',
  'oas-form',
  'oas-form-item',
  'oas-alert',
  'oas-progress',
  'oas-spin',
  'oas-skeleton',
  'oas-result',
  'oas-backdrop',
  'oas-modal',
  'oas-drawer',
  'oas-popconfirm',
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

/**
 * 真水合指纹：DSD 快照格式版本。快照语义/结构升级时递增，
 * 旧版本快照在升级后的组件上会因 hydrate() 结构校验不符而回退重渲染（正确性优先）。
 */
const SNAPSHOT_FORMAT_VERSION = '1'

/**
 * 生成真水合指纹 meta：嵌入 DSD 快照 shadow 内容最前面（style 之前）。
 * meta 元素在 shadow 内无副作用（UA 样式 display:none，不影响布局），
 * 组件 upgrade 时基类据 `data-oas-ssr` 值判定快照归属 tag，命中则跳过 shadow 重建接管。
 */
function fingerprintFor(tag: string): string {
  return `<meta data-oas-ssr="${tag}" data-oas-ssr-v="${SNAPSHOT_FORMAT_VERSION}">`
}

/**
 * 白名单 tag → 组件目录入口映射（经 @oas-ui/ui exports 的 `./*` 通配可达：
 * `@oas-ui/ui/basic/button` → `dist/basic/button/index.js`，vitest 走 alias 到 src 目录 index.ts）。
 * typography 三兄弟共用 `basic/typography` 目录，checkbox/radio 各含单控件与 group 两个 tag，
 * 装载一次即注册全部相关 tag。
 */
const TAG_ENTRY: Record<WhiteListTag, string> = {
  'oas-button': '@oas-ui/ui/basic/button',
  'oas-tag': '@oas-ui/ui/basic/tag',
  'oas-empty': '@oas-ui/ui/feedback/empty',
  'oas-divider': '@oas-ui/ui/basic/divider',
  'oas-text': '@oas-ui/ui/basic/typography',
  'oas-title': '@oas-ui/ui/basic/typography',
  'oas-paragraph': '@oas-ui/ui/basic/typography',
  'oas-table': '@oas-ui/ui/data/table',
  'oas-affix': '@oas-ui/ui/layout/affix',
  'oas-ellipsis': '@oas-ui/ui/data/ellipsis',
  'oas-scroll-area': '@oas-ui/ui/floating/scroll-area',
  'oas-tree': '@oas-ui/ui/data/tree',
  'oas-select': '@oas-ui/ui/form/select',
  'oas-input': '@oas-ui/ui/form/input',
  'oas-textarea': '@oas-ui/ui/form/textarea',
  'oas-checkbox': '@oas-ui/ui/form/checkbox',
  'oas-checkbox-group': '@oas-ui/ui/form/checkbox',
  'oas-radio': '@oas-ui/ui/form/radio',
  'oas-radio-group': '@oas-ui/ui/form/radio',
  'oas-switch': '@oas-ui/ui/form/switch',
  'oas-slider': '@oas-ui/ui/form/slider',
  'oas-input-number': '@oas-ui/ui/form/input-number',
  'oas-rate': '@oas-ui/ui/form/rate',
  'oas-auto-complete': '@oas-ui/ui/form/auto-complete',
  'oas-combobox': '@oas-ui/ui/form/combobox',
  'oas-cascader': '@oas-ui/ui/form/cascader',
  'oas-tree-select': '@oas-ui/ui/form/tree-select',
  'oas-mentions': '@oas-ui/ui/form/mentions',
  'oas-date-picker': '@oas-ui/ui/form/date-picker',
  'oas-time-picker': '@oas-ui/ui/form/time-picker',
  'oas-calendar': '@oas-ui/ui/form/calendar',
  'oas-upload': '@oas-ui/ui/form/upload',
  'oas-transfer': '@oas-ui/ui/form/transfer',
  'oas-color-picker': '@oas-ui/ui/form/color-picker',
  'oas-toggle-button': '@oas-ui/ui/form/toggle-button',
  'oas-toggle-group': '@oas-ui/ui/form/toggle-group',
  'oas-pin-input': '@oas-ui/ui/form/pin-input',
  'oas-dynamic-input': '@oas-ui/ui/form/dynamic-input',
  'oas-dynamic-tags': '@oas-ui/ui/form/dynamic-tags',
  'oas-editable': '@oas-ui/ui/form/editable',
  'oas-form': '@oas-ui/ui/form/form',
  'oas-form-item': '@oas-ui/ui/form/form-item',
  'oas-alert': '@oas-ui/ui/feedback/alert',
  'oas-progress': '@oas-ui/ui/feedback/progress',
  'oas-spin': '@oas-ui/ui/feedback/spin',
  'oas-skeleton': '@oas-ui/ui/feedback/skeleton',
  'oas-result': '@oas-ui/ui/feedback/result',
  'oas-backdrop': '@oas-ui/ui/feedback/backdrop',
  'oas-modal': '@oas-ui/ui/feedback/modal',
  'oas-drawer': '@oas-ui/ui/feedback/drawer',
  'oas-popconfirm': '@oas-ui/ui/feedback/popconfirm',
}

/** 已装载的组件目录 import promise（按 tag 缓存；Node ESM 模块缓存兜底去重）。 */
const tagLoaded = new Map<string, Promise<void>>()

/**
 * 装载单个白名单 tag 对应的组件目录（index.ts 的 define 副作用注册到 shim 的 customElements）。幂等。
 */
function ensureTag(tag: string): Promise<void> {
  const cached = tagLoaded.get(tag)
  if (cached) return cached
  const spec = TAG_ENTRY[tag as WhiteListTag]
  if (!spec) {
    // 防御性兜底：renderToString 已按 WHITELIST 校验，正常不可达
    throw new Error(`[oas-ui/ssr] 未知白名单 tag「${tag}」：无对应组件目录映射`)
  }
  // 必须先装 shim：组件类求值需要全局 HTMLElement/customElements 已就位
  ensureShim()
  const loading = import(spec).then(() => undefined)
  tagLoaded.set(tag, loading)
  return loading
}

let i18nApi: typeof import('@oas-ui/i18n') | null = null

/**
 * 装载 i18n registry（纯数据模块，但保持动态 import 以便首次调用时装载，避免无谓的启动开销）。幂等。
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
 *   oas-text / oas-title / oas-paragraph / oas-table / oas-affix / oas-ellipsis /
 *   oas-scroll-area / oas-tree / oas-select / oas-input / oas-textarea / oas-checkbox /
 *   oas-checkbox-group / oas-radio / oas-radio-group / oas-switch / oas-slider /
 *   oas-input-number / oas-rate / oas-auto-complete / oas-combobox / oas-cascader /
 *   oas-tree-select / oas-mentions / oas-date-picker / oas-time-picker / oas-calendar /
 *   oas-upload / oas-transfer / oas-color-picker / oas-toggle-button / oas-toggle-group /
 *   oas-pin-input / oas-dynamic-input / oas-dynamic-tags / oas-editable / oas-form /
 *   oas-form-item / oas-alert / oas-progress / oas-spin / oas-skeleton / oas-result /
 *   oas-backdrop / oas-modal / oas-drawer / oas-popconfirm），其余抛错
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

  await ensureTag(tag)
  if (opts.locale) await applyLocale(opts.locale)

  // 注意：applyLocale（setLocale 是进程级全局态）之后的渲染段全程同步、无 await——
  // 单线程下多请求交错调用时 locale 不会被串。未来改动请勿在此区间插入 await。
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

  return `<${tagName}${attrsHtml.join('')}><template shadowrootmode="open">${fingerprintFor(tagName)}${shadowHtml}</template>${slotHTML}</${tagName}>`
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
