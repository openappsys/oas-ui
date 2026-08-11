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

  // —— 半选视觉（缺陷 9 回归）——
  // 半星 = 左半激活色（warning）+ 右半未激活色：由 .half-fill 覆盖层 + clip-path 垂直分割实现，
  // 替代旧「整星 opacity:0.5」实现。

  it('半选：半星渲染左半激活覆盖层（half-fill + clip-path 垂直分割），非透明度淡化', () => {
    const el = mount({ value: '2.5', 'allow-half': '' })
    const s = stars(el)
    // 2.5 = 两颗全黄 + 一颗半黄半灰 + 两颗全灰
    expect(s.filter((st) => st.classList.contains('active')).length).toBe(2)
    const half = s[2]!
    expect(half.classList.contains('half')).toBe(true)
    // 旧实现已移除：不再用 inline opacity 0.5
    expect(half.style.opacity).toBe('')
    const fill = half.querySelector<HTMLElement>('.half-fill')
    expect(fill).not.toBeNull()
    expect(fill!.getAttribute('aria-hidden')).toBe('true')
    expect(fill!.querySelector('svg')).not.toBeNull() // 覆盖层与基础星同图标
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 垂直分割保留左半 + 覆盖层用激活色
    expect(css).toMatch(/\.half-fill\s*\{[^}]*clip-path:\s*inset\(0\s+50%\s+0\s+0\)/)
    expect(css).toMatch(/\.half-fill\s*\{[^}]*color:\s*var\(--oas-color-warning\)/)
    expect(css).toMatch(/\.star\s*\{[^}]*position:\s*relative/)
    // 未到半星的星没有覆盖层
    expect(s[3]!.querySelector('.half-fill')).toBeNull()
    expect(s[4]!.querySelector('.half-fill')).toBeNull()
  })

  it('半选：整数值/非半选模式不渲染 half-fill，值变化增量增删', () => {
    const el = mount({ value: '2.5', 'allow-half': '' })
    const s = stars(el)
    expect(s[2]!.querySelector('.half-fill')).not.toBeNull()
    // 值变回整数 → 覆盖层移除
    el.setAttribute('value', '3')
    expect(s[2]!.classList.contains('half')).toBe(false)
    expect(s[2]!.querySelector('.half-fill')).toBeNull()
    // 再变回半值 → 覆盖层重新出现
    el.setAttribute('value', '3.5')
    expect(s[3]!.classList.contains('half')).toBe(true)
    expect(s[3]!.querySelector('.half-fill')).not.toBeNull()
    // 非半选模式下半值按整星计，无覆盖层
    el.removeAttribute('allow-half')
    el.setAttribute('value', '2.5')
    expect(s[2]!.querySelector('.half-fill')).toBeNull()
  })

  it('半选：自定义 icon 同样有半选覆盖层（克隆当前图标）', () => {
    const el = mount({ value: '2.5', 'allow-half': '', icon: '♥' })
    const half = stars(el)[2]!
    const fill = half.querySelector<HTMLElement>('.half-fill')
    expect(fill).not.toBeNull()
    expect(fill!.textContent?.trim()).toBe('♥')
  })
})
