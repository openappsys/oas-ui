/**
 * @oas-ui/next RSC 服务端组件 —— `OasComponent`。
 *
 * 用法（Next.js App Router Server Component，须从 `@oas-ui/next/server` 导入）：
 * ```tsx
 * import { OasComponent } from '@oas-ui/next/server'
 *
 * export default function Page() {
 *   return (
 *     <section>
 *       <OasComponent tag="oas-button" attrs={{ type: 'primary' }}>提交</OasComponent>
 *       <OasComponent tag="oas-divider" attrs={{ 'content-position': 'left' }}>分割线</OasComponent>
 *     </section>
 *   )
 * }
 * ```
 *
 * 实现：在服务端调用 `@oas-ui/ssr` 的 `renderToString` 产出
 * 「宿主标签 + `<template shadowrootmode="open">` DSD 快照」的完整 HTML 字符串，
 * 经 `dangerouslySetInnerHTML` 渲染（RSC 服务端环境下字符串字面量进入 SSR 输出流，
 * 由浏览器 HTML 解析器附加 shadow root——`innerHTML` 等运行时注入不会触发附加）。
 *
 * 客户端注册引导见 `@oas-ui/next` 的 `OasRegistry`（"use client" 副作用
 * `import '@oas-ui/ui'`），整个应用的 `oas-*` 元素 upgrade 后由组件接管交互。
 * 客户端软导航（RSC flight 重建）时 DSD 模板不会由 innerHTML 附加 shadow root，
 * 但此时组件已在客户端注册、由自定义元素自渲染接管——属渐进增强模型。
 *
 * 注意：本模块为服务端专属（含 react-dom/server 与 Node 环境依赖），
 * 只能在 Server Component 中导入，请勿从 "use client" 文件引用。
 */
import { createElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderOas } from './ssr.js'
import type { OasAttrs, OasRenderOptions } from './ssr.js'

export type { OasAttrs, OasRenderOptions } from './ssr.js'

export interface OasComponentProps {
  /** 白名单组件 tag（如 `oas-button`）；非白名单 tag 渲染时抛错 */
  tag: string
  /** 宿主 attributes（kebab-case 键），值统一序列化为字符串 */
  attrs?: OasAttrs
  /** 注入 light DOM 的原始 HTML 片段（默认插槽内容）；与 children 同时给出时优先 */
  slotHTML?: string
  /** 默认插槽内容：字符串直接作为 light DOM；ReactNode 时经 renderToStaticMarkup 序列化 */
  children?: ReactNode
  /** 渲染选项（locale 控制内置文案语言） */
  renderOptions?: OasRenderOptions
  /** 包裹元素 className（默认 `oas-ssr`） */
  wrapperClassName?: string
}

/** 序列化 React children 为 light DOM HTML（字符串直接透传，其余走 renderToStaticMarkup） */
export function serializeChildren(children: ReactNode): string {
  if (typeof children === 'string') return children
  return renderToStaticMarkup(children)
}

/**
 * RSC 服务端组件：在服务端把白名单组件渲染为 DSD 静态快照 HTML，
 * 包一层 div（`dangerouslySetInnerHTML`）进入 SSR 输出流。
 */
export async function OasComponent(props: OasComponentProps): Promise<ReactElement> {
  const { tag, attrs, slotHTML, children, renderOptions, wrapperClassName = 'oas-ssr' } = props
  const light = slotHTML ?? (children != null ? serializeChildren(children) : '')
  const html = await renderOas(tag, attrs, light, renderOptions)
  const wrapperProps: Record<string, unknown> = { dangerouslySetInnerHTML: { __html: html } }
  if (wrapperClassName) wrapperProps.className = wrapperClassName
  return createElement('div', wrapperProps)
}
