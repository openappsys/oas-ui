import { describe, expect, it, vi } from 'vitest'

/**
 * 图标运行时 opt-in 契约（此前 vitest.setup 全局注册，导致「未注册即失效」这一核心契约无测试覆盖）。
 *
 * 做法：清掉 globalThis 单例键 + `vi.resetModules()` 后动态载入全新 runtime 实例（空内置集），
 * 断言内置名未注册时解析为 undefined；注册自定义 / 注册内置集后可得。
 * 本文件在独立环境运行（vitest 默认逐文件隔离），清键不影响其它测试。
 */
const KEY = '__oas_icon_runtime_v1__'

describe('图标运行时 opt-in 契约', () => {
  it('未注册内置集时，内置名 lookupIcon 为 undefined（静默空态）；注册后可得', async () => {
    delete (globalThis as Record<string, unknown>)[KEY]
    vi.resetModules()

    const rt = await import('./runtime.js')
    // 未注册：内置名不可解析 → 组件静默空态（迁移后「按需未 import register」的行为）
    expect(rt.lookupIcon('check')).toBeUndefined()
    expect(rt.hasIcon('check')).toBe(false)

    // 自定义注册即可用（不经内置集）
    rt.registerIcon('my-own', '<path d="M0 0"/>')
    expect(rt.lookupIcon('my-own')).toBe('<path d="M0 0"/>')

    // 注册内置全量集后，内置名可解析
    const { iconRegistry } = await import('./registry.js')
    rt.registerBuiltinIcons(iconRegistry)
    expect(rt.lookupIcon('check')).toBeDefined()
    expect(rt.hasIcon('check')).toBe(true)
  })
})
