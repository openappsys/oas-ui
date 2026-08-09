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

  it('allow-clear 默认开启：点击当前已选中的同一颗星清空为 0', () => {
    const el = mount({ value: '4' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    stars(el)[3]!.click()
    expect(detail).toEqual({ value: 0 })
    expect(el.getAttribute('value')).toBe('0')
  })

  it('allow-clear 下点击其他星仍正常设值', () => {
    const el = mount({ value: '3' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    stars(el)[4]!.click()
    expect(detail).toEqual({ value: 5 })
    expect(el.getAttribute('value')).toBe('5')
  })

  it('allow-clear="false" 时点击已选中的星不清空', () => {
    const el = mount({ value: '4', 'allow-clear': 'false' })
    let emitted = false
    el.addEventListener('oas-change', () => (emitted = true))
    stars(el)[3]!.click()
    expect(el.getAttribute('value')).toBe('4')
    expect(emitted).toBe(false)
  })

  it('半值时点击半星所在星同样清空', () => {
    const el = mount({ value: '3.5', 'allow-half': '' })
    stars(el)[3]!.click() // 第 4 颗星（承载半星）
    expect(el.getAttribute('value')).toBe('0')
  })

  it('icon 属性自定义字符图标', () => {
    const el = mount({ icon: '♥', value: '3' })
    const s = stars(el)
    expect(s.length).toBe(5)
    for (const star of s) expect(star.textContent?.trim()).toBe('♥')
  })

  it('icon 属性支持 SVG 标记', () => {
    const el = mount({ icon: "<svg viewBox='0 0 16 16'></svg>" })
    expect(stars(el)[0]!.querySelector('svg')).not.toBeNull()
  })

  it('slot 自定义图标克隆到每颗星', async () => {
    const el = new OASRate()
    el.innerHTML = `<span slot="icon">★</span>`
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const s = stars(el)
    expect(s.length).toBe(5)
    for (const star of s) expect(star.textContent?.trim()).toBe('★')
  })
})
