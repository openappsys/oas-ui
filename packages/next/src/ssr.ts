/**
 * @oas-ui/next 低层 SSR helper —— `renderOas`。
 *
 * `@oas-ui/ssr` 的 `renderToString` 透传包装，并做了属性值归一化
 * （`Record<string, string | number | boolean>` → 字符串，便于 JSX 里写
 * `attrs={{ disabled: true, size: 40 }}`）。纯逻辑、不依赖 React，可独立单测；
 * RSC 组件 `OasComponent`（见 ./server.js）在其上加了 React 渲染壳。
 */
import { renderToString } from '@oas-ui/ssr'
import type { RenderToStringOptions } from '@oas-ui/ssr'

export type { RenderToStringOptions } from '@oas-ui/ssr'

/** 宿主 attributes：kebab-case 键；值支持 string/number/boolean（统一序列化为字符串） */
export type OasAttrs = Record<string, string | number | boolean>

/** 渲染选项：内置文案语言（默认沿用当前全局 locale，默认 zh-CN） */
export interface OasRenderOptions extends RenderToStringOptions {}

/** 归一化 attrs：所有值序列化为字符串（boolean → 'true'/'false'，number → 十进制） */
export function normalizeAttrs(attrs?: OasAttrs): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(attrs ?? {})) {
    out[name] = String(value)
  }
  return out
}

/**
 * 渲染白名单组件为含 DSD 快照的宿主 HTML 字符串（Node 环境）。
 * 非白名单 tag 抛错（与 `@oas-ui/ssr` 一致）。
 */
export async function renderOas(
  tag: string,
  attrs?: OasAttrs,
  slotHTML = '',
  opts: OasRenderOptions = {},
): Promise<string> {
  return renderToString(tag, normalizeAttrs(attrs), slotHTML, opts)
}
