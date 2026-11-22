import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASRollingText, formatRollingValue } from './index.js'

function mount(attrs: Record<string, string> = {}): OASRollingText {
  const el = new OASRollingText()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function digits(el: OASRollingText): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.digit-col')]
}

function chars(el: OASRollingText): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.char-col')]
}

function srText(el: OASRollingText): string {
  return el.shadowRoot!.querySelector('[part="sr"]')!.textContent!
}

describe('formatRollingValue（精度格式化纯函数）', () => {
  it('按 precision 补零 / 四舍五入', () => {
    expect(formatRollingValue('3.5', '2')).toBe('3.50')
    expect(formatRollingValue('3.456', '2')).toBe('3.46')
    expect(formatRollingValue('42', '0')).toBe('42')
    expect(formatRollingValue('42', '3')).toBe('42.000')
  })

  it('非法 precision / 非数值文本保留原文本', () => {
    expect(formatRollingValue('3.5', '')).toBe('3.5')
    expect(formatRollingValue('3.5', 'abc')).toBe('3.5')
    expect(formatRollingValue('3.5', '-1')).toBe('3.5')
    expect(formatRollingValue('1,234.5', '2')).toBe('1,234.5')
    expect(formatRollingValue('', '2')).toBe('')
  })

  it('precision 上限钳到 10 位', () => {
    expect(formatRollingValue('1', '99')).toBe('1.0000000000')
  })
})

