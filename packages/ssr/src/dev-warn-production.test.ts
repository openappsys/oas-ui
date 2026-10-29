// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

/**
 * `devWarn` 的生产静默契约：`NODE_ENV === 'production'` 时未注册 locale 不告警，
 * 但仍确定性回退内置 `en`（行为不变、只收敛日志噪声）。
 *
 * 独立模块 + node 环境：`IS_PROD` 在模块求值时读取 `NODE_ENV`，必须在设置 production 之后
 * 才动态 import 渲染器；本文件不复用其它用例的 shim/模块状态。
 */
describe('@oas-ui/ssr devWarn 生产静默', () => {
  it('NODE_ENV=production：未注册 locale 静默回退 en，不调用 console.warn', async () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { renderToString } = await import('./index.js')
      const html = await renderToString('oas-empty', {}, '', { locale: 'xx-prod-only' })
      expect(html).toContain('No data')
      expect(html).not.toContain('暂无数据')
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
      process.env.NODE_ENV = original
    }
  })
})
