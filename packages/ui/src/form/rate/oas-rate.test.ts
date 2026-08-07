import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASRate } from './index.js'

function mount(attrs: Record<string, string> = {}): OASRate {
  const el = new OASRate()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function stars(el: OASRate): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('.star')] as HTMLElement[]
}

describe('OASRate', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 5 颗星，value 驱动选中数', async () => {
    const el = mount({ value: '3' })
    await Promise.resolve()
    expect(stars(el).length).toBe(5)
    expect(stars(el).filter((s) => s.classList.contains('active')).length).toBe(3)
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: '2' })
    el.setAttribute('value', '4')
    expect(stars(el).filter((s) => s.classList.contains('active')).length).toBe(4)
  })

  it('点击星星设置评分并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    stars(el)[3]!.click()
    expect(detail).toEqual({ value: 4 })
    expect(el.getAttribute('value')).toBe('4')
  })

  it('键盘方向键调节评分（role=slider）', () => {
    const el = mount({ value: '3' })
    const host = el.shadowRoot!.querySelector('[role="slider"]')!
    expect(host.getAttribute('aria-valuenow')).toBe('3')
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(host.getAttribute('aria-valuenow')).toBe('4')
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(host.getAttribute('aria-valuenow')).toBe('3')
  })

  it('disabled 时点击无效', () => {
    const el = mount({ disabled: '', value: '1' })
    stars(el)[4]!.click()
    expect(el.getAttribute('value')).toBe('1')
  })
})
