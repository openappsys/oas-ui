import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASLayout, OASHeader, OASSider, OASContent, OASFooter } from './index.js'

describe('OASLayout', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sider 存在时渲染侧边布局', () => {
    const layout = new OASLayout()
    layout.innerHTML = `
      <oas-header>顶部</oas-header>
      <oas-sider>侧边</oas-sider>
      <oas-content>内容</oas-content>
      <oas-footer>底部</oas-footer>
    `
    document.body.appendChild(layout)
    expect(layout.shadowRoot!.querySelector('[part="root"]')).not.toBeNull()
    expect(layout.shadowRoot!.querySelector('[part="sider"]')).not.toBeNull()
  })

  it('注册四个子组件', () => {
    expect(customElements.get('oas-header')).not.toBeNull()
    expect(customElements.get('oas-sider')).not.toBeNull()
    expect(customElements.get('oas-content')).not.toBeNull()
    expect(customElements.get('oas-footer')).not.toBeNull()
  })
})

describe('OASLayout 侧栏槽与 Sider 折叠（实测缺陷回归）', () => {
  it('#5 sider slot 允许任意元素（非仅 oas-sider）：data-has-sider=true', () => {
    const layout = new OASLayout()
    layout.innerHTML = `<div slot="sider">自定义侧栏</div><oas-content>内容</oas-content>`
    document.body.appendChild(layout)
    expect(layout.shadowRoot!.querySelector('[part="root"]')!.getAttribute('data-has-sider')).toBe(
      'true',
    )
    expect(layout.shadowRoot!.querySelector('[part="root"]')!.classList.contains('has-sider')).toBe(
      true,
    )
  })

  it('#7 sider 宽度走 CSS 变量（--oas-sider-width / collapsed）', () => {
    const sider = new OASSider()
    sider.style.setProperty('--oas-sider-width', '300px')
    document.body.appendChild(sider)
    const stl = sider.shadowRoot!.querySelector('style')!.textContent!
    expect(stl).toMatch(/--oas-sider-width/)
    expect(stl).toMatch(/--oas-sider-collapsed-width/)
    expect(stl).toMatch(/width:\s*var\(--oas-sider-width,\s*200px\)/)
    expect(stl).toMatch(/--oas-sider-collapsed-width,\s*64px/)
    // collapsed 态用 collapsed 宽度变量
    expect(stl).toMatch(/:host\(\[collapsed\]\)\s*\{[^}]*var\(--oas-sider-collapsed-width/)
  })

  it('#6 sider 监听内部 sidebar 折叠事件：折叠时同步自身 collapsed', () => {
    const sider = new OASSider()
    const inner = document.createElement('oas-sidebar')
    sider.appendChild(inner)
    document.body.appendChild(sider)
    expect(sider.hasAttribute('collapsed')).toBe(false)
    // 派发折叠事件（模拟 oas-sidebar 的 oas-collapse）
    inner.dispatchEvent(
      new CustomEvent('oas-collapse', { bubbles: true, detail: { collapsed: true } }),
    )
    expect(sider.hasAttribute('collapsed'), '折叠后 sider 应同步 collapsed').toBe(true)
    inner.dispatchEvent(
      new CustomEvent('oas-collapse', { bubbles: true, detail: { collapsed: false } }),
    )
    expect(sider.hasAttribute('collapsed'), '展开后 sider 应移除 collapsed').toBe(false)
  })
})

describe('OASLayout 视口锁定模式（实测缺陷回归）', () => {
  it('默认整页滚动模型不变：min-height 100%、无高度锁定', () => {
    const layout = new OASLayout()
    document.body.appendChild(layout)
    const stl = layout.shadowRoot!.querySelector('style')!.textContent!
    expect(stl).toMatch(/:host\s*\{[^}]*min-height:\s*100%/)
    // 无属性时不应出现视口锁定的 :host([viewport]) 高度规则应用到宿主默认样式
    expect(stl).toMatch(/:host\(\[viewport\]\)/)
    expect(stl, '默认宿主样式不得有高度锁定').not.toMatch(/:host\s*\{[^}]*[^\-]height:\s*[^-]/)
  })

  it('viewport 属性：高度锁定视口（dvh 优先 vh 级联回退）+ 开口变量 --oas-layout-height', () => {
    const layout = new OASLayout()
    document.body.appendChild(layout)
    const stl = layout.shadowRoot!.querySelector('style')!.textContent!
    expect(stl).toMatch(
      /:host\(\[viewport\]\)\s*\{[^}]*height:\s*var\(--oas-layout-height,\s*100dvh\)/,
    )
    expect(stl, 'dvh 不支持时需 100vh 级联回退').toMatch(/height:\s*100vh/)
  })

  it('viewport 模式下 sider/content 各自独立滚动 + main 不被内容撑高', () => {
    const layout = new OASLayout()
    document.body.appendChild(layout)
    const stl = layout.shadowRoot!.querySelector('style')!.textContent!
    // 高度链：struct 与 main 需 min-height: 0 才能约束 flex 子项各自滚
    expect(stl, 'struct 需 viewport 态类钩子').toMatch(/\.struct\.is-viewport/)
    expect(stl).toMatch(/\.sider-part/)
    expect(stl).toMatch(/\.content-part/)
    expect(stl).toMatch(/\.struct\.is-viewport\s+\.sider-part\s*\{[^}]*overflow-y:\s*auto/)
    expect(stl).toMatch(/\.struct\.is-viewport\s+\.content-part\s*\{[^}]*overflow-y:\s*auto/)
    expect(stl).toMatch(/\.struct\.is-viewport\s+\.main\s*\{[^}]*min-height:\s*0/)
  })

  it('viewport 进 observedAttributes（API 扫描与文档一致性）', () => {
    expect(OASLayout.observedAttributes).toContain('viewport')
  })
})

describe('OASSider 内嵌 sidebar 宽度对齐（实测缺陷回归）', () => {
  it('内嵌 oas-sidebar 填满轨道：::slotted width 100%', () => {
    const sider = new OASSider()
    document.body.appendChild(sider)
    const stl = sider.shadowRoot!.querySelector('style')!.textContent!
    expect(stl).toMatch(/::slotted\(oas-sidebar\)\s*\{[^}]*width:\s*100%/)
  })

  it('内嵌 oas-sidebar 时轨道去 padding（sidebar 自带内边距体系，避免 200-32 与 220 双重错位）', async () => {
    const sider = new OASSider()
    document.body.appendChild(sider)
    const stl = sider.shadowRoot!.querySelector('style')!.textContent!
    expect(stl).toMatch(/:host\(\[data-embed\]\)\s*\{[^}]*padding:\s*0/)
    // 行为：内嵌 sidebar 时 data-embed 置位、移除后清除（MutationObserver 异步同步，等 flush）
    const sb = document.createElement('oas-sidebar')
    sider.appendChild(sb)
    await new Promise((r) => setTimeout(r))
    expect(sider.hasAttribute('data-embed'), '内嵌 sidebar 应置 data-embed').toBe(true)
    sb.remove()
    await new Promise((r) => setTimeout(r))
    expect(sider.hasAttribute('data-embed'), '移除 sidebar 后应清 data-embed').toBe(false)
  })

  it('内嵌折叠对齐：collapsed 态 slotted sidebar 不被 64px 轨道挤压出横向滚动', () => {
    const sider = new OASSider()
    document.body.appendChild(sider)
    const stl = sider.shadowRoot!.querySelector('style')!.textContent!
    expect(stl).toMatch(/::slotted\(oas-sidebar\)\s*\{[^}]*min-width:\s*0/)
  })
})
