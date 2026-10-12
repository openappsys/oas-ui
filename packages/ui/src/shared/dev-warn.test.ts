import { describe, it, expect, vi, afterEach } from 'vitest'

describe('shared/dev-warn', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    delete (globalThis as { __OAS_DEV_WARN_OFF__?: boolean }).__OAS_DEV_WARN_OFF__
    vi.resetModules()
  })

  it('非生产环境放行（当前测试环境 NODE_ENV≠production）', async () => {
    const { devWarn } = await import('./dev-warn.js')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    devWarn('[oas] 测试告警')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![0]).toBe('[oas] 测试告警')
  })

  it('NODE_ENV=production 静默', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const { devWarn } = await import('./dev-warn.js')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    devWarn('[oas] 不应出现')
    expect(spy).not.toHaveBeenCalled()
  })

  it('__OAS_DEV_WARN_OFF__ 调试期临时禁用', async () => {
    const { devWarn } = await import('./dev-warn.js')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(globalThis as { __OAS_DEV_WARN_OFF__?: boolean }).__OAS_DEV_WARN_OFF__ = true
    devWarn('[oas] 不应出现')
    expect(spy).not.toHaveBeenCalled()
  })
})
