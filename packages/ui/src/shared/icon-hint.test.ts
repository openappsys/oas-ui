import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupIcon, registerIcon } from '@oas-ui/icons/runtime'
import { hintUnresolvedIcon } from './icon-hint.js'

/** 等一帧（helper 用 rAF，happy-dom 下退化为 setTimeout） */
const frame = () => new Promise((r) => setTimeout(r, 30))

describe('图标名未解析 dev 提示（icon opt-in 迁移辅助）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('未解析名 → 下一帧 warn 一次（同名去重）', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    hintUnresolvedIcon('no-such-icon-aaa')
    hintUnresolvedIcon('no-such-icon-aaa')
    await frame()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(String(spy.mock.calls[0]![0])).toContain('no-such-icon-aaa')
  })

  it('已注册的内置名 → 不 warn', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(lookupIcon('check'), '单测环境已注册内置集').toBeDefined()
    hintUnresolvedIcon('check')
    await frame()
    expect(spy).not.toHaveBeenCalled()
  })

  it('晚注册（下一帧前 registerIcon）→ 不误报', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    hintUnresolvedIcon('late-reg-icon-bbb')
    registerIcon('late-reg-icon-bbb', '<path d="M0 0"/>') // 模拟 onMounted 里的晚注册
    await frame()
    expect(spy).not.toHaveBeenCalled()
  })

  it('生产（NODE_ENV=production）→ 静默', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const orig = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      vi.resetModules()
      const mod = await import('./icon-hint.js')
      mod.hintUnresolvedIcon('no-such-prod-ccc')
      await frame()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      process.env.NODE_ENV = orig
      vi.resetModules()
    }
  })
})
