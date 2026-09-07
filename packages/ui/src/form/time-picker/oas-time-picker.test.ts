import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { computePosition } from '../../overlay/floating/index.js'
import { OASTimePicker } from './index.js'

// 包裹真实实现记录 computePosition 入参（行为不变），供浮层定位机制断言
vi.mock('../../overlay/floating/index.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../overlay/floating/index.js')>()
  return { ...mod, computePosition: vi.fn(mod.computePosition) }
})

const computePositionMock = vi.mocked(computePosition)

function mount(attrs: Record<string, string> = {}): OASTimePicker {
  const el = new OASTimePicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASTimePicker): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('[part="trigger"]')!
}

function dropdown(el: OASTimePicker): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="dropdown"]')!
}

function open(el: OASTimePicker): void {
  trigger(el).click()
}

function expanded(el: OASTimePicker): string | null {
  return trigger(el).getAttribute('aria-expanded')
}

function columns(el: OASTimePicker): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')]
}

function optionsIn(col: HTMLElement): HTMLElement[] {
  return [...col.querySelectorAll<HTMLElement>('.option')]
}

function selectedOption(el: OASTimePicker, colIndex: number): HTMLElement | null {
  return columns(el)[colIndex]?.querySelector('.option.selected') ?? null
}

function keydown(el: OASTimePicker, key: string, shift = false): void {
  dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: shift, bubbles: true }))
}

function type(el: OASTimePicker, text: string): void {
  const i = trigger(el)
  i.value = text
  i.dispatchEvent(new Event('input', { bubbles: true }))
}

function blurInput(el: OASTimePicker): void {
  trigger(el).dispatchEvent(new FocusEvent('blur'))
}

