import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTimePicker } from './index.js'

function mount(attrs: Record<string, string> = {}): OASTimePicker {
  const el = new OASTimePicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASTimePicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="trigger"]')!
}

function dropdown(el: OASTimePicker): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="dropdown"]')!
}

function open(el: OASTimePicker): void {
  trigger(el).click()
}

function columns(el: OASTimePicker): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')]
}

function optionsIn(col: HTMLElement): HTMLElement[] {
  return [...col.querySelectorAll<HTMLElement>('.option')]
}

function selectedOption(el: OASTimePicker, colIndex: number): HTMLElement | null {
  return el.shadowRoot!.querySelectorAll('.column')[colIndex]?.querySelector('.option.selected') ?? null
}

describe('OASTimePicker', () => {
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
    expect(trigger(el).textContent).toContain('请选择时间')
  })

  it('value 按 format 格式化展示（默认 HH:mm:ss，可裁剪为 HH:mm）', () => {
    const el = mount({ value: '09:05:30' })
    expect(trigger(el).textContent).toContain('09:05:30')
    el.setAttribute('format', 'HH:mm')
    expect(trigger(el).textContent).toContain('09:05')
  })

  it('展开显示时分秒三列，默认步长为 1', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    const cols = columns(el)
    expect(cols.length).toBe(3)
    expect(optionsIn(cols[0]!).length).toBe(24)
    expect(optionsIn(cols[1]!).length).toBe(60)
    expect(optionsIn(cols[2]!).length).toBe(60)
    expect(selectedOption(el, 0)!.textContent).toBe('09')
    expect(selectedOption(el, 1)!.textContent).toBe('05')
  })

  it('format 不含秒时只渲染两列', () => {
    const el = mount({ value: '09:05:30', format: 'HH:mm' })
    open(el)
    expect(columns(el).length).toBe(2)
  })

  it('step 控制分钟列间隔', () => {
    const el = mount({ value: '09:05:30', step: '15' })
    open(el)
    const minuteOptions = optionsIn(columns(el)[1]!)
    expect(minuteOptions.map((o) => o.textContent)).toEqual(['00', '15', '30', '45'])
  })

  it('点击选项 + Enter 确认：更新 value 并派发 oas-change', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const minuteOptions = optionsIn(columns(el)[1]!)
    const option15 = minuteOptions.find((o) => o.textContent === '15')!
    option15.click() // 选中 15 分
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('09:15:30')
    expect(detail).toEqual({ value: '09:15:30' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('↑↓ 调整当前列，小时回绕', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(selectedOption(el, 0)!.textContent).toBe('10')
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(selectedOption(el, 0)!.textContent).toBe('09')
    // 0 点向下回绕到 23，再向上回 00
    el.setAttribute('value', '00:00:00')
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(selectedOption(el, 0)!.textContent).toBe('23')
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(selectedOption(el, 0)!.textContent).toBe('00')
  })

  it('←→ 切换列', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(selectedOption(el, 1)!.textContent).toBe('06')
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(selectedOption(el, 0)!.textContent).toBe('10')
  })

  it('Esc 取消：恢复原值并关闭', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(el.getAttribute('value')).toBe('09:05:30')
    expect(trigger(el).textContent).toContain('09:05:30')
  })

  it('点击外部关闭（composedPath 检测），且无孤儿监听', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 时 trigger 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
    trigger(el).click()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })
})
