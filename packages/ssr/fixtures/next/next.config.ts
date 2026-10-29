import type { NextConfig } from 'next'

/**
 * fixture 只服务验收：
 * - `@oas-ui/ssr` 与 happy-dom 保持 Node 外部执行，避免把服务端 DOM shim 打进 RSC bundle；
 * - 页面走动态渲染（`export const dynamic = 'force-dynamic'`），保证每个 locale 请求都真实执行
 *   `renderToString`，不受构建期静态化/缓存影响。
 */
const nextConfig: NextConfig = {
  // Next 16 禁止在 Server Component 图里内联 `react-dom/server`；SSR 引擎保持 Node 外部执行。
  serverExternalPackages: ['@oas-ui/ssr', 'happy-dom'],
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