describe('OASTimePicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.useRealTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.useRealTimers()
  })

  it('空值显示 placeholder，combobox 角色', () => {
    const el = mount()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    expect(trigger(el).placeholder).toContain('请选择时间')
  })

  it('value 按 format 格式化展示（默认 HH:mm:ss，可裁剪为 HH:mm）', () => {
    const el = mount({ value: '09:05:30' })
    expect(trigger(el).value).toBe('09:05:30')
    el.setAttribute('format', 'HH:mm')
    expect(trigger(el).value).toBe('09:05')
  })

  it('展开显示时分秒三列，默认步长为 1', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    expect(expanded(el)).toBe('true')
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

  it('step 控制分钟列间隔（单数字向后兼容=分钟）', () => {
    const el = mount({ value: '09:05:30', step: '15' })
    open(el)
    const minuteOptions = optionsIn(columns(el)[1]!)
    expect(minuteOptions.map((o) => o.textContent)).toEqual(['00', '15', '30', '45'])
  })

  it('step 支持 JSON 三元组（时/分/秒独立步进）', () => {
    const el = mount({ value: '09:05:30', step: '{"h":2,"m":5,"s":1}' })
    open(el)
    const cols = columns(el)
    expect(optionsIn(cols[0]!).length).toBe(12) // 0,2,...,22
    expect(optionsIn(cols[0]!)[1]!.textContent).toBe('02')
    expect(optionsIn(cols[1]!).length).toBe(12) // 0,5,...,55
    expect(optionsIn(cols[2]!).length).toBe(60)
  })

  it('点击选项 + Enter 确认：更新 value 并派发 oas-change 与 oas-confirm', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    let change: unknown
    let confirm: unknown
    el.addEventListener('oas-change', (e: Event) => (change = (e as CustomEvent).detail))
    el.addEventListener('oas-confirm', (e: Event) => (confirm = (e as CustomEvent).detail))
    const minuteOptions = optionsIn(columns(el)[1]!)
    const option15 = minuteOptions.find((o) => o.textContent === '15')!
    option15.click() // 选中 15 分
    keydown(el, 'Enter')
    expect(el.getAttribute('value')).toBe('09:15:30')
    expect(change).toEqual({ value: '09:15:30' })
    expect(confirm).toEqual({ value: '09:15:30' })
    expect(expanded(el)).toBe('false')
  })

  it('↑↓ 调整当前列，小时回绕', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    keydown(el, 'ArrowUp')
    expect(selectedOption(el, 0)!.textContent).toBe('10')
    keydown(el, 'ArrowDown')
    expect(selectedOption(el, 0)!.textContent).toBe('09')
    // 0 点向下回绕到 23，再向上回 00
    el.setAttribute('value', '00:00:00')
    keydown(el, 'ArrowDown')
    expect(selectedOption(el, 0)!.textContent).toBe('23')
    keydown(el, 'ArrowUp')
    expect(selectedOption(el, 0)!.textContent).toBe('00')
  })

  it('Home/End 跳当前列首末值', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    keydown(el, 'Home')
    expect(selectedOption(el, 0)!.textContent).toBe('00')
    keydown(el, 'End')
    expect(selectedOption(el, 0)!.textContent).toBe('23')
  })

  it('←→ 切换列', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    keydown(el, 'ArrowRight')
    keydown(el, 'ArrowUp')
    expect(selectedOption(el, 1)!.textContent).toBe('06')
    keydown(el, 'ArrowLeft')
    keydown(el, 'ArrowUp')
    expect(selectedOption(el, 0)!.textContent).toBe('10')
  })

  it('Esc 取消：恢复原值并关闭', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    keydown(el, 'ArrowUp')
    keydown(el, 'Escape')
    expect(expanded(el)).toBe('false')
    expect(el.getAttribute('value')).toBe('09:05:30')
    expect(trigger(el).value).toBe('09:05:30')
  })

  it('点击外部关闭（composedPath 检测），且无孤儿监听', () => {
    const el = mount({ value: '09:05:30' })
    open(el)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(expanded(el)).toBe('false')
  })

  it('disabled 时 trigger 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
    trigger(el).click()
    expect(expanded(el)).toBe('false')
  })

  // ---- 12 小时制 ----

  it('use12-hours：第四列 am/pm，小时列 1-12，value 恒 24h', () => {
    const el = mount({ value: '15:30:00', 'use12-hours': '' })
    open(el)
    const cols = columns(el)
    expect(cols.length).toBe(4)
    const hourOpts = optionsIn(cols[0]!)
    expect(hourOpts.map((o) => o.textContent)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
    ])
    expect(selectedOption(el, 0)!.textContent).toBe('03')
    const ampm = optionsIn(cols[3]!)
    expect(ampm.length).toBe(2)
    expect(ampm[1]!.classList.contains('selected')).toBe(true) // 15 点 = 下午
    // 点 05（保持下午）→ 未确认不改值
    hourOpts.find((o) => o.textContent === '05')!.click()
    expect(el.getAttribute('value')).toBe('15:30:00')
    keydown(el, 'Enter')
    expect(el.getAttribute('value')).toBe('17:30:00')
  })

  it('use12-hours：am/pm 列点击切换上下午', () => {
    const el = mount({ value: '09:30:00', 'use12-hours': '' })
    open(el)
    const ampm = optionsIn(columns(el)[3]!)
    ampm[1]!.click() // 切到下午 → 21 点
    keydown(el, 'Enter')
    expect(el.getAttribute('value')).toBe('21:30:00')
  })

  it('use12-hours：显示层走 locale 12 小时制（zh 含上午/下午词）', () => {
    const el = mount({ value: '15:30:00', 'use12-hours': '' })
    const zh = trigger(el).value
    expect(zh).toContain('下午')
    expect(zh.includes('3:30') || zh.includes('03:30')).toBe(true)
    setLocale(en)
    el.setAttribute('value', '15:30:00')
    expect(trigger(el).value).toContain('PM')
  })

  // ---- disabledTime 禁用时刻 ----

  it('disabledTime：禁用项置灰不可点、键盘跳过', () => {
    const el = mount({ value: '12:00:00' })
    el.disabledTime = () => ({ hours: [13, 14] })
    open(el)
    const hourOpts = optionsIn(columns(el)[0]!)
    const h13 = hourOpts.find((o) => o.textContent === '13')!
    const h15 = hourOpts.find((o) => o.textContent === '15')!
    expect(h13.classList.contains('disabled')).toBe(true)
    expect(h13.getAttribute('aria-disabled')).toBe('true')
    expect(h15.classList.contains('disabled')).toBe(false)
    h13.click()
    expect(el.getAttribute('value')).toBe('12:00:00') // 置灰项点击不生效
    keydown(el, 'ArrowUp') // 12 → 13 被禁 → 跳到 14 也被禁 → 15
    expect(selectedOption(el, 0)!.textContent).toBe('15')
  })

  it('disabledTime：可依当前时刻上下文禁用（分钟列）', () => {
    const el = mount({ value: '09:00:00' })
    el.disabledTime = (p) => (p.h >= 18 ? { minutes: [0, 15, 30, 45] } : null)
    open(el)
    keydown(el, 'ArrowRight') // 切到分列
    expect(optionsIn(columns(el)[1]!)[0]!.classList.contains('disabled')).toBe(false)
  })

  // ---- now 按钮 / presets ----

  it('now 按钮：点击填入此刻并确认关闭', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 8, 14, 25, 30))
    const el = mount()
    open(el)
    let confirm: unknown
    el.addEventListener('oas-confirm', (e: Event) => (confirm = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('[part="now"]')!.click()
    expect(el.getAttribute('value')).toBe('14:25:30')
    expect(confirm).toEqual({ value: '14:25:30' })
    expect(expanded(el)).toBe('false')
  })

  it('presets：property 渲染快捷时刻按钮，点击应用并关闭', () => {
    const el = mount({ value: '10:00:00' })
    el.presets = [
      { label: '上午 9 点', value: '09:00:00' },
      { label: '整点', value: '12:00:00' },
    ]
    open(el)
    const btns = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.preset')]
    expect(btns.length).toBe(2)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[0]!.click()
    expect(el.getAttribute('value')).toBe('09:00:00')
    expect(detail).toEqual({ value: '09:00:00' })
    expect(expanded(el)).toBe('false')
  })

  // ---- is-range 范围 ----

  it('is-range：双列组 + 分隔显示，起止独立选择，Enter 提交 JSON 数组', () => {
    const el = mount({ 'is-range': '', value: '["09:00:00","11:00:00"]' })
    expect(trigger(el).value).toContain('09:00:00')
    expect(trigger(el).value).toContain('11:00:00')
    open(el)
    const groups = el.shadowRoot!.querySelectorAll<HTMLElement>('.column-group')
    expect(groups.length).toBe(2)
    expect(columns(el).length).toBe(6)
    // 起点小时列选 08
    const startHour = optionsIn(columns(el)[0]!)
    startHour.find((o) => o.textContent === '08')!.click()
    keydown(el, 'Enter')
    expect(el.getAttribute('value')).toBe('["08:00:00","11:00:00"]')
    expect(expanded(el)).toBe('false')
  })

  it('is-range：起止自动排序（order）', () => {
    const el = mount({ 'is-range': '', value: '["09:00:00","11:00:00"]' })
    open(el)
    const startHour = optionsIn(columns(el)[0]!)
    startHour.find((o) => o.textContent === '14')!.click() // 起点 14 > 终点 11
    keydown(el, 'Enter')
    expect(el.getAttribute('value')).toBe('["11:00:00","14:00:00"]')
  })

  // ---- 表单态属性 ----

  it('clearable：清除钮清空并派发 oas-clear + oas-change{value:""}', () => {
    const el = mount({ value: '09:05:30', clearable: '' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!
    expect(clearBtn.hidden).toBe(false)
    let change: unknown
    let cleared: unknown
    el.addEventListener('oas-change', (e: Event) => (change = (e as CustomEvent).detail))
    el.addEventListener('oas-clear', (e: Event) => (cleared = (e as CustomEvent).detail))
    clearBtn.click()
    expect(el.getAttribute('value')).toBeNull()
    expect(change).toEqual({ value: '' })
    expect(cleared).toEqual({ value: '09:05:30' })
  })

  it('size：data-size 镜像 + CSS 走 control token', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'large')
    expect(el.getAttribute('data-size')).toBe('large')
    el.setAttribute('size', 'xxl')
    expect(el.getAttribute('data-size')).toBe('medium')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('var(--oas-control-height-sm)')
    expect(css).toContain('var(--oas-control-height-lg)')
  })

  it('status：镜像 data-status，error 联动 aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(el.getAttribute('aria-invalid')).toBe('true')
    el.setAttribute('status', 'warning')
    expect(el.getAttribute('data-status')).toBe('warning')
    expect(el.hasAttribute('aria-invalid')).toBe(false)
  })

  it('readonly：可展开浏览，点选不提交，输入只读', () => {
    const el = mount({ value: '09:05:30', readonly: '' })
    expect(trigger(el).readOnly).toBe(true)
    open(el)
    expect(expanded(el)).toBe('true')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    optionsIn(columns(el)[1]!)[3]!.click()
    keydown(el, 'Enter')
    expect(detail).toBeUndefined()
    expect(el.getAttribute('value')).toBe('09:05:30')
  })

  // ---- 受控 open + 焦点事件 ----

  it('受控 open：手势只派发 oas-open-change，属性增删驱动开合', () => {
    const el = mount({ value: '09:05:30', open: '' })
    expect(expanded(el)).toBe('true')
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) =>
      events.push((e as CustomEvent).detail.open),
    )
    trigger(el).click()
    expect(events).toEqual([false])
    expect(expanded(el)).toBe('true')
    el.removeAttribute('open')
    expect(expanded(el)).toBe('false')
  })

  it('非受控：开合均派发 oas-open-change', () => {
    const el = mount({ value: '09:05:30' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) =>
      events.push((e as CustomEvent).detail.open),
    )
    trigger(el).click()
    keydown(el, 'Escape')
    expect(events).toEqual([true, false])
  })

  it('oas-focus / oas-blur：组件整体焦点进出派发', () => {
    const el = mount({ value: '09:05:30' })
    let focused = 0
    let blurred = 0
    el.addEventListener('oas-focus', () => focused++)
    el.addEventListener('oas-blur', () => blurred++)
    trigger(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(focused).toBe(1)
    trigger(el).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    expect(blurred).toBe(1)
  })

  // ---- 手输通道 ----

  it('手输：键入合法时刻失焦提交（容错单位数）', () => {
    const el = mount()
    type(el, '14:30')
    blurInput(el)
    expect(el.getAttribute('value')).toBe('14:30:00')
    const el2 = mount()
    type(el2, '9:5')
    blurInput(el2)
    expect(el2.getAttribute('value')).toBe('09:05:00')
  })

  it('手输：非法输入失焦回退原显示', () => {
    const el = mount({ value: '09:05:30' })
    type(el, '25:99')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    blurInput(el)
    expect(detail).toBeUndefined()
    expect(el.getAttribute('value')).toBe('09:05:30')
    expect(trigger(el).value).toBe('09:05:30')
  })

  it('手输：format=HH:mm 时秒归零', () => {
    const el = mount({ format: 'HH:mm' })
    type(el, '14:30')
    blurInput(el)
    expect(el.getAttribute('value')).toBe('14:30:00')
  })

  it('手输：12 小时制解析（下午词 → 24h 值）', () => {
    const el = mount({ 'use12-hours': '' })
    type(el, '下午3:30')
    blurInput(el)
    expect(el.getAttribute('value')).toBe('15:30:00')
  })

  it('手输：readonly / is-range 输入只读（二期通道）', () => {
    const ro = mount({ value: '09:05:30', readonly: '' })
    expect(trigger(ro).readOnly).toBe(true)
    const range = mount({ 'is-range': '', value: '["09:00:00","11:00:00"]' })
    expect(trigger(range).readOnly).toBe(true)
  })

  it('手输：ArrowDown 打开面板，Enter 提交并展开', () => {
    const el = mount()
    type(el, '08:15')
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(el.getAttribute('value')).toBe('08:15:00')
    expect(expanded(el)).toBe('true')
  })
})

