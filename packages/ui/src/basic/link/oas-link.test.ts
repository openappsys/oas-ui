import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASLink } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '链接'): OASLink {
  const el = new OASLink()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function link(el: OASLink): HTMLAnchorElement {
  return el.shadowRoot!.querySelector('a')!
}

describe('OASLink', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 a 标签，href 透传，含 slot', async () => {
    const el = mount({ href: 'https://example.com' }, '文档')
    const a = link(el)
    await Promise.resolve()
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('https://example.com')
    expect(el.textContent).toContain('文档')
  })

  it('type 映射 class（default/primary/danger）', () => {
    const el = mount({ href: '#', type: 'primary' })
    expect(link(el).classList.contains('primary')).toBe(true)
  })

  it('underline 属性控制下划线', () => {
    const noUnderline = mount({ href: '#', underline: 'false' })
    expect(link(noUnderline).classList.contains('no-underline')).toBe(true)
    noUnderline.remove()
    const underline = mount({ href: '#' })
    expect(link(underline).classList.contains('no-underline')).toBe(false)
  })

  it('disabled：aria-disabled、点击不派发 oas-click', () => {
    const el = mount({ href: '#', disabled: '' })
    const a = link(el)
    expect(a.getAttribute('aria-disabled')).toBe('true')
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    a.click()
    expect(fired).toBe(false)
  })

  it('点击派发 oas-click（bubbles + composed）', () => {
    const el = mount({ href: '#' })
    let detail: unknown
    el.addEventListener('oas-click', (e: Event) => (detail = e))
    link(el).click()
    expect((detail as CustomEvent).bubbles).toBe(true)
    expect((detail as CustomEvent).composed).toBe(true)
  })

  it('属性变化增量更新：切换 type 不重建引用', () => {
    const el = mount({ href: '#', type: 'primary' })
    const a = link(el)
    el.setAttribute('type', 'danger')
    expect(link(el)).toBe(a)
    expect(a.classList.contains('danger')).toBe(true)
  })

  describe('color 属性（统一协议：11 预设名→token / 任意 CSS 色值直注入）', () => {
    it('color 进入 observedAttributes', () => {
      expect(OASLink.observedAttributes).toContain('color')
    })

    it('预设名映射 --oas-preset-*-text 达标文字 token（非本色）', () => {
      const el = mount({ href: '#', color: 'geekblue' })
      expect(link(el).style.getPropertyValue('--oas-link-color')).toBe(
        'var(--oas-preset-geekblue-text)',
      )
      const gold = mount({ href: '#', color: 'gold' })
      expect(link(gold).style.getPropertyValue('--oas-link-color')).toBe(
        'var(--oas-preset-gold-text)',
      )
    })

    it('11 预设名全量映射 -text token', () => {
      const presets = [
        'magenta',
        'red',
        'volcano',
        'orange',
        'gold',
        'lime',
        'green',
        'cyan',
        'blue',
        'geekblue',
        'purple',
      ]
      for (const name of presets) {
        const el = mount({ href: '#', color: name })
        expect(link(el).style.getPropertyValue('--oas-link-color'), `preset=${name}`).toBe(
          `var(--oas-preset-${name}-text)`,
        )
        el.remove()
      }
    })

    it('任意 CSS 色值直接注入（#hex）', () => {
      const el = mount({ href: '#', color: '#0e7490' })
      expect(link(el).style.getPropertyValue('--oas-link-color')).toBe('#0e7490')
    })

    it('color 优先于 type 语义色（has-color class 胜出）', () => {
      const el = mount({ href: '#', type: 'primary', color: 'purple' })
      expect(link(el).classList.contains('has-color')).toBe(true)
    })

    it('type 语义色改指 -text 达标变体（存量 3.3:1 隐患修复）', () => {
      const el = mount({ href: '#', type: 'success' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/a\.success\s*\{[^}]*--oas-color-success-text/)
      expect(css).toMatch(/a\.warning\s*\{[^}]*--oas-color-warning-text/)
      expect(css).toMatch(/a\.danger\s*\{[^}]*--oas-color-danger-text/)
    })

    it('动态切换与移除即时生效', () => {
      const el = mount({ href: '#', color: 'red' })
      el.setAttribute('color', '#00b96b')
      expect(link(el).style.getPropertyValue('--oas-link-color')).toBe('#00b96b')
      el.removeAttribute('color')
      expect(link(el).style.getPropertyValue('--oas-link-color')).toBe('')
      expect(link(el).classList.contains('has-color')).toBe(false)
    })
  })
})
