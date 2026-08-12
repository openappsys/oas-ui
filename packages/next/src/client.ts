/**
 * @oas-ui/next 客户端注册引导 —— `OasRegistry`。
 *
 * "use client"：在客户端执行 `@oas-ui/ui` 的副作用导入
 * （`customElements.define` 全局注册全部 `oas-*` 组件）。
 * 挂在 App Router 的根 layout（包住 html/body 即可），
 * 整个应用的 `oas-*` 元素 upgrade 后由组件接管交互。
 *
 * 用法（app/layout.tsx）：
 * ```tsx
 * import { OasRegistry } from '@oas-ui/next'
 *
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <OasRegistry>
 *       <html lang="zh-CN">
 *         <body>{children}</body>
 *       </html>
 *     </OasRegistry>
 *   )
 * }
 * ```
 *
 * 说明：children 由服务端传入（children 透传模式，Server Components 可安全作为
 * children 传入 Client Component）；本组件自身不产生任何 DOM，只负责注册副作用
 * 并原样透传子树。
 */
'use client'

import '@oas-ui/ui'
import type { ReactNode } from 'react'

export interface OasRegistryProps {
  children?: ReactNode
}

/** 客户端注册引导：副作用注册 + 原样透传子树（零 DOM） */
export function OasRegistry({ children }: OasRegistryProps = {}): ReactNode {
  return children ?? null
}
