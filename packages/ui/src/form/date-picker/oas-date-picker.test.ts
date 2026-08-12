import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASDatePicker } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDatePicker {
  const el = new OASDatePicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASDatePicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="trigger"]')!
}

function panel(el: OASDatePicker): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
}

function grids(el: OASDatePicker): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.grid')]
}

function day(el: OASDatePicker, iso: string, gridIndex = 0): HTMLButtonElement {
  return grids(el)[gridIndex]!.querySelector<HTMLButtonElement>(`.day[data-date="${iso}"]`)!
}

function open(el: OASDatePicker): void {
  trigger(el).click()
}

function rovingFocus(el: OASDatePicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.day[tabindex="0"]')!
}

describe('OASDatePicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('空值显示 placeholder，combobox 角色', () => {
    const el = mount()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    expect(trigger(el).textContent).toContain('请选择日期')
  })

  it('value 按 format 格式化展示（Intl token）', () => {
    const el = mount({ value: '2026-08-09' })
    expect(trigger(el).textContent).toContain('2026-08-09')
    el.setAttribute('format', 'yyyy/MM/dd')
    expect(trigger(el).textContent).toContain('2026/08/09')
  })

  it('date：打开面板显示月网格，点击日期提交并关闭，派发 oas-change', () => {
    const el = mount({ value: '2026-08-09' })
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(grids(el).length).toBe(1)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-15').click()
    expect(el.getAttribute('value')).toBe('2026-08-15')
    expect(detail).toEqual({ value: '2026-08-15' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(trigger(el).textContent).toContain('2026-08-15')
  })

  it('min/max 越界日期禁用', () => {
    const el = mount({ value: '2026-08-09', min: '2026-08-10' })
    open(el)
    expect(day(el, '2026-08-05').classList.contains('disabled')).toBe(true)
    expect(day(el, '2026-08-15').classList.contains('disabled')).toBe(false)
  })

  it('键盘：网格内方向键移动，Enter 选中', () => {
    const el = mount({ value: '2026-08-09' })
    open(el)
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-09')
    grids(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-10')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    grids(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ value: '2026-08-10' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('Esc 关闭面板，外部点击关闭', () => {
    const el = mount({ value: '2026-08-09' })
    open(el)
    panel(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    open(el)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 时不可打开', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
    trigger(el).click()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('month 类型：12 个月面板，选月提交 yyyy-MM', () => {
    const el = mount({ type: 'month', value: '2026-08' })
    expect(trigger(el).textContent).toContain('2026-08')
    open(el)
    const months = el.shadowRoot!.querySelectorAll('.month-cell')
    expect(months.length).toBe(12)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(months[6] as HTMLElement).click()
    expect(detail).toEqual({ value: '2026-07' })
    expect(el.getAttribute('value')).toBe('2026-07')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('daterange：双月网格，先选起点再选终点，提交 JSON 数组', () => {
    const el = mount({ type: 'daterange', value: '["2026-08-05","2026-08-15"]' })
    expect(trigger(el).textContent).toContain('2026-08-05')
    expect(trigger(el).textContent).toContain('2026-08-15')
    open(el)
    expect(grids(el).length).toBe(2)
    expect(day(el, '2026-08-05').classList.contains('range-start')).toBe(true)
    expect(day(el, '2026-08-15').classList.contains('range-end')).toBe(true)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-10').click() // 重选起点
    day(el, '2026-08-20').click() // 选终点
    expect(el.getAttribute('value')).toBe('["2026-08-10","2026-08-20"]')
    expect(detail).toEqual({ value: ['2026-08-10', '2026-08-20'] })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('daterange：终点早于起点时重置起点，不提交', () => {
    const el = mount({ type: 'daterange', value: '["2026-08-10","2026-08-20"]' })
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-10').click() // 已有完整范围，重选起点
    day(el, '2026-08-01').click() // 早于起点 → 重置起点
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(detail).toBeUndefined()
    expect(day(el, '2026-08-01').classList.contains('range-start')).toBe(true)
    expect(day(el, '2026-08-10').classList.contains('range-start')).toBe(false)
  })

  it('datetime：日期 + 时间选择，确定提交完整值', () => {
    const el = mount({ type: 'datetime', value: '2026-08-09T00:00:00' })
    open(el)
    day(el, '2026-08-09').click()
    const hourOpt = el.shadowRoot!.querySelector<HTMLElement>(
      '.time-col[data-unit="h"] .time-option[data-value="9"]',
    )!
    const minuteOpt = el.shadowRoot!.querySelector<HTMLElement>(
      '.time-col[data-unit="m"] .time-option[data-value="30"]',
    )!
    hourOpt.click()
    minuteOpt.click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('[part="confirm"]')!.click()
    expect(el.getAttribute('value')).toBe('2026-08-09T09:30:00')
    expect(detail).toEqual({ value: '2026-08-09T09:30:00' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(trigger(el).textContent).toContain('2026-08-09 09:30:00')
  })

  it('受控：外部改 value 即时反映到 trigger', () => {
    const el = mount({ value: '2026-08-09' })
    el.setAttribute('value', '2026-08-20')
    expect(trigger(el).textContent).toContain('2026-08-20')
  })
})
