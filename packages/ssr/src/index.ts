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
 * modal/drawer 默认关闭态为宿主骨架、popconfirm 为隐藏气泡，服务端直出 visible/open 时快照含完整弹层）+
 * 数据展示组件批次 3（card/avatar/avatar-group/image/qrcode/watermark/collapse/descriptions/timeline/list/
 * carousel/statistic/countdown/chart/code/equation/log/masonry/comment/marquee/number-animation/gradient-text/
 * aspect-ratio/virtual-list 及四个子组件 collapse-item/descriptions-item/timeline-item/list-item：
 * 纯展示组件直出完整快照；chart/code/equation 为同步确定性渲染（SVG/高亮/公式全部纯计算，非 canvas/异步）；
 * 动态组件 carousel/countdown/number-animation/marquee 快照为初始帧/初始值，动画与计时由客户端接管；
 * virtual-list 快照为 scrollTop=0 的首屏窗口行 + 上下 padding 占位，升级后按同属性重算窗口不变）+
 * 导航布局组件批次 4（tabs/tab-panel/bottom-navigation/pagination/steps/segmented/breadcrumb/anchor/
 * back-top/menu/dropdown/context-menu/menubar/navigation-menu/toolbar/command/tour/hover-card/splitter/
 * flex/page-header/float-button/speed-dial/layout/sider/header/content/footer/sidebar/container/grid/
 * grid-item：静态结构组件直出完整快照；浮层触发类 dropdown/context-menu/hover-card/command/tour 面板
 * 默认关闭、快照为触发器骨架；menu/menubar/navigation-menu/toolbar 为可见菜单结构直出快照）+
 * 白名单收尾批次 5（badge/button-group/icon/kbd/label/link/space/visually-hidden 纯展示组件直出完整
 * 快照；tooltip/popover 浮层触发类默认关闭、快照为触发器 slot 原样 + 关闭态气泡骨架；config-provider/
 * app 框架级容器无自身视觉、快照为子树原样 + 容器属性就位，嵌套子组件由 injectNestedDSD 覆盖；
 * theme-editor 为开发工具组件、SSR 意义低，评估后排除）。
 *
 * 嵌套递归序列化：light DOM 里已 upgrade 的子组件（如 form>form-item>oas-input、tabs>tab-panel、
 * layout>sider）会被递归包成嵌套 `<template shadowrootmode="open">`（含子组件指纹），
 * 禁 JS 时子组件 shadow 内容同样可见；浏览器 upgrade 后父子均按指纹走真水合。
 *
 * 为什么按需装载（而不是 `import('@oas-ui/ui')` 全量）：
 * - 全量入口会求值全部 ~115 个组件目录（每个目录 index.ts 的 define 副作用 + 各自依赖图），
 *   测试环境首次 renderToString 实测约 1.8~3.5s；
 * - 本渲染器按 tag 只动态 import 对应组件目录（如 `@oas-ui/ui/basic/button`），白名单组件
 *   首载实测 < 200ms。目录 index.ts 的 define 副作用注册到 shim 的 customElements 上
 *   （shim 在 import 之前先装好），无需手动 define，安全；
 * - 嵌套场景（slotHTML 里含其他白名单子组件，如 form>form-item）会在渲染前把子组件 tag
 *   一并按需装载——子组件不 upgrade 就没有 shadowRoot 可序列化，禁 JS 快照会丢失子组件内容。
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
 * 无初始 DOM 不纳入）+ 数据展示组件批次 3（纯展示组件直出快照；chart/code/equation 同步确定性渲染；
 * 动态组件快照为初始帧，动画客户端接管；virtual-list 快照为首屏窗口 + padding 占位）+
 * 导航布局组件批次 4（静态结构组件直出快照；浮层触发类面板默认关闭、快照为触发器骨架；
 * menu/menubar/navigation-menu/toolbar 可见菜单结构直出快照；layout 多 tag 组件走嵌套递归序列化）+
 * 白名单收尾批次 5（badge/button-group/icon/kbd/label/link/space/visually-hidden 纯展示组件直出完整
 * 快照；tooltip/popover 浮层触发类快照为触发器 slot 原样 + 关闭态气泡骨架；config-provider/app
 * 框架级容器快照为子树原样；theme-editor 开发工具组件 SSR 意义低，排除）。
 */
