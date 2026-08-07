import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASIcon } from './index.js'

function mount(attrs: Record<string, string> = {}): OASIcon {
  const el = new OASIcon()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function svg(el: OASIcon): SVGSVGElement | null {
  return el.shadowRoot!.querySelector('svg')
}

describe('OASIcon', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无 name 时渲染空 shadow（不报错）', () => {
    const el = mount()
    expect(el.shadowRoot!.childNodes.length).toBe(0)
  })

  it('未知 name 渲染空 shadow（空态兜底）', () => {
    const el = mount({ name: 'not-exist' })
    expect(el.shadowRoot!.childNodes.length).toBe(0)
  })

  it('按 name 渲染对应图标 SVG', () => {
    const el = mount({ name: 'check' })
    expect(svg(el)).not.toBeNull()
    expect(svg(el)!.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(el.shadowRoot!.querySelector('path')?.getAttribute('d')).toContain('M3.5 8.5')
  })

  it('size 属性控制宽度/高度，默认 1em', () => {
    const el = mount({ name: 'check' })
    expect(svg(el)!.getAttribute('width')).toBe('1em')
    expect(svg(el)!.getAttribute('height')).toBe('1em')
    el.setAttribute('size', '24')
    const s = svg(el)!
    expect(s.getAttribute('width')).toBe('24')
    expect(s.getAttribute('height')).toBe('24')
  })

  it('color 通过 style.color 应用，默认 currentColor', () => {
    const el = mount({ name: 'check' })
    expect(el.style.color).toBe('')
    el.setAttribute('color', 'red')
    expect(el.style.color).toBe('red')
  })

  it('默认 aria-hidden，设置 label 时 role=img 且 aria-label 同步', () => {
    const el = mount({ name: 'check' })
    expect(el.getAttribute('aria-hidden')).toBe('true')
    el.setAttribute('label', '对勾')
    expect(el.getAttribute('role')).toBe('img')
    expect(el.getAttribute('aria-label')).toBe('对勾')
  })

  it('属性变化增量更新：切换 name 不重建宿主引用', () => {
    const el = mount({ name: 'check' })
    const host = el.shadowRoot!.querySelector('svg')
    el.setAttribute('name', 'close')
    expect(el.shadowRoot!.querySelector('svg')).toBe(host)
    expect(el.shadowRoot!.querySelector('path')?.getAttribute('d')).toContain('M4 4 L12 12')
  })
})
