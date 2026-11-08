import { describe, it, expect, vi, afterEach } from 'vitest'

/**
 * 原生支持分支：模拟「引擎从片段解析即附加声明式 shadow root」。
 * 该分支只在支持解析期 DSD 的引擎上成立（当前 Chromium / Firefox / WebKit 的片段解析均不附加，
 * 见 `polyfill.test.ts`），故这里用假 document 桩驱动探测，断言「探测命中 → 整模块 no-op」
 * 与「force 仍可强制挂载」两条契约。
 */

/** 假 document：`setHTMLUnsafe` 调用时若含 shadowrootmode 即给元素挂上 shadowRoot */
function fakeNativeDocument(): Document {
  return {
    readyState: 'complete',
    createElement: () => {
      const el = {
        shadowRoot: null as unknown,
        setHTMLUnsafe(html: string) {
          if (html.includes('shadowrootmode')) el.shadowRoot = { mode: 'open' }
        },
      }
      return el
    },
  } as unknown as Document
}

describe('@oas-ui/ssr DSD polyfill（原生支持分支）', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('原生支持：探测命中并缓存，hydrate 直接返回 false 且不触碰模板', async () => {
    const realDocument = document
    vi.stubGlobal('document', fakeNativeDocument())
    vi.resetModules()
    const mod = await import('./polyfill.js')

    expect(mod.isDeclarativeShadowDomSupported()).toBe(true)
    // 二次调用命中缓存（探测器不再重建）
    expect(mod.isDeclarativeShadowDomSupported()).toBe(true)

    vi.stubGlobal('document', realDocument)
    realDocument.body.innerHTML =
      '<poly-native><template shadowrootmode="open"><b class="native-label">native</b></template></poly-native>'
    const host = realDocument.body.querySelector('poly-native')!

    expect(mod.hydrateDeclarativeShadowRoots(host)).toBe(false)
    expect(host.shadowRoot).toBeNull()
    expect(host.querySelector('template[shadowrootmode]')).not.toBeNull()
  })

  it('force：原生支持的引擎上也强制挂载运行期注入（innerHTML）的 DSD 模板', async () => {
    const realDocument = document
    vi.stubGlobal('document', fakeNativeDocument())
    vi.resetModules()
    const mod = await import('./polyfill.js')
    vi.stubGlobal('document', realDocument)

    realDocument.body.innerHTML =
      '<poly-forced><template shadowrootmode="open"><b class="forced-label">forced</b></template></poly-forced>'
    const host = realDocument.body.querySelector('poly-forced')!
    // 探测为 true 时普通调用是 no-op（证明 force 分支确有必要）
    expect(mod.hydrateDeclarativeShadowRoots(host)).toBe(false)
    expect(mod.hydrateDeclarativeShadowRoots(host, { force: true })).toBe(true)
    expect(host.shadowRoot?.querySelector('.forced-label')?.textContent).toBe('forced')
    expect(realDocument.querySelectorAll('template[shadowrootmode]').length).toBe(0)
  })
})
