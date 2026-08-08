import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASCalendar } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCalendar {
  const el = new OASCalendar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function day(el: OASCalendar, iso: string): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`.day[data-date="${iso}"]`)!
}

function grid(el: OASCalendar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="grid"]')!
}

function rovingFocus(el: OASCalendar): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.day[tabindex="0"]')!
}

describe('OASCalendar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('month 模式渲染周头 + 当月日网格，aria-label 为完整日期描述', () => {
    const el = mount({ value: '2026-08-09' })
    const weekdays = [...el.shadowRoot!.querySelectorAll('.weekday')].map((n) => n.textContent)
    expect(weekdays).toEqual(['一', '二', '三', '四', '五', '六', '日'])
    expect(el.shadowRoot!.querySelectorAll('.day').length).toBe(42)
    expect(day(el, '2026-08-09').getAttribute('aria-label')).toBe('2026年8月9日')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年8月')
  })

  it('选中值与今天分别带 selected / today 样式', () => {
    const el = mount({ value: '2026-08-09' })
    expect(day(el, '2026-08-09').classList.contains('selected')).toBe(true)
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`
    if (iso !== '2026-08-09') {
      expect(day(el, iso).classList.contains('today')).toBe(true)
    }
  })

  it('上一月/下一月导航更新标题', () => {
    const el = mount({ value: '2026-08-09' })
    el.shadowRoot!.querySelector<HTMLElement>('[part="prev"]')!.click()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年7月')
    el.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!.click()
    el.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!.click()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年9月')
  })

  it('今天按钮跳回当前月', () => {
    const el = mount({ value: '2026-08-09' })
    el.shadowRoot!.querySelector<HTMLElement>('[part="prev"]')!.click()
    el.shadowRoot!.querySelector<HTMLElement>('[part="today"]')!.click()
    const now = new Date()
    const expected = `${now.getFullYear()}年${now.getMonth() + 1}月`
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe(expected)
  })

  it('点击日期选中并派发 oas-change { value }', () => {
    const el = mount({ value: '2026-08-09' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-15').click()
    expect(detail).toEqual({ value: '2026-08-15' })
    expect(el.getAttribute('value')).toBe('2026-08-15')
  })

  it('min/max 越界日期禁用', () => {
    const el = mount({ value: '2026-08-09', min: '2026-08-01', max: '2026-08-31' })
    expect(day(el, '2026-07-31').classList.contains('disabled')).toBe(true)
    expect(day(el, '2026-08-15').classList.contains('disabled')).toBe(false)
    expect(day(el, '2026-09-01').classList.contains('disabled')).toBe(true)
  })

  it('disabled-date 属性回调禁用（如周日）', () => {
    const el = mount({ value: '2026-08-09' })
    el.disabledDate = (d) => d.getDay() === 0
    expect(day(el, '2026-08-09').getAttribute('aria-disabled')).toBe('true')
    expect(day(el, '2026-08-10').getAttribute('aria-disabled')).toBe('false')
  })

  it('show-week-number 渲染周号列', () => {
    const el = mount({ value: '2026-08-09', 'show-week-number': '' })
    // 表头第一格是空占位，仅取数据行的周号
    const weekNumbers = [...el.shadowRoot!.querySelectorAll('.week .week-number')].map((n) =>
      n.textContent!.trim(),
    )
    expect(weekNumbers).toContain('32')
    expect(weekNumbers[0]).toBe('31')
  })

  it('year 模式渲染 12 个月，点击月派发 yyyy-MM', () => {
    const el = mount({ value: '2026-07', mode: 'year' })
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年')
    const months = el.shadowRoot!.querySelectorAll('.month-cell')
    expect(months.length).toBe(12)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(months[6] as HTMLElement).click()
    expect(detail).toEqual({ value: '2026-07' })
  })

  it('month 模式点击标题进入月选择面板，选月后回日视图', () => {
    const el = mount({ value: '2026-08-09' })
    el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!.click()
    expect(el.shadowRoot!.querySelectorAll('.month-cell').length).toBe(12)
    el.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!.click()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2027年')
    el.shadowRoot!.querySelectorAll('.month-cell')[0]!.dispatchEvent(new MouseEvent('click'))
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2027年1月')
    expect(el.shadowRoot!.querySelectorAll('.day').length).toBeGreaterThan(0)
  })

  it('键盘：方向键在网格内移动焦点，Enter 选中派发事件', () => {
    const el = mount({ value: '2026-08-09' })
    // 初始 roving focus 在选中日
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-09')
    grid(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-10')
    grid(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-17')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    grid(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ value: '2026-08-17' })
  })

  it('locale：日单元格 aria-label 随 setLocale 切换', () => {
    const el = mount({ value: '2026-08-09' })
    expect(day(el, '2026-08-09').getAttribute('aria-label')).toBe('2026年8月9日')
    setLocale(en)
    expect(day(el, '2026-08-09').getAttribute('aria-label')).toBe('August 9, 2026')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('August 2026')
    setLocale('zh-CN')
    expect(day(el, '2026-08-09').getAttribute('aria-label')).toBe('2026年8月9日')
  })

  it('value 变化即时反映：受控模式改属性重选', () => {
    const el = mount({ value: '2026-08-09' })
    el.setAttribute('value', '2026-08-20')
    expect(day(el, '2026-08-20').classList.contains('selected')).toBe(true)
    expect(day(el, '2026-08-09').classList.contains('selected')).toBe(false)
  })
})