export const WHITELIST = [
  'oas-button',
  'oas-tag',
  'oas-tag-group',
  'oas-compact',
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
  'oas-card',
  'oas-avatar',
  'oas-avatar-group',
  'oas-image',
  'oas-qrcode',
  'oas-watermark',
  'oas-collapse',
  'oas-collapse-item',
  'oas-descriptions',
  'oas-descriptions-item',
  'oas-timeline',
  'oas-timeline-item',
  'oas-list',
  'oas-list-item',
  'oas-carousel',
  'oas-statistic',
  'oas-countdown',
  'oas-chart',
  'oas-code',
  'oas-equation',
  'oas-log',
  'oas-masonry',
  'oas-comment',
  'oas-marquee',
  'oas-number-animation',
  'oas-gradient-text',
  'oas-aspect-ratio',
  'oas-virtual-list',
  // —— DSD 批次 4：导航布局组件白名单化 ——
  'oas-tabs',
  'oas-tab-panel',
  'oas-bottom-navigation',
  'oas-pagination',
  'oas-steps',
  'oas-segmented',
  'oas-breadcrumb',
  'oas-anchor',
  'oas-back-top',
  'oas-menu',
  'oas-dropdown',
  'oas-context-menu',
  'oas-menubar',
  'oas-navigation-menu',
  'oas-toolbar',
  'oas-command',
  'oas-tour',
  'oas-hover-card',
  'oas-splitter',
  'oas-flex',
  'oas-page-header',
  'oas-float-button',
  'oas-speed-dial',
  'oas-layout',
  'oas-header',
  'oas-sider',
  'oas-content',
  'oas-footer',
  'oas-sidebar',
  'oas-container',
  'oas-grid',
  'oas-grid-item',
  // —— DSD 批次 5：白名单收尾（基础纯展示 + 浮层触发 + 框架级容器） ——
  'oas-badge',
  'oas-button-group',
  'oas-icon',
  'oas-kbd',
  'oas-label',
  'oas-link',
  'oas-space',
  'oas-visually-hidden',
  'oas-tooltip',
  'oas-popover',
  'oas-config-provider',
  'oas-app',
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
  // tag-group 与 tag 同目录，装载一次注册两个 tag
  'oas-tag-group': '@oas-ui/ui/basic/tag',
  // compact 与 space 同目录，装载一次注册两个 tag
  'oas-compact': '@oas-ui/ui/basic/space',
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
  'oas-card': '@oas-ui/ui/data/card',
  'oas-avatar': '@oas-ui/ui/data/avatar',
  'oas-avatar-group': '@oas-ui/ui/data/avatar-group',
  'oas-image': '@oas-ui/ui/data/image',
  'oas-qrcode': '@oas-ui/ui/data/qrcode',
  'oas-watermark': '@oas-ui/ui/data/watermark',
  'oas-collapse': '@oas-ui/ui/data/collapse',
  'oas-collapse-item': '@oas-ui/ui/data/collapse',
  'oas-descriptions': '@oas-ui/ui/data/descriptions',
  'oas-descriptions-item': '@oas-ui/ui/data/descriptions',
  'oas-timeline': '@oas-ui/ui/data/timeline',
  'oas-timeline-item': '@oas-ui/ui/data/timeline',
  'oas-list': '@oas-ui/ui/data/list',
  'oas-list-item': '@oas-ui/ui/data/list',
  'oas-carousel': '@oas-ui/ui/data/carousel',
  'oas-statistic': '@oas-ui/ui/data/statistic',
  'oas-countdown': '@oas-ui/ui/data/countdown',
  'oas-chart': '@oas-ui/ui/data/chart',
  'oas-code': '@oas-ui/ui/data/code',
  'oas-equation': '@oas-ui/ui/data/equation',
  'oas-log': '@oas-ui/ui/data/log',
  'oas-masonry': '@oas-ui/ui/data/masonry',
  'oas-comment': '@oas-ui/ui/data/comment',
  'oas-marquee': '@oas-ui/ui/data/marquee',
  'oas-number-animation': '@oas-ui/ui/data/number-animation',
  'oas-gradient-text': '@oas-ui/ui/data/gradient-text',
  'oas-aspect-ratio': '@oas-ui/ui/data/aspect-ratio',
  'oas-virtual-list': '@oas-ui/ui/data/virtual-list',
  // —— DSD 批次 4：导航布局组件（layout 多 tag 目录一次装载注册全部） ——
  'oas-tabs': '@oas-ui/ui/layout/tabs',
  'oas-tab-panel': '@oas-ui/ui/layout/tabs',
  'oas-bottom-navigation': '@oas-ui/ui/navigation/bottom-navigation',
  'oas-pagination': '@oas-ui/ui/layout/pagination',
  'oas-steps': '@oas-ui/ui/layout/steps',
  'oas-segmented': '@oas-ui/ui/layout/segmented',
  'oas-breadcrumb': '@oas-ui/ui/navigation/breadcrumb',
  'oas-anchor': '@oas-ui/ui/navigation/anchor',
  'oas-back-top': '@oas-ui/ui/navigation/back-top',
  'oas-menu': '@oas-ui/ui/floating/menu',
  'oas-dropdown': '@oas-ui/ui/floating/dropdown',
  'oas-context-menu': '@oas-ui/ui/floating/contextmenu',
  'oas-menubar': '@oas-ui/ui/floating/menubar',
  'oas-navigation-menu': '@oas-ui/ui/floating/navigation-menu',
  'oas-toolbar': '@oas-ui/ui/floating/toolbar',
  'oas-command': '@oas-ui/ui/floating/command',
  'oas-tour': '@oas-ui/ui/navigation/tour',
  'oas-hover-card': '@oas-ui/ui/floating/hover-card',
  'oas-splitter': '@oas-ui/ui/layout/splitter',
  'oas-flex': '@oas-ui/ui/layout/flex',
  'oas-page-header': '@oas-ui/ui/layout/page-header',
  'oas-float-button': '@oas-ui/ui/layout/float-button',
  'oas-speed-dial': '@oas-ui/ui/floating/speed-dial',
  'oas-layout': '@oas-ui/ui/layout/layout',
  'oas-header': '@oas-ui/ui/layout/layout',
  'oas-sider': '@oas-ui/ui/layout/layout',
  'oas-content': '@oas-ui/ui/layout/layout',
  'oas-footer': '@oas-ui/ui/layout/layout',
  'oas-sidebar': '@oas-ui/ui/layout/sidebar',
  'oas-container': '@oas-ui/ui/layout/container',
  'oas-grid': '@oas-ui/ui/layout/grid',
  'oas-grid-item': '@oas-ui/ui/layout/grid',
  // —— DSD 批次 5：白名单收尾 ——
  'oas-badge': '@oas-ui/ui/basic/badge',
  'oas-button-group': '@oas-ui/ui/basic/button-group',
  'oas-icon': '@oas-ui/ui/basic/icon',
  'oas-kbd': '@oas-ui/ui/basic/kbd',
  'oas-label': '@oas-ui/ui/basic/label',
  'oas-link': '@oas-ui/ui/basic/link',
  'oas-space': '@oas-ui/ui/basic/space',
  'oas-visually-hidden': '@oas-ui/ui/basic/visually-hidden',
  'oas-tooltip': '@oas-ui/ui/floating/tooltip',
  'oas-popover': '@oas-ui/ui/floating/popover',
  'oas-config-provider': '@oas-ui/ui/floating/config-provider',
  'oas-app': '@oas-ui/ui/floating/app',
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
 *   oas-backdrop / oas-modal / oas-drawer / oas-popconfirm / oas-card / oas-avatar /
 *   oas-avatar-group / oas-image / oas-qrcode / oas-watermark / oas-collapse /
 *   oas-collapse-item / oas-descriptions / oas-descriptions-item / oas-timeline /
 *   oas-timeline-item / oas-list / oas-list-item / oas-carousel / oas-statistic /
 *   oas-countdown / oas-chart / oas-code / oas-equation / oas-log / oas-masonry /
 *   oas-comment / oas-marquee / oas-number-animation / oas-gradient-text /
 *   oas-aspect-ratio / oas-virtual-list / oas-tabs / oas-tab-panel /
 *   oas-bottom-navigation / oas-pagination / oas-steps / oas-segmented /
 *   oas-breadcrumb / oas-anchor / oas-back-top / oas-menu / oas-dropdown /
 *   oas-context-menu / oas-menubar / oas-navigation-menu / oas-toolbar /
 *   oas-command / oas-tour / oas-hover-card / oas-splitter / oas-flex /
 *   oas-page-header / oas-float-button / oas-speed-dial / oas-layout /
 *   oas-header / oas-sider / oas-content / oas-footer / oas-sidebar /
 *   oas-container / oas-grid / oas-grid-item / oas-badge / oas-button-group /
 *   oas-icon / oas-kbd / oas-label / oas-link / oas-space / oas-visually-hidden /
 *   oas-tooltip / oas-popover / oas-config-provider / oas-app），其余抛错
 * @param attrs 宿主 attributes（kebab-case 键），值在序列化时做 & " < > 完整 HTML 转义
 * @param slotHTML 注入 light DOM 的 HTML 片段（默认插槽内容）；内部含白名单子组件时
 *   会被递归序列化为嵌套 DSD（子组件 shadowRoot + 指纹包成 template 插到内容最前）
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
  // 嵌套序列化前置：slotHTML 里出现的白名单子组件 tag 也需已装载（否则子组件不 upgrade，
  // shadowRoot 为空 → 无法序列化其 shadow 内容）。非白名单子组件不装载、按原始标记输出。
  await ensureNestedTags(slotHTML)
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

  // 嵌套递归序列化：把 light DOM 里所有已 upgrade 的自定义元素（shadowRoot 非空者）
  // 的 shadowRoot.innerHTML + 指纹包成 <template shadowrootmode="open"> 插到该子元素内容最前。
  // happy-dom 序列化 template 元素时包含其 content（已探测验证），故无需手写序列化。
  injectNestedDSD(el, document)

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
  // light DOM 用处理后的 el.innerHTML（保留组件对 light DOM 的同步，如 tabs 给非激活
  // panel 加 hidden、checkbox-group 给子项同步 checked），而非原始 slotHTML 入参
  const lightHtml = el.innerHTML
  el.remove()

  return `<${tagName}${attrsHtml.join('')}><template shadowrootmode="open">${fingerprintFor(tagName)}${shadowHtml}</template>${lightHtml}</${tagName}>`
}