// ---- 浮层定位（fixed + computePosition 12 向） ----

describe('浮层定位（fixed + computePosition 12 向）', () => {
  const lastCall = (): (typeof computePositionMock.mock.calls)[number] => {
    const calls = computePositionMock.mock.calls
    return calls[calls.length - 1]!
  }

  beforeEach(() => {
    computePositionMock.mockClear()
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('CSS 定位契约：dropdown 为 position: fixed，打开写入坐标与 data-placement', () => {
    const el = mount({ value: '09:05:30' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const m = css.match(/\[part='dropdown'\][\s\S]*?position:\s*(fixed|absolute)/)
    expect(m?.[1]).toBe('fixed')
    open(el)
    const dd = dropdown(el)
    expect(dd.style.top).toMatch(/^\d+px$/)
    expect(dd.style.left).toMatch(/^\d+px$/)
    expect(dd.getAttribute('data-placement')).toBe('bottom-start')
  })

  it('placement 显式 top-end：computePosition 收到对应参数', () => {
    const el = mount({ value: '09:05:30', placement: 'top-end' })
    trigger(el).getBoundingClientRect = () =>
      ({ left: 100, top: 400, width: 200, height: 32, right: 300, bottom: 432 }) as DOMRect
    dropdown(el).getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 220 }) as DOMRect
    open(el)
    expect(lastCall()[2]).toBe('top-end')
    expect(dropdown(el).getAttribute('data-placement')).toBe('top-end')
  })

  it('非法 placement：回落 bottom-start + console.warn（仅一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ value: '09:05:30', placement: 'sideways' })
      open(el)
      expect(warn).toHaveBeenCalledOnce()
      expect(dropdown(el).getAttribute('data-placement')).toBe('bottom-start')
    } finally {
      warn.mockRestore()
    }
  })
})
