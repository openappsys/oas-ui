import { NextResponse, type NextRequest } from 'next/server'

/**
 * 把 `?theme=` 与 URL 首段 locale 提升为请求头，供根 layout 设置
 * `<html data-theme>` / `lang` / `dir`。
 *
 * 为什么不在页面里把 `data-theme` 放到 `<main>`：主题 token 定义在 `:root`/`[data-theme]`，
 * body 背景与 hero 文本在 main 之外，只有把属性放到 `<html>` 才能整页一致（暗色下不出现
 * 「浅色页 + 深色卡片 + 不可读标题」）。`lang`/`dir` 同理属于文档级语义：根 layout
 * 拿不到 `[locale]` 段参数，只能由 middleware 注入请求头。
 */
export function middleware(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get('theme') === 'dark' ? 'dark' : 'light'
  const first = request.nextUrl.pathname.split('/').filter(Boolean)[0]
  const locale = first === 'ar' ? 'ar' : first === 'en-US' ? 'en' : 'zh-CN'
  const headers = new Headers(request.headers)
  headers.set('x-oas-theme', theme)
  headers.set('x-oas-locale', locale)
  headers.set('x-oas-dir', locale === 'ar' ? 'rtl' : 'ltr')
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: '/:path*',
}
