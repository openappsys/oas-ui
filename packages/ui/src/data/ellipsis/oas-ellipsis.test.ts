import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASEllipsis } from './index.js'

function mount(attrs: Record<string, string> = {}): OASEllipsis {
  const el = new OASEllipsis()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function textEl(el: OASEllipsis): HTMLElement {
  return el.shadowRoot!.querySelector('.text')!
}

function toggleEl(el: OASEllipsis): HTMLButtonElement {
  return el.shadowRoot!.querySelector('.toggle')!
}

/**
 * 桩掉文本尺寸并强制重跑 update()：
 * happy-dom 不参与布局，scrollWidth/clientWidth 恒为 0，需手动构造溢出条件。
 */
function forceOverflow(el: OASEllipsis, overflow: boolean): void {
  const t = textEl(el)
  Object.defineProperty(t, 'scrollWidth', { value: overflow ? 300 : 100, configurable: true })
  Object.defineProperty(t, 'clientWidth', { value: 100, configurable: true })
  Object.defineProperty(t, 'scrollHeight', { value: overflow ? 90 : 30, configurable: true })
  Object.defineProperty(t, 'clientHeight', { value: 30, configurable: true })
  // 同值重设属性也会触发 attributeChangedCallback → update()
  el.setAttribute('text', el.getAttribute('text') ?? '')
}

describe('OASEllipsis', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无溢出时渲染纯文本，不挂 tooltip、无展开按钮（零孤儿浮层）', () => {
    const el = mount({ text: '短文本' })
    expect(textEl(el).textContent).toBe('短文本')
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    expect(toggleEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('单行溢出时才挂 tooltip，tooltip 内容为全文', () => {
    const el = mount({ text: '这是一段很长的文本' })
    forceOverflow(el, true)
    const tip = el.shadowRoot!.querySelector('oas-tooltip')
    expect(tip).not.toBeNull()
    expect(tip!.getAttribute('content')).toContain('这是一段很长的文本')
    expect(textEl(el).classList.contains('single')).toBe(true)
  })

  it('溢出消失后解除 tooltip 包裹（零孤儿）', () => {
    const el = mount({ text: 'x' })
    forceOverflow(el, true)
    expect(el.shadowRoot!.querySelector('oas-tooltip')).not.toBeNull()
    forceOverflow(el, false)
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    expect(textEl(el).textContent).toBe('x')
  })

  it('rows=2 启用多行 line-clamp 样式（multi 类）', () => {
    const el = mount({ text: '多行文本', rows: '2' })
    const t = textEl(el)
    expect(t.classList.contains('multi')).toBe(true)
    expect(t.classList.contains('single')).toBe(false)
  })

  it('多行溢出时 tooltip 展示全文', () => {
    const el = mount({ text: '多行溢出的完整文本内容', rows: '3' })
    forceOverflow(el, true)
    const tip = el.shadowRoot!.querySelector('oas-tooltip')
    expect(tip).not.toBeNull()
    expect(tip!.getAttribute('content')).toContain('多行溢出的完整文本内容')
  })

  it('tooltip="false" 时溢出也不挂 tooltip', () => {
    const el = mount({ text: '长文本', tooltip: 'false' })
    forceOverflow(el, true)
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
  })

  it('expandable 溢出时显示展开按钮，点击派发 oas-expand 并展示全文', () => {
    const el = mount({ text: '长文本', expandable: '' })
    forceOverflow(el, true)
    const btn = toggleEl(el)
    expect(btn.hasAttribute('hidden')).toBe(false)
    let detail: unknown
    el.addEventListener('oas-expand', (e: Event) => (detail = (e as CustomEvent).detail))
    btn.click()
    expect(detail).toEqual({ expanded: true })
    // 展开后不再省略：无 tooltip、无省略类
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    expect(textEl(el).classList.contains('single')).toBe(false)
    expect(textEl(el).classList.contains('multi')).toBe(false)
  })

  it('再次点击派发 oas-collapse 并恢复省略态', () => {
    const el = mount({ text: '长文本', expandable: '' })
    forceOverflow(el, true)
    const btn = toggleEl(el)
    btn.click()
    let detail: unknown
    el.addEventListener('oas-collapse', (e: Event) => (detail = (e as CustomEvent).detail))
    btn.click()
    expect(detail).toEqual({ expanded: false })
    expect(btn.textContent).toContain('ellipsis.expand')
    expect(el.shadowRoot!.querySelector('oas-tooltip')).not.toBeNull()
  })

  it('expandable 无溢出时按钮隐藏', () => {
    const el = mount({ text: '短文本', expandable: '' })
    expect(toggleEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('text 属性变化增量更新内容', () => {
    const el = mount({ text: '旧文本' })
    el.setAttribute('text', '新文本')
    expect(textEl(el).textContent).toBe('新文本')
  })

  it('断开连接清理 ResizeObserver', () => {
    const spy = vi.spyOn(ResizeObserver.prototype, 'disconnect')
    const el = mount({ text: 'x' })
    el.remove()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
