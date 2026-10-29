import { NextResponse, type NextRequest } from 'next/server'

/**
 * 把 `?theme=` 提升为请求头，供根 layout 在 `<html data-theme>` 上设置主题。
 *
 * 为什么不在页面里把 `data-theme` 放到 `<main>`：主题 token 定义在 `:root`/`[data-theme]`，
 * body 背景与 hero 文本在 main 之外，只有把属性放到 `<html>` 才能整页一致（暗色下不出现
 * 「浅色页 + 深色卡片 + 不可读标题」）。
 */
export function middleware(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get('theme') === 'dark' ? 'dark' : 'light'
  const headers = new Headers(request.headers)
  headers.set('x-oas-theme', theme)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: '/:path*',
}
