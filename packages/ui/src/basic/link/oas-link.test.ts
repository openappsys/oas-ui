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
})
