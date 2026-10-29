import { isRequestLocale, REQUEST_LOCALES } from '../utils/locale'
import { renderDsdPage } from '../utils/dsd-worker-client'

/**
 * DSD 页面：Nitro 原样 HTML 输出（不进入 Vue 渲染/水合），保证禁 JS 可见且升级时不重建 shadow root。
 * 渲染在常驻 worker 线程执行（DOM shim 与 Vue SSR 隔离）；未知 locale 显式 400，不静默回落。
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const raw = typeof query.locale === 'string' && query.locale ? query.locale : 'zh-CN'
  if (!isRequestLocale(raw)) {
    setResponseStatus(event, 400)
    setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
    return `[oas-ui/nuxt-fixture] 未知 locale「${raw}」；可用：${REQUEST_LOCALES.join(' / ')}`
  }
  const theme = query.theme === 'dark' ? 'dark' : 'light'
  const html = await renderDsdPage({ requestLocale: raw, theme })
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'no-store')
  return html
})
