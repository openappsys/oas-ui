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

describe('OASLayout 侧栏槽与 Sider 折叠（模板实测缺陷回归）', () => {
  it('#5 sider slot 允许任意元素（非仅 oas-sider）：data-has-sider=true', () => {
    const layout = new OASLayout()
    layout.innerHTML = `<div slot="sider">自定义侧栏</div><oas-content>内容</oas-content>`
    document.body.appendChild(layout)
    expect(layout.shadowRoot!.querySelector('[part="root"]')!.getAttribute('data-has-sider')).toBe('true')
    expect(layout.shadowRoot!.querySelector('[part="root"]')!.classList.contains('has-sider')).toBe(true)
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
    inner.dispatchEvent(new CustomEvent('oas-collapse', { bubbles: true, detail: { collapsed: true } }))
    expect(sider.hasAttribute('collapsed'), '折叠后 sider 应同步 collapsed').toBe(true)
    inner.dispatchEvent(new CustomEvent('oas-collapse', { bubbles: true, detail: { collapsed: false } }))
    expect(sider.hasAttribute('collapsed'), '展开后 sider 应移除 collapsed').toBe(false)
  })
})
