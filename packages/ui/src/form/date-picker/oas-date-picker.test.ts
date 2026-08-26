import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { computePosition } from '../../overlay/floating/index.js'
import { OASDatePicker } from './index.js'

// 包裹真实实现记录 computePosition 入参（行为不变），供浮层定位机制断言
vi.mock('../../overlay/floating/index.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../overlay/floating/index.js')>()
  return { ...mod, computePosition: vi.fn(mod.computePosition) }
})

const computePositionMock = vi.mocked(computePosition)

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

  // ---- shortcuts 快捷预设 ----

  it('shortcuts：property 渲染快捷按钮，点击应用值并派发 oas-change、关闭', () => {
    const el = mount({ value: '2026-08-09' })
    el.shortcuts = [
      { label: '明天', value: '2026-08-10' },
      { label: '下周一', getValue: () => new Date(2026, 7, 17) },
    ]
    open(el)
    const btns = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.shortcut')]
    expect(btns.length).toBe(2)
    expect(btns[0]!.textContent).toBe('明天')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[0]!.click()
    expect(el.getAttribute('value')).toBe('2026-08-10')
    expect(detail).toEqual({ value: '2026-08-10' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('shortcuts：getValue 形式应用日期', () => {
    const el = mount({ value: '2026-08-09' })
    el.shortcuts = [{ label: '下周一', getValue: () => new Date(2026, 7, 17) }]
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('.shortcut')!.click()
    expect(el.getAttribute('value')).toBe('2026-08-17')
    expect(detail).toEqual({ value: '2026-08-17' })
  })

  it('shortcuts：daterange 预设范围提交 JSON 数组', () => {
    const el = mount({ type: 'daterange' })
    el.shortcuts = [
      { label: '本周', value: ['2026-08-10', '2026-08-14'] },
      { label: '本月', getValue: () => [new Date(2026, 7, 1), new Date(2026, 7, 15)] },
    ]
    open(el)
    const btns = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.shortcut')]
    expect(btns.length).toBe(2)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[0]!.click()
    expect(el.getAttribute('value')).toBe('["2026-08-10","2026-08-14"]')
    expect(detail).toEqual({ value: ['2026-08-10', '2026-08-14'] })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    detail = undefined
    btns[1]!.click()
    expect(detail).toEqual({ value: ['2026-08-01', '2026-08-15'] })
  })

  it('shortcuts：未设置时 date 类型渲染内置「今天」预设（locale）', () => {
    const el = mount({ value: '2026-08-09' })
    open(el)
    const labels = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.shortcut')].map(
      (b) => b.textContent,
    )
    expect(labels).toContain('今天')
  })

  it('shortcuts：命中禁用日期时不应用', () => {
    const el = mount()
    el.disabledDate = (d) => d.getDate() === 10
    el.shortcuts = [{ label: '禁用日', value: '2026-08-10' }]
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('.shortcut')!.click()
    expect(detail).toBeUndefined()
    expect(el.getAttribute('value')).toBeNull()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
  })

  // ---- disabled-date 禁用日期 ----

  it('disabled-date：回调禁用日期置灰、aria-disabled、点击不提交', () => {
    const el = mount({ value: '2026-08-09' })
    el.disabledDate = (d) => d.getDate() === 15
    open(el)
    expect(day(el, '2026-08-15').classList.contains('disabled')).toBe(true)
    expect(day(el, '2026-08-15').getAttribute('aria-disabled')).toBe('true')
    expect(day(el, '2026-08-14').classList.contains('disabled')).toBe(false)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-15').click()
    expect(detail).toBeUndefined()
    expect(el.getAttribute('value')).toBe('2026-08-09')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('disabled-date：键盘导航跳过禁用日期', () => {
    const el = mount({ value: '2026-08-09' })
    el.disabledDate = (d) => d.getDate() === 10
    open(el)
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-09')
    grids(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    // 2026-08-10 被禁用 → 焦点停在原地不进入
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-09')
  })

  it('disabled-date：daterange 网格中禁用日期不可选', () => {
    const el = mount({ type: 'daterange', value: '["2026-08-05","2026-08-15"]' })
    el.disabledDate = (d) => d.getDate() === 20
    open(el)
    expect(day(el, '2026-08-20', 0).classList.contains('disabled')).toBe(true)
    expect(day(el, '2026-08-21', 0).classList.contains('disabled')).toBe(false)
  })

  // ---- multiple 多选 ----

  it('multiple：连续点选累加为 JSON 数组，面板保持打开，再点取消', () => {
    const el = mount({ value: '2026-08-09', multiple: '' })
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-10').click()
    expect(el.getAttribute('value')).toBe('["2026-08-09","2026-08-10"]')
    expect(detail).toEqual({ value: ['2026-08-09', '2026-08-10'] })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(day(el, '2026-08-09').classList.contains('selected')).toBe(true)
    expect(day(el, '2026-08-10').classList.contains('selected')).toBe(true)
    day(el, '2026-08-10').click()
    expect(el.getAttribute('value')).toBe('["2026-08-09"]')
    expect(day(el, '2026-08-10').classList.contains('selected')).toBe(false)
  })

  it('multiple：trigger 展示全部选中日期', () => {
    const el = mount({ value: '["2026-08-09","2026-08-10"]', multiple: '' })
    expect(trigger(el).textContent).toContain('2026-08-09')
    expect(trigger(el).textContent).toContain('2026-08-10')
  })

  it('multiple：受控模式外部改 value 同步面板高亮', () => {
    const el = mount({ value: '2026-08-09', multiple: '' })
    open(el)
    el.setAttribute('value', '["2026-08-09","2026-08-11"]')
    expect(day(el, '2026-08-09').classList.contains('selected')).toBe(true)
    expect(day(el, '2026-08-11').classList.contains('selected')).toBe(true)
    expect(day(el, '2026-08-10').classList.contains('selected')).toBe(false)
  })

  it('multiple：daterange 忽略 multiple，走范围语义', () => {
    const el = mount({ type: 'daterange', value: '["2026-08-05","2026-08-15"]', multiple: '' })
    open(el)
    expect(grids(el).length).toBe(2)
    day(el, '2026-08-20', 0).click()
    day(el, '2026-08-25', 0).click()
    expect(el.getAttribute('value')).toBe('["2026-08-20","2026-08-25"]')
  })
})

// ---- 浮层定位（placement / fixed 锚定） ----

describe('浮层定位（placement / fixed 锚定）', () => {
  function dropdownEl(el: OASDatePicker): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="dropdown"]')!
  }

  const lastCall = (): (typeof computePositionMock.mock.calls)[number] => {
    const calls = computePositionMock.mock.calls
    return calls[calls.length - 1]!
  }

  beforeEach(() => {
    computePositionMock.mockClear()
    // 固定视口几何，保证碰撞/翻转断言确定性（happy-dom 无真实布局，矩形需手摆）
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
  })

  it('默认 bottom-start：打开后写入 fixed 定位坐标与 data-placement', () => {
    const el = mount({ value: '2026-08-09' })
    open(el)
    const dd = dropdownEl(el)
    expect(dd.classList.contains('open')).toBe(true)
    expect(dd.style.top).toMatch(/^\d+px$/)
    expect(dd.style.left).toMatch(/^\d+px$/)
    expect(dd.getAttribute('data-placement')).toBe('bottom-start')
    expect(lastCall()[2]).toBe('bottom-start')
  })

  it('placement 显式 top-end：computePosition 收到对应参数（collisionPadding 8）', () => {
    const el = mount({ value: '2026-08-09', placement: 'top-end' })
    // 人为摆几何：锚点上方空间充足、右缘不出视口 → 无翻转/对齐调整，入参即声明值
    trigger(el).getBoundingClientRect = () =>
      ({ left: 100, top: 400, width: 200, height: 32, right: 300, bottom: 432 }) as DOMRect
    dropdownEl(el).getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect
    open(el)
    const call = lastCall()
    expect(call[2]).toBe('top-end')
    expect(call[6]).toEqual({ collisionPadding: 8 })
  })

  it('CSS 定位契约：dropdown 为 position: fixed（逃出祖先 overflow），不再 absolute left:0', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const m = css.match(/\[part='dropdown'\][\s\S]*?position:\s*(fixed|absolute)/)
    expect(m?.[1]).toBe('fixed')
    expect(css).toContain('position: fixed')
  })

  it('打开/关闭/再打开：fixed 定位路径不回归，每次展开重新锚定', () => {
    const el = mount({ value: '2026-08-09' })
    const dd = dropdownEl(el)
    open(el)
    expect(dd.classList.contains('open')).toBe(true)
    const afterFirst = computePositionMock.mock.calls.length
    expect(afterFirst).toBeGreaterThan(0)
    panel(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(dd.classList.contains('open')).toBe(false)
    const afterClose = computePositionMock.mock.calls.length
    open(el)
    expect(dd.classList.contains('open')).toBe(true)
    expect(computePositionMock.mock.calls.length).toBeGreaterThan(afterClose)
    expect(dd.getAttribute('data-placement')).toBe('bottom-start')
  })

  it('range 宽面板贴视口右缘：交叉轴翻转 bottom-end（右对齐）后再交引擎夹取', () => {
    const el = mount({ type: 'daterange' })
    trigger(el).getBoundingClientRect = () =>
      ({ left: 900, top: 100, width: 200, height: 32, right: 1100, bottom: 132 }) as DOMRect
    dropdownEl(el).getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 480, height: 300 }) as DOMRect
    open(el)
    const call = lastCall()
    expect(call[2]).toBe('bottom-end')
    expect(dropdownEl(el).getAttribute('data-placement')).toBe('bottom-end')
    // end 对齐仍溢出时引擎做视口夹取：结果不越视口
    expect(Number.parseInt(dropdownEl(el).style.left, 10)).toBeLessThan(1024)
  })

  it('非法 placement：回落 bottom-start + console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ value: '2026-08-09', placement: 'sideways' })
      open(el)
      expect(warn).toHaveBeenCalledOnce()
      expect(String(warn.mock.calls[0]![0])).toContain('bottom-start')
      expect(dropdownEl(el).getAttribute('data-placement')).toBe('bottom-start')
    } finally {
      warn.mockRestore()
    }
  })
})
