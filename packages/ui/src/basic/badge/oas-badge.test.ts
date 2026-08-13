import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASBadge } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '内容'): OASBadge {
  const el = new OASBadge()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function badge(el: OASBadge): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.badge')
}

function ribbon(el: OASBadge): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.ribbon')
}

function ribbonSlot(el: OASBadge): HTMLSlotElement | null {
  return el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="ribbon"]')
}

function ribbonFallback(el: OASBadge): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.ribbon-fallback')
}

describe('OASBadge', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无 value 时渲染宿主槽但不显示徽标（hidden）', async () => {
    const el = mount()
    await Promise.resolve()
    expect(el.textContent).toContain('内容')
    expect(badge(el)!.hidden).toBe(true)
  })

  it('value 渲染数字徽标', () => {
    const el = mount({ value: '5' })
    expect(badge(el)!.textContent).toBe('5')
  })

  it('value 超过 max 截断为 max+', () => {
    const el = mount({ value: '120', max: '99' })
    expect(badge(el)!.textContent).toBe('99+')
  })

  it('value=0 默认隐藏，showZero 时显示 0', () => {
    const el = mount({ value: '0' })
    expect(badge(el)!.hidden).toBe(true)
    el.setAttribute('showZero', '')
    expect(badge(el)!.textContent).toBe('0')
  })

  it('dot 模式渲染小圆点（无文本）', () => {
    const el = mount({ value: '5', dot: '' })
    expect(badge(el)!.textContent).toBe('')
    expect(badge(el)!.classList.contains('dot')).toBe(true)
  })

  it('属性变化增量更新：切换 value 不重建引用', () => {
    const el = mount({ value: '3' })
    const b = badge(el)!
    el.setAttribute('value', '10')
    expect(badge(el)).toBe(b)
    expect(b.textContent).toBe('10')
  })
})

describe('OASBadge ribbon', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ribbon 布尔属性 + text 渲染缎带文本', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(false)
    expect(ribbonFallback(el)!.textContent).toContain('HOT')
    expect(ribbonFallback(el)!.hidden).toBe(false)
  })

  it('mode="ribbon" 等价启用缎带', () => {
    const el = mount({ mode: 'ribbon', text: '新品' })
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('mode="count" 不启用缎带', () => {
    const el = mount({ mode: 'count', text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('未启用 ribbon 时缎带节点隐藏', () => {
    const el = mount({ text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('ribbon 无内容（无 text 无 slot）时隐藏', () => {
    const el = mount({ ribbon: '' })
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('text 清空后缎带重新隐藏', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(false)
    el.removeAttribute('text')
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('placement 默认 end，start 切换到左端', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.classList.contains('placement-end')).toBe(true)
    expect(ribbon(el)!.classList.contains('placement-start')).toBe(false)
    el.setAttribute('placement', 'start')
    expect(ribbon(el)!.classList.contains('placement-start')).toBe(true)
    expect(ribbon(el)!.classList.contains('placement-end')).toBe(false)
  })

  it('color 变体映射语义 class，默认 danger', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.classList.contains('color-danger')).toBe(true)
    el.setAttribute('color', 'success')
    expect(ribbon(el)!.classList.contains('color-success')).toBe(true)
    expect(ribbon(el)!.classList.contains('color-danger')).toBe(false)
    el.setAttribute('color', 'warning')
    expect(ribbon(el)!.classList.contains('color-warning')).toBe(true)
    el.setAttribute('color', 'primary')
    expect(ribbon(el)!.classList.contains('color-primary')).toBe(true)
  })

  it('与 count 并存：ribbon + value 同时渲染', () => {
    const el = mount({ ribbon: '', text: 'HOT', value: '5' })
    expect(badge(el)!.hidden).toBe(false)
    expect(badge(el)!.textContent).toBe('5')
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('与 dot 并存：dot + ribbon 同时渲染', () => {
    const el = mount({ ribbon: '', text: 'HOT', dot: '' })
    expect(badge(el)!.hidden).toBe(false)
    expect(badge(el)!.classList.contains('dot')).toBe(true)
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('ribbon 命名插槽内容驱动显隐（无 text 时）', async () => {
    const el = mount({ ribbon: '' })
    expect(ribbon(el)!.hidden).toBe(true)
    el.innerHTML = '<span slot="ribbon">HOT</span>'
    await new Promise((r) => setTimeout(r, 0))
    expect(ribbon(el)!.hidden).toBe(false)
    expect(ribbonSlot(el)!.assignedNodes().length).toBeGreaterThan(0)
  })

  it('text 属性写入兜底元素；slot 有内容时兜底隐藏、assigned 优先', async () => {
    const el = mount({ ribbon: '', text: 'attr' })
    expect(ribbonFallback(el)!.textContent).toContain('attr')
    expect(ribbonFallback(el)!.hidden).toBe(false)
    el.innerHTML = '<em slot="ribbon">slot</em>'
    await new Promise((r) => setTimeout(r, 0))
    expect(ribbonSlot(el)!.assignedNodes().length).toBeGreaterThan(0)
    expect(ribbonFallback(el)!.hidden).toBe(true)
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('text 兜底与 slot 并存时不写 slot 节点（防 slotchange 循环）', () => {
    const el = mount({ ribbon: '', text: 'attr' })
    const slot = ribbonSlot(el)!
    expect(slot.childNodes.length).toBe(0)
  })

  it('缎带文本为真实文本内容（屏幕阅读器可读，无 aria-hidden）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbonFallback(el)!.textContent!.trim()).toBe('HOT')
    expect(ribbon(el)!.hasAttribute('aria-hidden')).toBe(false)
  })

  it('text 兜底元素位于 ribbon-text 内（继承文字色，否则文字与缎带背景同色不可见）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const text = el.shadowRoot!.querySelector<HTMLElement>('.ribbon-text')!
    expect(text.querySelector('.ribbon-fallback')).not.toBeNull()
  })

  it('属性变化增量更新：切换 ribbon 属性不重建引用', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const r = ribbon(el)!
    el.setAttribute('color', 'success')
    expect(ribbon(el)).toBe(r)
    expect(r.classList.contains('color-success')).toBe(true)
  })
})
