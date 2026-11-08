import type { ReactNode } from 'react'
import { headers } from 'next/headers'
// 设计 token（--oas-*）全局可用；DSD 快照在禁 JS 下同样依赖这些变量呈现颜色。
import '@oas-ui/theme'
import { OasRegistry } from '@oas-ui/next'
import { OasClientBoot } from './oas-client-boot'
import './globals.css'

export const metadata = {
  title: 'OAS-UI · Next.js fixture',
  description: 'Declarative Shadow DOM + hydration fixture for @oas-ui/ssr in Next.js App Router',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // middleware 把 ?theme= 与 URL locale 提升为请求头：
  // theme 必须落到 <html>，body/hero 才有暗色 token；lang/dir 属于文档级语义。
  const requestHeaders = await headers()
  const theme = requestHeaders.get('x-oas-theme') === 'dark' ? 'dark' : 'light'
  const lang = requestHeaders.get('x-oas-locale') ?? 'zh-CN'
  const dir = requestHeaders.get('x-oas-dir') === 'rtl' ? 'rtl' : 'ltr'
  return (
    <html lang={lang} dir={dir} data-theme={theme}>
      <body>
        {/* 注意：DSD polyfill 不在本树里——Next App Router 会把 layout 渲染的 head 内容排在
            框架 chunk 脚本（Turbopack 一律 async）之后，无法保证「polyfill 先于组件注册」。
            fixture 由 server.mjs 在文档响应的 <head> 里注入经典同步脚本（见该文件与 README）。 */}
        {/* 真实使用 OasRegistry（A1 修复后 SSR 预渲染安全）：客户端模块求值期
            守卫动态导入 @oas-ui/ui 完成全局注册，服务端守卫跳过 */}
        <OasRegistry>{children}</OasRegistry>
        <OasClientBoot />
      </body>
    </html>
  )
}
