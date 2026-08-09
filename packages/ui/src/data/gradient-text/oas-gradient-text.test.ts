import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASGradientText } from './index.js'

function mount(attrs: Record<string, string> = {}): OASGradientText {
  const el = new OASGradientText()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = '渐变文字'
  document.body.appendChild(el)
  return el
}

function textEl(el: OASGradientText): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
}

describe('OASGradientText', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认：token 双色渐变 + to right + 透明文字', () => {
    const el = mount()
    const node = textEl(el)
    expect(node.style.backgroundImage).toContain('linear-gradient')
    expect(node.style.backgroundImage).toContain('to right')
    expect(node.style.backgroundImage).toContain('var(--oas-color-primary)')
    expect(node.style.color).toBe('transparent')
  })

  it('gradient JSON 色标驱动渐变', () => {
    const el = mount({ gradient: '["#f00", "#0f0", "#00f"]' })
    const bg = textEl(el).style.backgroundImage
    expect(bg).toContain('#f00')
    expect(bg).toContain('#0f0')
    expect(bg).toContain('#00f')
    expect(bg).toContain('to right')
  })

  it('direction 控制渐变方向', () => {
    const el = mount({ gradient: '["#f00", "#00f"]', direction: 'to bottom' })
    expect(textEl(el).style.backgroundImage).toContain('to bottom')
  })

  it('direction 为空回退 to right', () => {
    const el = mount({ gradient: '["#f00", "#00f"]', direction: '  ' })
    expect(textEl(el).style.backgroundImage).toContain('to right')
  })

  it('非法 gradient 回退默认 token 渐变', () => {
    const el = mount({ gradient: 'not-json' })
    expect(textEl(el).style.backgroundImage).toContain('var(--oas-color-primary)')
  })

  it('单个色标渲染为纯色', () => {
    const el = mount({ gradient: '["#f00"]' })
    expect(textEl(el).style.backgroundColor).toBe('#f00')
    expect(textEl(el).style.backgroundImage).toBe('none')
  })

  it('非法色值条目被过滤（注入拦截），全非法时回退默认', () => {
    const el = mount({ gradient: '["#f00", "x;background:red"]' })
    const node = textEl(el)
    expect(node.style.backgroundColor).toBe('#f00') // 合法色保留为纯色
    expect(node.getAttribute('style')).not.toContain('background:red') // 注入被拦截
    const el2 = mount({ gradient: '["x;background:red"]' })
    expect(textEl(el2).style.backgroundImage).toContain('var(--oas-color-primary)')
  })

  it('应用 background-clip:text 且保留槽内文字', () => {
    const el = mount()
    const node = textEl(el)
    expect(node.getAttribute('style')).toContain('-webkit-background-clip: text')
    expect(node.style.backgroundClip).toBe('text')
    expect(el.textContent).toContain('渐变文字')
  })
})
