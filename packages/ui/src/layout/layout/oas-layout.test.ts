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