describe('OASRollingText 渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('每位数字一列，滚轮 --n 指向目标数字', () => {
    const el = mount({ value: '138' })
    const cols = digits(el)
    expect(cols.length).toBe(3)
    expect(cols[0]!.querySelector<HTMLElement>('.strip')!.style.getPropertyValue('--n')).toBe('1')
    expect(cols[1]!.querySelector<HTMLElement>('.strip')!.style.getPropertyValue('--n')).toBe('3')
    expect(cols[2]!.querySelector<HTMLElement>('.strip')!.style.getPropertyValue('--n')).toBe('8')
    // 滚轮含两个 0–9 周期（20 位）：稳态档位 0–9，两侧预留最短路径瞬态档位（-5…-1 / 10…14）
    const strip = cols[0]!.querySelectorAll('.digit')
    expect(strip.length).toBe(20)
    // 逻辑档位 0 落在第 6 位（STRIP_OFFSET=5），其后为 0,1,2,…
    expect(strip[5]!.textContent).toBe('0')
    expect(strip[6]!.textContent).toBe('1')
    expect(strip[0]!.textContent).toBe('5') // 逻辑 -5
  })

  it('小数点 / 负号等非数字渲染为字符列', () => {
    const el = mount({ value: '-12.5' })
    expect(digits(el).length).toBe(3)
    expect(chars(el).length).toBe(2)
    expect(chars(el)[0]!.textContent).toBe('-')
    expect(chars(el)[1]!.textContent).toBe('.')
  })

  it('precision 生效（3.5 → 3.50，数字列 3 位 + 小数点 1 列）', () => {
    const el = mount({ value: '3.5', precision: '2' })
    expect(digits(el).length).toBe(3)
    expect(chars(el).length).toBe(1)
    expect(srText(el)).toBe('3.50')
  })

  it('前缀 / 后缀文本渲染，空值隐藏', () => {
    const el = mount({ value: '99', 'prefix-text': '¥', 'suffix-text': '元' })
    const prefix = el.shadowRoot!.querySelector<HTMLElement>('.prefix')!
    const suffix = el.shadowRoot!.querySelector<HTMLElement>('.suffix')!
    expect(prefix.textContent).toBe('¥')
    expect(suffix.textContent).toBe('元')
    expect(prefix.hidden).toBe(false)
    el.removeAttribute('prefix-text')
    expect(prefix.hidden).toBe(true)
    expect(srText(el)).toBe('99元')
  })

  it('视觉列 aria-hidden，完整文本进读屏隐藏区', () => {
    const el = mount({ value: '1,234' })
    expect(el.shadowRoot!.querySelector('[part="value"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(srText(el)).toBe('1,234')
    expect(el.shadowRoot!.querySelector('[part="sr"]')!.getAttribute('aria-live')).toBe('off')
  })

  it('live 属性开启 polite 活区', () => {
    const el = mount({ value: '1', live: '' })
    expect(el.shadowRoot!.querySelector('[part="sr"]')!.getAttribute('aria-live')).toBe('polite')
  })

  it('duration 合法时写入 CSS 变量，非法时清除', () => {
    const el = mount({ value: '1', duration: '1200' })
    expect(el.style.getPropertyValue('--oas-rolling-text-duration')).toBe('1200ms')
    el.setAttribute('duration', 'oops-duration')
    expect(el.style.getPropertyValue('--oas-rolling-text-duration')).toBe('')
  })

  it('reduced-motion 下关闭过渡与翻转动画', () => {
    const el = mount({ value: '1' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toMatch(/\.strip\s*\{\s*transition: none/)
  })
})

describe('OASRollingText 值变化（逐列翻滚）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('数字变化只更新对应列的 --n（保留列与过渡）', () => {
    const el = mount({ value: '138' })
    const firstStrip = digits(el)[0]!.querySelector<HTMLElement>('.strip')!
    el.setAttribute('value', '538')
    expect(digits(el).length).toBe(3)
    expect(digits(el)[0]!.querySelector<HTMLElement>('.strip')).toBe(firstStrip)
    expect(firstStrip.style.getPropertyValue('--n')).toBe('5')
  })

  it('位数增加补列、减少删列', () => {
    const el = mount({ value: '12' })
    el.setAttribute('value', '1234')
    expect(digits(el).length).toBe(4)
    el.setAttribute('value', '9')
    expect(digits(el).length).toBe(1)
    // 1→9 走反向短路径（越界瞬态 -1，翻滚结束归位为 9）；两者视觉同为数字 9
    const n = Number(digits(el)[0]!.querySelector<HTMLElement>('.strip')!.style.getPropertyValue('--n'))
    expect(((n % 10) + 10) % 10).toBe(9)
  })

  it('数字与字符类型切换时整列替换', () => {
    const el = mount({ value: '1' })
    el.setAttribute('value', 'x')
    expect(digits(el).length).toBe(0)
    expect(chars(el).length).toBe(1)
    expect(chars(el)[0]!.textContent).toBe('x')
  })

  it('字符变化添加 flipping 动画类，时长后移除', () => {
    vi.useFakeTimers()
    const el = mount({ value: '1.2', duration: '300' })
    el.setAttribute('value', '1.7')
    const charCol = chars(el)[0]!
    // 小数点未变化，不应翻转
    expect(charCol.classList.contains('flipping')).toBe(false)
    el.setAttribute('value', '2,7')
    const comma = chars(el)[0]!
    expect(comma.textContent).toBe(',')
    expect(comma.classList.contains('flipping')).toBe(true)
    vi.advanceTimersByTime(320)
    expect(comma.classList.contains('flipping')).toBe(false)
  })

  it('value property 支持 number 并反射到属性', () => {
    const el = mount()
    el.value = 3.14
    expect(el.getAttribute('value')).toBe('3.14')
    expect(srText(el)).toBe('3.14')
  })

  it('非法/缺失 value 不产生列', () => {
    const el = mount()
    expect(digits(el).length).toBe(0)
    expect(chars(el).length).toBe(0)
    expect(srText(el)).toBe('')
  })

  it('9→0 走最短路径：正向降到越界档位 10，动画结束归位到 0', () => {
    vi.useFakeTimers()
    const el = mount({ value: '9', duration: '300' })
    const strip = digits(el)[0]!.querySelector<HTMLElement>('.strip')!
    el.setAttribute('value', '0')
    // 正向 1 格（10 = 视觉 0），而不是从 9 倒卷 9 格回 0
    expect(strip.style.getPropertyValue('--n')).toBe('10')
    vi.advanceTimersByTime(320)
    expect(strip.style.getPropertyValue('--n')).toBe('0')
    expect(strip.style.getPropertyValue('transition-property')).toBe('')
  })

  it('0→9 走最短路径：反向升到越界档位 -1，动画结束归位到 9', () => {
    vi.useFakeTimers()
    const el = mount({ value: '0', duration: '300' })
    const strip = digits(el)[0]!.querySelector<HTMLElement>('.strip')!
    el.setAttribute('value', '9')
    expect(strip.style.getPropertyValue('--n')).toBe('-1')
    vi.advanceTimersByTime(320)
    expect(strip.style.getPropertyValue('--n')).toBe('9')
  })

  it('普通回绕（2→9）也取反向短路径（3 格），不回卷 7 格', () => {
    vi.useFakeTimers()
    const el = mount({ value: '2', duration: '300' })
    const strip = digits(el)[0]!.querySelector<HTMLElement>('.strip')!
    el.setAttribute('value', '9')
    expect(strip.style.getPropertyValue('--n')).toBe('-1')
    vi.advanceTimersByTime(320)
    expect(strip.style.getPropertyValue('--n')).toBe('9')
  })

  it('RTL 宿主下数字列仍按 LTR 排列（123 不反转成 321）', () => {
    const el = mount({ value: '123' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.columns\s*\{[^}]*direction: ltr/)
  })

  it('precision 超过 10 位告警一次并按 10 位处理', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    formatRollingValue('1', '12')
    formatRollingValue('1', '12')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('precision')
    warn.mockRestore()
  })
})
