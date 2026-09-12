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

function styleText(el: OASGradientText): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASGradientText', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认：token 双色渐变 + to right + clipped 类', () => {
    const el = mount()
    const node = textEl(el)
    expect(node.style.backgroundImage).toContain('linear-gradient')
    expect(node.style.backgroundImage).toContain('to right')
    expect(node.style.backgroundImage).toContain('var(--oas-color-primary)')
    expect(node.classList.contains('clipped')).toBe(true)
    // 方向经内联自定义变量穿透 scoped CSS
    expect(node.style.getPropertyValue('--oas-gradient-text-dir')).toBe('to right')
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
    expect(textEl(el).style.getPropertyValue('--oas-gradient-text-dir')).toBe('to bottom')
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

  it('type 语义色渐变：data-type 驱动 scoped CSS（token 派生双色，含 info 复用 info-text）', () => {
    const el = mount({ type: 'success' })
    const node = textEl(el)
    expect(node.getAttribute('data-type')).toBe('success')
    // 静态 type 渐变完全走 scoped CSS，内联不重复声明
    expect(node.style.backgroundImage).toBe('')
    const css = styleText(el)
    expect(css).toContain("[data-type='success']")
    expect(css).toContain('var(--oas-color-success)')
    expect(css).toContain('color-mix')
    const elInfo = mount({ type: 'info' })
    expect(textEl(elInfo).getAttribute('data-type')).toBe('info')
    expect(styleText(elInfo)).toContain('var(--oas-color-info-text)')
  })

  it('gradient 显式给定优先于 type；非法 type 回退默认 token 渐变', () => {
    const el = mount({ type: 'success', gradient: '["#f00", "#00f"]' })
    const node = textEl(el)
    const bg = node.style.backgroundImage
    expect(bg).toContain('#f00')
    expect(bg).not.toContain('--oas-color-success')
    expect(node.hasAttribute('data-type')).toBe(false)
    const elBad = mount({ type: 'nope' })
    expect(textEl(elBad).style.backgroundImage).toContain('var(--oas-color-primary)')
    expect(textEl(elBad).hasAttribute('data-type')).toBe(false)
  })

  it('animated 应用流动动画类 + 回文渐变（双色也回文，首尾同色无缝循环）', () => {
    const el = mount({ gradient: '["#f00", "#00f"]', animated: '' })
    const node = textEl(el)
    expect(node.classList.contains('animated')).toBe(true)
    expect(node.style.backgroundImage).toBe('linear-gradient(to right, #f00, #00f, #f00)')
  })

  it('animated + 默认渐变：回文 token 双色', () => {
    const el = mount({ animated: '' })
    const bg = textEl(el).style.backgroundImage
    expect(textEl(el).classList.contains('animated')).toBe(true)
    expect(bg).toContain('var(--oas-color-primary-hover)')
    expect(bg.startsWith('linear-gradient')).toBe(true)
  })

  it('animated + type：动画类与 data-type 并存（内联回文覆盖在浏览器生效，happy-dom 丢弃 color-mix 内联属已知限制）', () => {
    const el = mount({ type: 'danger', animated: '' })
    const node = textEl(el)
    expect(node.classList.contains('animated')).toBe(true)
    expect(node.getAttribute('data-type')).toBe('danger')
  })

  it('animated 样式含 keyframes 与 prefers-reduced-motion 降级', () => {
    const el = mount({ animated: '' })
    const style = styleText(el)
    expect(style).toContain('@keyframes oas-gradient-text-flow')
    expect(style).toContain('prefers-reduced-motion')
  })

  it('@supports 回退：clip/透明色只写在 supports 块内，inline 不设透明色（老浏览器文字可见）', () => {
    const el = mount()
    const node = textEl(el)
    expect(node.style.color).not.toBe('transparent')
    expect(node.getAttribute('style')).not.toContain('background-clip')
    const style = styleText(el)
    expect(style).toContain('@supports')
    expect(style).toContain('background-clip: text')
  })

  it('单枚色标 + animated：保留纯色通道（动画无流动意义，类名不打）', () => {
    const el = mount({ gradient: '["#f00"]', animated: '' })
    const node = textEl(el)
    expect(node.classList.contains('animated')).toBe(false)
    expect(node.style.backgroundColor).toBe('#f00')
  })

  it('保留槽内文字', () => {
    const el = mount()
    expect(el.textContent).toContain('渐变文字')
  })

  it('stroke：合法宽度打 stroked 类 + 副层镜像槽文本 + 宽度/颜色变量落内联自定义属性', () => {
    const el = mount({ stroke: '2px' })
    expect(el.classList.contains('stroked')).toBe(true)
    expect(el.style.getPropertyValue('--oas-gradient-text-stroke-w')).toBe('2px')
    // 缺省描边色走 text-primary token（随主题亮暗自动切换）
    expect(el.style.getPropertyValue('--oas-gradient-text-stroke-c')).toBe('var(--oas-color-text-primary)')
    const layer = el.shadowRoot!.querySelector<HTMLElement>('[part="stroke"]')!
    expect(layer).not.toBeNull()
    expect(layer.textContent).toBe('渐变文字')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
  })

  it('stroke 非法宽度被拦截（注入防护），不启用描边', () => {
    const el = mount({ stroke: '2px;background:red' })
    expect(el.classList.contains('stroked')).toBe(false)
    expect(el.style.getPropertyValue('--oas-gradient-text-stroke-w')).toBe('')
    const elUnit = mount({ stroke: '2' })
    expect(elUnit.classList.contains('stroked')).toBe(false)
  })

  it('stroke-color：合法色落变量；非法/缺省回退 text-primary token', () => {
    const el = mount({ stroke: '1px', 'stroke-color': '#123456' })
    expect(el.style.getPropertyValue('--oas-gradient-text-stroke-c')).toBe('#123456')
    const elBad = mount({ stroke: '1px', 'stroke-color': 'red;injected' })
    expect(elBad.style.getPropertyValue('--oas-gradient-text-stroke-c')).toBe('var(--oas-color-text-primary)')
  })

  it('描边与渐变共存：stroked + clipped + 渐变内联背景三者并存（含 animated）', () => {
    const el = mount({ stroke: '2px', gradient: '["#f00", "#00f"]', animated: '' })
    const node = textEl(el)
    expect(el.classList.contains('stroked')).toBe(true)
    expect(node.classList.contains('clipped')).toBe(true)
    expect(node.classList.contains('animated')).toBe(true)
    expect(node.style.backgroundImage).toContain('#f00')
    expect(el.shadowRoot!.querySelector('[part="stroke"]')!.textContent).toBe('渐变文字')
  })

  it('描边样式：-webkit-text-stroke 双层叠字 + @supports not 回退块（老浏览器主文字直描、副层隐藏）', () => {
    const el = mount({ stroke: '2px' })
    const style = styleText(el)
    expect(style).toContain('-webkit-text-stroke')
    expect(style).toContain('@supports not')
    expect(style).toContain(':host(.stroked)')
    expect(style).toContain('var(--oas-color-text-primary)')
  })

  it('stroke 属性运行时可增删：观察属性同步 stroked 类与变量', () => {
    const el = mount()
    expect(el.classList.contains('stroked')).toBe(false)
    el.setAttribute('stroke', '3px')
    expect(el.classList.contains('stroked')).toBe(true)
    expect(el.style.getPropertyValue('--oas-gradient-text-stroke-w')).toBe('3px')
    el.removeAttribute('stroke')
    expect(el.classList.contains('stroked')).toBe(false)
    expect(el.style.getPropertyValue('--oas-gradient-text-stroke-w')).toBe('')
  })
})
