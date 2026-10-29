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
  // middleware 把 ?theme= 提升为请求头；属性必须落到 <html>，body/hero 才有暗色 token
  const theme = (await headers()).get('x-oas-theme') === 'dark' ? 'dark' : 'light'
  return (
    <html lang="en" data-theme={theme}>
      <body>
        {children}
        <OasClientBoot />
      </body>
    </html>
  )
}
