import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASQRCode } from './index.js'

function mount(attrs: Record<string, string> = {}): OASQRCode {
  const el = new OASQRCode()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function svgOf(el: OASQRCode): SVGSVGElement {
  return el.shadowRoot!.querySelector('svg')!
}

function wrapperOf(el: OASQRCode): HTMLElement {
  return el.shadowRoot!.querySelector('[part="wrapper"]')!
}

describe('OASQRCode', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染 SVG，viewBox 与版本匹配，含 path 图形', () => {
    const el = mount({ value: 'HELLO WORLD' })
    const svg = svgOf(el)
    expect(svg.getAttribute('viewBox')).toBe('0 0 21 21')
    expect(svg.getAttribute('width')).toBe('128')
    expect(svg.getAttribute('height')).toBe('128')
    expect(svg.querySelector('path')).not.toBeNull()
  })

  it('size 属性控制宽高', () => {
    const el = mount({ value: 'hi', size: '200' })
    const svg = svgOf(el)
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('200')
  })

  it('空 value 显示空态提示，不渲染二维码', () => {
    const el = mount({})
    const empty = el.shadowRoot!.querySelector('[part="empty"]')!
    expect(empty.hasAttribute('hidden')).toBe(false)
    expect(empty.textContent).toContain('暂无内容')
    expect(svgOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('超长 value 显示超长提示', () => {
    const el = mount({ value: 'x'.repeat(400) })
    const err = el.shadowRoot!.querySelector('[part="error"]')!
    expect(err.hasAttribute('hidden')).toBe(false)
    expect(err.textContent).toContain('内容过长')
    expect(svgOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('error-correction 为 m/q/h 时归一为 l 正常渲染（不报错）', () => {
    for (const ec of ['m', 'q', 'h']) {
      const el = mount({ value: 'hi', 'error-correction': ec })
      expect(svgOf(el).querySelector('path')).not.toBeNull()
      el.remove()
    }
  })

  it('aria-label 默认走 i18n，组件 aria-label 属性优先', () => {
    const el = mount({ value: 'hi' })
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('二维码')
    el.setAttribute('aria-label', '商品链接二维码')
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('商品链接二维码')
  })

  it('role="img" 语义', () => {
    const el = mount({ value: 'hi' })
    expect(wrapperOf(el).getAttribute('role')).toBe('img')
  })

  it('locale：空态文案随 setLocale 切换', () => {
    const el = mount({})
    setLocale(en)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('No content')
    setLocale('zh-CN')
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('暂无内容')
  })

  it('value 变化增量更新（不重建 svg 节点）', () => {
    const el = mount({ value: 'a' })
    const svg = svgOf(el)
    el.setAttribute('value', 'bbbbbbbbbb')
    expect(svgOf(el)).toBe(svg)
    expect(svg.querySelector('path')).not.toBeNull()
  })
})
