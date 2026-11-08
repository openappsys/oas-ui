import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hydrateDeclarativeShadowRoots, isDeclarativeShadowDomSupported } from './polyfill.js'

/**
 * `@oas-ui/ssr/polyfill` 单测（happy-dom）。
 *
 * happy-dom 与「不支持 DSD 的引擎」行为一致：`innerHTML` 解析不会给宿主附加声明式 shadow root，
 * `template[shadowrootmode]` 原样留在 DOM 里——正好是 polyfill 要处理的场景。
 * 原生支持分支（探测命中 → 整模块 no-op）、force 分支与 Node（无 document）分支见
 * `polyfill-native.test.ts` / `polyfill-node.test.ts`（各自需要独立的模块实例与全局桩）。
 */

/** 光 DOM 内 DSD 模板计数（shadow 内部另算） */
function leftoverTemplates(): number {
  return document.querySelectorAll('template[shadowrootmode]').length
}

describe('@oas-ui/ssr DSD polyfill', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('特性探测：happy-dom 无片段级 DSD（探测不写入页面）', () => {
    expect(isDeclarativeShadowDomSupported()).toBe(false)
    // 探测不得在 document 里留下任何节点
    expect(document.body.childNodes.length).toBe(0)
  })

  it('嵌套两层 DSD：外层先挂载、内容搬入 shadow 后内层再挂载，模板全部移除', () => {
    document.body.innerHTML = `
      <poly-outer><template shadowrootmode="open">
        <span class="outer-label">outer</span>
        <poly-inner><template shadowrootmode="open"><b class="inner-label">inner</b></template>inner-light</poly-inner>
      </template>outer-light</poly-outer>
      <poly-sibling><template shadowrootmode="open"><i class="sibling-label">sibling</i></template></poly-sibling>`

    const outer = document.body.querySelector('poly-outer')!
    expect(outer.shadowRoot).toBeNull()
    // 内层模板在外层 template.content 里：document 查询不到（它不在光 DOM 树中）
    expect(leftoverTemplates()).toBe(2)

    expect(hydrateDeclarativeShadowRoots(document.body)).toBe(true)

    expect(outer.shadowRoot).not.toBeNull()
    expect(outer.shadowRoot?.querySelector('.outer-label')?.textContent).toBe('outer')
    // 光 DOM 子树原样保留（slot 内容不被吞）
    expect(outer.textContent).toContain('outer-light')

    const inner = outer.shadowRoot?.querySelector('poly-inner')
    expect(inner?.shadowRoot).not.toBeNull()
    expect(inner?.shadowRoot?.querySelector('.inner-label')?.textContent).toBe('inner')

    const sibling = document.body.querySelector('poly-sibling')
    expect(sibling?.shadowRoot?.querySelector('.sibling-label')?.textContent).toBe('sibling')

    // 模板全部移除：光 DOM 里 0 个，嵌套 shadow 里也是 0 个
    expect(leftoverTemplates()).toBe(0)
    expect(outer.shadowRoot?.querySelectorAll('template[shadowrootmode]').length).toBe(0)
    expect(inner?.shadowRoot?.querySelectorAll('template[shadowrootmode]').length).toBe(0)
  })

  it('closed 模式：附加 closed shadow root，内容搬出光 DOM，模板移除', () => {
    document.body.innerHTML =
      '<poly-closed><template shadowrootmode="closed"><span class="closed-label">closed</span></template></poly-closed>'
    const host = document.body.querySelector('poly-closed')!

    expect(hydrateDeclarativeShadowRoots(document.body)).toBe(true)

    // closed：外部读不到 shadowRoot（按规范断言不可见，而不是断言挂载失败）
    expect(host.shadowRoot).toBeNull()
    // 内容已搬入 closed root：光 DOM 子节点清空、模板消失
    expect(host.childNodes.length).toBe(0)
    expect(leftoverTemplates()).toBe(0)
  })

  it('幂等：二次执行零命中（返回 false），shadow 内容不重复', () => {
    document.body.innerHTML =
      '<poly-idem><template shadowrootmode="open"><span class="only-once">once</span></template></poly-idem>'
    const host = document.body.querySelector('poly-idem')!

    expect(hydrateDeclarativeShadowRoots(document.body)).toBe(true)
    const root = host.shadowRoot
    expect(hydrateDeclarativeShadowRoots(document.body)).toBe(false)
    expect(host.shadowRoot).toBe(root)
    expect(host.shadowRoot?.querySelectorAll('.only-once').length).toBe(1)
  })

  it('无 DSD 模板：返回 false，不修改现有光 DOM', () => {
    document.body.innerHTML = '<div class="plain"><span>plain</span></div>'
    const before = document.body.innerHTML

    expect(hydrateDeclarativeShadowRoots(document.body)).toBe(false)
    expect(document.body.innerHTML).toBe(before)
  })

  it('非法 shadowrootmode 值：与原生解析一致，保留模板、不附加 shadow root', () => {
    document.body.innerHTML =
      '<poly-invalid><template shadowrootmode="sideways"><span>never</span></template></poly-invalid>'
    const host = document.body.querySelector('poly-invalid')!

    expect(hydrateDeclarativeShadowRoots(document.body)).toBe(false)
    expect(host.shadowRoot).toBeNull()
    expect(host.querySelector('template[shadowrootmode]')).not.toBeNull()
  })

  it('宿主已有 shadow root（组件先行 CSR 升级）：不抛错、不覆盖已有内容、清理残留模板', () => {
    const host = document.createElement('poly-csr')
    document.body.appendChild(host)
    const csrRoot = host.attachShadow({ mode: 'open' })
    csrRoot.innerHTML = '<span class="csr-label">csr</span>'
    host.innerHTML = '<template shadowrootmode="open"><span class="ssr-label">ssr</span></template>'

    expect(() => hydrateDeclarativeShadowRoots(document.body)).not.toThrow()
    expect(host.shadowRoot).toBe(csrRoot)
    expect(host.shadowRoot?.querySelector('.csr-label')?.textContent).toBe('csr')
    expect(host.shadowRoot?.querySelector('.ssr-label')).toBeNull()
    expect(leftoverTemplates()).toBe(0)
  })

  it('模块求值即自动挂载 document 内 DSD（页面脚本入口顺序契约）', async () => {
    document.body.innerHTML =
      '<poly-auto><template shadowrootmode="open"><b class="auto-label">auto</b></template></poly-auto>'
    // 取全新模块实例：静态导入的实例在文件顶部已求值过（当时 document 为空）
    vi.resetModules()
    await import('./polyfill.js')
    // 若模块求值时文档仍在解析，自动挂载挂在 DOMContentLoaded 上
    if (document.readyState === 'loading') document.dispatchEvent(new Event('DOMContentLoaded'))

    const host = document.body.querySelector('poly-auto')
    expect(host?.shadowRoot?.querySelector('.auto-label')?.textContent).toBe('auto')
    expect(leftoverTemplates()).toBe(0)
    expect(hydrateDeclarativeShadowRoots(document.body)).toBe(false)
  })
})
