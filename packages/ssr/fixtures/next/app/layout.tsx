import type { ReactNode } from 'react'
import { headers } from 'next/headers'
// 设计 token（--oas-*）全局可用；DSD 快照在禁 JS 下同样依赖这些变量呈现颜色。
import '@oas-ui/theme'
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
        {children}
        <OasClientBoot />
      </body>
    </html>
  )
}
