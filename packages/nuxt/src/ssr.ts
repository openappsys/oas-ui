/**
 * @oas-ui/nuxt SSR helper —— `renderOasToString` / `useOasRender`。
 *
 * `renderToString` 的薄包装：渲染器首次调用时会自行装载 happy-dom DOM shim（进程级副作用，
 * 见 @oas-ui/ssr 的声明）并动态装载白名单组件目录，后续调用仅为渲染本身。locale 经全局
 * i18n registry 切换，渲染段同步执行，单线程下多请求无交错窗口。
 *
 * 用法（module 已注册后自动导入，server/api 与 server components 直接调用）：
 * ```ts
 * export default defineEventHandler(async () => {
 *   const button = await renderOasToString('oas-button', { type: 'primary' }, '提交')
 *   const empty = await renderOasToString('oas-empty', { description: '暂无数据' }, '', {
 *     locale: 'zh-CN',
 *   })
 *   return `<div class="ssr-demo">${button}${empty}</div>`
 * })
 * ```
 */
import { renderToString } from '@oas-ui/ssr'
import type { RenderToStringOptions } from '@oas-ui/ssr'

export type { RenderToStringOptions } from '@oas-ui/ssr'

/** 渲染选项：内置文案语言（默认沿用当前全局 locale，默认 zh-CN） */
export interface OasRenderOptions extends RenderToStringOptions {}

/**
 * 渲染白名单组件为含 DSD 快照的宿主 HTML 字符串。参数与 `@oas-ui/ssr` 的
 * `renderToString(tag, attrs, slotHTML, opts)` 完全一致，仅深化传包装。
 */
export async function renderOasToString(
  tag: string,
  attrs: Record<string, string> = {},
  slotHTML = '',
  opts: OasRenderOptions = {},
): Promise<string> {
  return renderToString(tag, attrs, slotHTML, opts)
}

/**
 * 组合式风格的渲染 helper：返回可调用的渲染函数（等价 `renderOasToString`）。
 * 供偏爱 `const render = useOasRender()` 写法的场景；渲染函数同一进程内幂等。
 */
export function useOasRender(): typeof renderOasToString {
  return renderOasToString
}
