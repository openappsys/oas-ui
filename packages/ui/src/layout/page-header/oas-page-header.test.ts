import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPageHeader } from './index.js'

describe('OASPageHeader', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题与返回按钮', () => {
    const el = new OASPageHeader()
    el.setAttribute('title', '页面标题')
    el.setAttribute('back', '')
    document.body.appendChild(el)
    const sr = el.shadowRoot!
    expect(sr.querySelector('[part="title"]')!.textContent).toBe('页面标题')
    const back = sr.querySelector('[part="back"]')
    expect(back).not.toBeNull()
    // 返回按钮为 SVG chevron 图标按钮（替代文本字符 ‹）
    expect(back!.querySelector('svg')).not.toBeNull()
    expect(back!.getAttribute('aria-label')).toBe('返回')
  })

  it('点击返回派发 oas-back', () => {
    const el = new OASPageHeader()
    el.setAttribute('back', '')
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-back', () => fired++)
    ;(el.shadowRoot!.querySelector('[part="back"]') as HTMLElement).click()
    expect(fired).toBe(1)
  })

  it('extra 插槽存在', () => {
    const el = new OASPageHeader()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot[name="extra"]')).not.toBeNull()
  })

  describe('主体内容区 content（默认插槽）', () => {
    it('无内容时区块隐藏（渲染层不空占位）', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
    })

    it('有内容时区块显示', () => {
      const el = new OASPageHeader()
      el.innerHTML = '<p>正文内容</p>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(false)
    })

    it('仅注释节点视为无内容（区块隐藏）', () => {
      const el = new OASPageHeader()
      el.innerHTML = '<!-- 占位 -->'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
    })
  })

  describe('footer 插槽', () => {
    it('有内容时底部区显示', () => {
      const el = new OASPageHeader()
      el.innerHTML = '<div slot="footer">底部操作</div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(false)
    })

    it('无内容时底部区隐藏', () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(true)
    })
  })

  describe('breadcrumb 插槽', () => {
    it('有内容时头部独立行显示', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      el.innerHTML = '<oas-breadcrumb slot="breadcrumb"></oas-breadcrumb>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="breadcrumb"]')!.hidden).toBe(false)
    })

    it('无内容时头部行隐藏', () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="breadcrumb"]')!.hidden).toBe(true)
    })
  })

  describe('back-icon 插槽', () => {
    it('无插槽内容时内置 chevron 显示', () => {
      const el = new OASPageHeader()
      el.setAttribute('back', '')
      document.body.appendChild(el)
      const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="back-icon"]')
      expect(icon).not.toBeNull()
      expect(icon!.hidden).toBe(false)
    })

    it('有插槽内容时内置 chevron 隐藏', () => {
      const el = new OASPageHeader()
      el.setAttribute('back', '')
      el.innerHTML = '<oas-icon slot="back-icon" name="arrow-left"></oas-icon>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="back-icon"]')!.hidden).toBe(true)
    })

    it('插槽仅注释节点时按无内容处理（用内置 chevron）', () => {
      const el = new OASPageHeader()
      el.setAttribute('back', '')
      el.innerHTML = '<span slot="back-icon"><!-- 占位 --></span>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="back-icon"]')!.hidden).toBe(false)
    })
  })

  describe('title / subtitle 双通道（属性优先、插槽兜富内容）', () => {
    it('仅 title 属性：显示属性文本', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '页面标题')
      document.body.appendChild(el)
      const t = el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      expect(t.textContent).toBe('页面标题')
      expect(t.hidden).toBe(false)
    })

    it('title 插槽有内容时覆盖属性文案', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const t = el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      expect(t.hidden).toBe(true)
      expect(
        el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!.assignedNodes().length,
      ).toBeGreaterThan(0)
    })

    it('subtitle 插槽有内容时覆盖属性文案', () => {
      const el = new OASPageHeader()
      el.setAttribute('subtitle', '属性副标题')
      el.innerHTML = '<span slot="subtitle">插槽副标题</span>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="subtitle"]')!.hidden).toBe(true)
    })
  })

  describe('动态插槽内容（slotchange 重刷）', () => {
    it('动态添加 content 后区块显示', async () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
      const p = document.createElement('p')
      p.textContent = '动态正文'
      el.appendChild(p)
      await new Promise((r) => setTimeout(r, 0))
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(false)
    })

    it('动态移除 content 后区块隐藏', async () => {
      const el = new OASPageHeader()
      const p = document.createElement('p')
      p.textContent = '正文'
      el.appendChild(p)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(false)
      el.removeChild(p)
      await new Promise((r) => setTimeout(r, 0))
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
    })
  })

  describe('空区块 [hidden] CSS 兜底', () => {
    it('作者级 display 不覆盖 hidden（渲染层不空占位）', () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.breadcrumb\[hidden\]\s*\{[^}]*display:\s*none/)
      expect(css).toMatch(/\.content\[hidden\]\s*\{[^}]*display:\s*none/)
      expect(css).toMatch(/\.footer\[hidden\]\s*\{[^}]*display:\s*none/)
      expect(css).toMatch(/\.back-icon\[hidden\]\s*\{[^}]*display:\s*none/)
    })
  })
})