/**
 * 装载 slotHTML 里出现的白名单子组件 tag（嵌套序列化需要子组件已 upgrade）。
 * 幂等：只调用 ensureTag（内部按 tag 缓存）；非白名单/非自定义元素 tag 忽略。
 */
async function ensureNestedTags(slotHTML: string): Promise<void> {
  if (!slotHTML) return
  // 正则提取自定义元素 tag（含 '-' 的标签名），不建 DOM、无副作用
  const found = new Set<string>()
  for (const m of slotHTML.matchAll(/<\s*([a-z][a-z0-9-]*)/gi)) {
    const name = m[1]!.toLowerCase()
    if (name.includes('-') && (WHITELIST as readonly string[]).includes(name)) found.add(name)
  }
  for (const name of found) {
    await ensureTag(name)
  }
}

/**
 * 嵌套递归序列化：遍历 el 的 light DOM 里所有已 upgrade 的自定义元素（shadowRoot 非空者），
 * 把它们的 shadowRoot.innerHTML + 指纹包成 `<template shadowrootmode="open">…</template>`
 * 插到该子元素内容最前。多层级嵌套（form > form-item > oas-input）由 querySelectorAll('*')
 * 深度优先天然覆盖（内层元素先序列化，外层模板只包其自身 shadow）。
 *
 * happy-dom 序列化 template 元素时包含其 content（innerHTML/outerHTML 均含内容，已探测），
 * 故 el.innerHTML 最终输出即含嵌套 DSD。浏览器解析该 HTML 时子组件由 HTML 解析器附加
 * shadow root，upgrade 后据指纹走真水合（基类 tryHydrate 已具备）。
 *
 * 注意：这里给子组件 light DOM 插入的 template 元素只在序列化阶段存在，序列化完成后
 * el.remove() 整体丢弃，不会污染 shim 环境（happy-dom 不解析 DSD，无附加 shadow 副作用）。
 */
function injectNestedDSD(el: HTMLElement, document: Document): void {
  for (const child of el.querySelectorAll('*')) {
    if (!child.shadowRoot || child.shadowRoot.innerHTML === '') continue
    const childTag = child.tagName.toLowerCase()
    const tpl = document.createElement('template')
    tpl.setAttribute('shadowrootmode', 'open')
    tpl.innerHTML = `${fingerprintFor(childTag)}${child.shadowRoot.innerHTML}`
    child.insertBefore(tpl, child.firstChild)
  }
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
