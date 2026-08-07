import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDivider } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '分割'): OASDivider {
  const el = new OASDivider()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function line(el: OASDivider): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.divider')
}

describe('OASDivider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认水平分割线：role=separator 且 aria-orientation=horizontal', async () => {
    const el = mount({}, '')
    const d = line(el)!
    await Promise.resolve()
    expect(d.getAttribute('role')).toBe('separator')
    expect(d.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('direction=vertical 切换竖线', () => {
    const el = mount({ direction: 'vertical' }, '')
    const d = line(el)!
    expect(d.getAttribute('aria-orientation')).toBe('vertical')
  })

  it('有内容时两侧留线，content-position 控制位置', () => {
    const el = mount({ 'content-position': 'left' }, '标题')
    const d = line(el)!
    expect(el.textContent).toContain('标题')
    expect(d.classList.contains('left')).toBe(true)
  })

  it('dashed 属性加虚线样式类', () => {
    const el = mount({ dashed: '' }, '')
    expect(line(el)!.classList.contains('dashed')).toBe(true)
  })

  it('属性变化增量更新：切换 direction 即时生效', () => {
    const el = mount({}, '')
    const d = line(el)!
    el.setAttribute('direction', 'vertical')
    expect(d).toBe(line(el))
    expect(d.getAttribute('aria-orientation')).toBe('vertical')
  })
})
