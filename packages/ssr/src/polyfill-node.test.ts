import { describe, it, expect, vi, afterEach } from 'vitest'

/**
 * Node / 纯 SSR 环境：没有全局 `document` 时导入本模块必须安全（模块求值即自动执行的代码路径
 * 全部走 typeof document 守卫），探测结果为 false，不抛错。
 */
describe('@oas-ui/ssr DSD polyfill（无 document 环境）', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('无 document（Node）导入不抛错，探测返回 false', async () => {
    vi.stubGlobal('document', undefined)
    vi.resetModules()

    const mod = await import('./polyfill.js')
    expect(mod.isDeclarativeShadowDomSupported()).toBe(false)
    expect(typeof mod.hydrateDeclarativeShadowRoots).toBe('function')
    // 误调用（不传 root，且环境无 document）也必须安全返回 false，而不是 ReferenceError
    expect(mod.hydrateDeclarativeShadowRoots()).toBe(false)
  })
})
