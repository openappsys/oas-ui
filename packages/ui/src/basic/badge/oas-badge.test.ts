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
