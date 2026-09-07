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

function trigger(el: OASDatePicker): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
}

function input(el: OASDatePicker): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('input[part="trigger"]')!
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

function expanded(el: OASDatePicker): string | null {
  return input(el).getAttribute('aria-expanded')
}

function rovingFocus(el: OASDatePicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.day[tabindex="0"]')!
}

function gridKey(el: OASDatePicker, key: string, gridIndex = 0): void {
  grids(el)[gridIndex]!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function type(el: OASDatePicker, text: string): void {
  const i = input(el)
  i.value = text
  i.dispatchEvent(new Event('input', { bubbles: true }))
}

function blurInput(el: OASDatePicker): void {
  input(el).dispatchEvent(new FocusEvent('blur'))
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
    expect(input(el).getAttribute('role')).toBe('combobox')
    expect(input(el).placeholder).toContain('请选择日期')
  })

  it('value 按 format 格式化展示（Intl token）', () => {
    const el = mount({ value: '2026-08-09' })
    expect(input(el).value).toBe('2026-08-09')
    el.setAttribute('format', 'yyyy/MM/dd')
    expect(input(el).value).toBe('2026/08/09')
  })

  it('date：打开面板显示月网格，点击日期提交并关闭，派发 oas-change', () => {
    const el = mount({ value: '2026-08-09' })
    open(el)
    expect(expanded(el)).toBe('true')
    expect(grids(el).length).toBe(1)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-15').click()
    expect(el.getAttribute('value')).toBe('2026-08-15')
    expect(detail).toEqual({ value: '2026-08-15' })
    expect(expanded(el)).toBe('false')
    expect(input(el).value).toBe('2026-08-15')
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
    gridKey(el, 'ArrowRight')
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-10')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    gridKey(el, 'Enter')
    expect(detail).toEqual({ value: '2026-08-10' })
    expect(expanded(el)).toBe('false')
  })

  it('Esc 关闭面板，外部点击关闭', () => {
    const el = mount({ value: '2026-08-09' })
    open(el)
    panel(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(expanded(el)).toBe('false')
    open(el)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(expanded(el)).toBe('false')
  })

  it('disabled 时不可打开', () => {
    const el = mount({ disabled: '' })
    expect(input(el).disabled).toBe(true)
    trigger(el).click()
    expect(expanded(el)).toBe('false')
  })

  it('month 类型：12 个月面板，选月提交 yyyy-MM', () => {
    const el = mount({ type: 'month', value: '2026-08' })
    expect(input(el).value).toBe('2026-08')
    open(el)
    const months = el.shadowRoot!.querySelectorAll('.month-cell')
    expect(months.length).toBe(12)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(months[6] as HTMLElement).click()
    expect(detail).toEqual({ value: '2026-07' })
    expect(el.getAttribute('value')).toBe('2026-07')
    expect(expanded(el)).toBe('false')
  })

  it('daterange：双月网格，先选起点再选终点，提交 JSON 数组', () => {
    const el = mount({ type: 'daterange', value: '["2026-08-05","2026-08-15"]' })
    expect(input(el).value).toContain('2026-08-05')
    expect(input(el).value).toContain('2026-08-15')
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
    expect(expanded(el)).toBe('false')
  })

  it('daterange：终点早于起点时重置起点，不提交', () => {
    const el = mount({ type: 'daterange', value: '["2026-08-10","2026-08-20"]' })
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-10').click() // 已有完整范围，重选起点
    day(el, '2026-08-01').click() // 早于起点 → 重置起点
    expect(expanded(el)).toBe('true')
    expect(detail).toBeUndefined()
    expect(day(el, '2026-08-01').classList.contains('range-start')).toBe(true)
    expect(day(el, '2026-08-10').classList.contains('range-start')).toBe(false)
  })

  it('datetime：日期 + 时间选择，确定提交完整值，派发 oas-confirm', () => {
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
    let change: unknown
    let confirm: unknown
    el.addEventListener('oas-change', (e: Event) => (change = (e as CustomEvent).detail))
    el.addEventListener('oas-confirm', (e: Event) => (confirm = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('[part="confirm"]')!.click()
    expect(el.getAttribute('value')).toBe('2026-08-09T09:30:00')
    expect(change).toEqual({ value: '2026-08-09T09:30:00' })
    expect(confirm).toEqual({ value: '2026-08-09T09:30:00' })
    expect(expanded(el)).toBe('false')
    expect(input(el).value).toBe('2026-08-09 09:30:00')
  })

  it('受控：外部改 value 即时反映到 trigger', () => {
    const el = mount({ value: '2026-08-09' })
    el.setAttribute('value', '2026-08-20')
    expect(input(el).value).toBe('2026-08-20')
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
    expect(expanded(el)).toBe('false')
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
    expect(expanded(el)).toBe('false')
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

  it('shortcuts：datetime / month 类型补齐内置预设', () => {
    const dt = mount({ type: 'datetime', value: '2026-08-09T09:30:00' })
    open(dt)
    const dtLabels = [...dt.shadowRoot!.querySelectorAll<HTMLElement>('.shortcut')].map(
      (b) => b.textContent,
    )
    expect(dtLabels).toContain('今天')
    const mo = mount({ type: 'month', value: '2026-08' })
    open(mo)
    const moLabels = [...mo.shadowRoot!.querySelectorAll<HTMLElement>('.shortcut')].map(
      (b) => b.textContent,
    )
    expect(moLabels).toContain('本月')
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
    expect(expanded(el)).toBe('true')
  })

  it('shortcuts-position=left：面板侧栏布局（类钩子 + CSS 规则）', () => {
    const el = mount({ type: 'daterange', 'shortcuts-position': 'left' })
    open(el)
    expect(panel(el).classList.contains('shortcuts-left')).toBe(true)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.panel.shortcuts-left')
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
    expect(expanded(el)).toBe('true')
  })

  it('disabled-date：键盘导航跳过禁用日期', () => {
    const el = mount({ value: '2026-08-09' })
    el.disabledDate = (d) => d.getDate() === 10
    open(el)
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-09')
    gridKey(el, 'ArrowRight')
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
    expect(expanded(el)).toBe('true')
    expect(day(el, '2026-08-09').classList.contains('selected')).toBe(true)
    expect(day(el, '2026-08-10').classList.contains('selected')).toBe(true)
    day(el, '2026-08-10').click()
    expect(el.getAttribute('value')).toBe('["2026-08-09"]')
    expect(day(el, '2026-08-10').classList.contains('selected')).toBe(false)
  })

  it('multiple：trigger 展示全部选中日期', () => {
    const el = mount({ value: '["2026-08-09","2026-08-10"]', multiple: '' })
    expect(input(el).value).toContain('2026-08-09')
    expect(input(el).value).toContain('2026-08-10')
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

// ---- type 面板族补齐（year / week / quarter / monthrange / yearrange / datetimerange） ----

describe('type 面板族补齐', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('year：12 格年面板，选年提交 yyyy，min/max 界外置灰', () => {
    const el = mount({ type: 'year', value: '2026' })
    expect(input(el).value).toBe('2026')
    open(el)
    const cells = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.year-cell')]
    expect(cells.length).toBe(12)
    expect(panel(el).querySelector<HTMLElement>('[part="title"]')!.textContent).toContain('2020')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    cells.find((c) => c.textContent === '2024')!.click()
    expect(el.getAttribute('value')).toBe('2024')
    expect(detail).toEqual({ value: '2024' })
    expect(expanded(el)).toBe('false')
    // min/max 界外年置灰
    const bounded = mount({ type: 'year', value: '2026', min: '2024-01-01', max: '2028-12-31' })
    open(bounded)
    const bc = [...bounded.shadowRoot!.querySelectorAll<HTMLElement>('.year-cell')]
    expect(bc.find((c) => c.textContent === '2023')!.classList.contains('disabled')).toBe(true)
    expect(bc.find((c) => c.textContent === '2026')!.classList.contains('disabled')).toBe(false)
  })

  it('year：翻页按 12 年步进（标题区间平移）', () => {
    const el = mount({ type: 'year', value: '2026' })
    open(el)
    panel(el).querySelector<HTMLElement>('[part="next"]')!.click()
    const title = panel(el).querySelector<HTMLElement>('[part="title"]')!.textContent!
    expect(title).toContain('2032')
    expect(title).toContain('2043')
  })

  it('week：点击日期提交 ISO 周值 yyyy-Wnn，整周高亮', () => {
    const el = mount({ type: 'week', value: '2026-W32' })
    expect(input(el).value).toBe('2026-W32')
    open(el)
    // W32 = 2026-08-03（周一）~ 2026-08-09（周日），整行高亮
    for (let d = 3; d <= 9; d++) {
      const iso = `2026-08-${String(d).padStart(2, '0')}`
      expect(day(el, iso).classList.contains('selected')).toBe(true)
    }
    expect(day(el, '2026-08-10').classList.contains('selected')).toBe(false)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-20').click() // 周四 → W34
    expect(el.getAttribute('value')).toBe('2026-W34')
    expect(detail).toEqual({ value: '2026-W34' })
    expect(expanded(el)).toBe('false')
  })

  it('quarter：四格季度面板，选季度提交 yyyy-Qn', () => {
    const el = mount({ type: 'quarter', value: '2026-Q3' })
    expect(input(el).value).toBe('2026-Q3')
    open(el)
    const cells = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.quarter-cell')]
    expect(cells.length).toBe(4)
    expect(cells[2]!.classList.contains('selected')).toBe(true)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    cells[0]!.click()
    expect(el.getAttribute('value')).toBe('2026-Q1')
    expect(detail).toEqual({ value: '2026-Q1' })
    expect(expanded(el)).toBe('false')
  })

  it('monthrange：双年面板起止选月，提交 JSON 数组，区间高亮，派发 oas-calendar-change', () => {
    const el = mount({ type: 'monthrange', value: '["2026-01","2026-06"]' })
    expect(input(el).value).toContain('2026-01')
    expect(input(el).value).toContain('2026-06')
    open(el)
    const cells = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.month-cell')]
    expect(cells.length).toBe(24)
    const calEvents: unknown[] = []
    el.addEventListener('oas-calendar-change', (e: Event) =>
      calEvents.push((e as CustomEvent).detail),
    )
    cells.find((c) => c.getAttribute('data-month') === '2026-03')!.click()
    expect(calEvents[0]).toEqual({ value: ['2026-03', null] })
    cells.find((c) => c.getAttribute('data-month') === '2026-08')!.click()
    expect(calEvents[1]).toEqual({ value: ['2026-03', '2026-08'] })
    expect(el.getAttribute('value')).toBe('["2026-03","2026-08"]')
    expect(expanded(el)).toBe('false')
  })

  it('yearrange：双年面板起止选年，提交 JSON 数组', () => {
    const el = mount({ type: 'yearrange', value: '["2024","2026"]' })
    open(el)
    const cells = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.year-cell')]
    expect(cells.length).toBe(24)
    cells.find((c) => c.textContent === '2022')!.click()
    cells.find((c) => c.textContent === '2025')!.click()
    expect(el.getAttribute('value')).toBe('["2022","2025"]')
    expect(expanded(el)).toBe('false')
  })

  it('datetimerange：双月 + 起止时间区 + 确定提交，派发 oas-change / oas-confirm / oas-calendar-change', () => {
    const el = mount({ type: 'datetimerange', value: '["2026-08-10T09:00:00","2026-08-20T18:00:00"]' })
    open(el)
    expect(grids(el).length).toBe(2)
    const calEvents: unknown[] = []
    el.addEventListener('oas-calendar-change', (e: Event) =>
      calEvents.push((e as CustomEvent).detail),
    )
    day(el, '2026-08-05').click()
    day(el, '2026-08-15').click()
    expect(calEvents[0]).toEqual({ value: ['2026-08-05', null] })
    expect(calEvents[1]).toEqual({ value: ['2026-08-05', '2026-08-15'] })
    // 起止时间独立可选
    const startHour = el.shadowRoot!.querySelector<HTMLElement>(
      '.time-section[data-side="start"] .time-col[data-unit="h"] .time-option[data-value="8"]',
    )!
    const endHour = el.shadowRoot!.querySelector<HTMLElement>(
      '.time-section[data-side="end"] .time-col[data-unit="h"] .time-option[data-value="20"]',
    )!
    startHour.click()
    endHour.click()
    let change: unknown
    let confirm: unknown
    el.addEventListener('oas-change', (e: Event) => (change = (e as CustomEvent).detail))
    el.addEventListener('oas-confirm', (e: Event) => (confirm = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('[part="confirm"]')!.click()
    expect(el.getAttribute('value')).toBe('["2026-08-05T08:00:00","2026-08-15T20:00:00"]')
    expect(change).toEqual({ value: ['2026-08-05T08:00:00', '2026-08-15T20:00:00'] })
    expect(confirm).toEqual({ value: ['2026-08-05T08:00:00', '2026-08-15T20:00:00'] })
    expect(expanded(el)).toBe('false')
  })
})

// ---- 表单态属性（clearable / size / status / readonly） ----

describe('表单态属性', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('clearable：有值时显示清除钮，点击清空并派发 oas-change{value:""} 与 oas-clear', () => {
    const el = mount({ value: '2026-08-09', clearable: '' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!
    expect(clearBtn.hidden).toBe(false)
    let change: unknown
    let cleared: unknown
    el.addEventListener('oas-change', (e: Event) => (change = (e as CustomEvent).detail))
    el.addEventListener('oas-clear', (e: Event) => (cleared = (e as CustomEvent).detail))
    clearBtn.click()
    expect(el.getAttribute('value')).toBeNull()
    expect(change).toEqual({ value: '' })
    expect(cleared).toEqual({ value: '2026-08-09' })
    expect(input(el).value).toBe('')
  })

  it('clearable：无值 / 禁用 / 只读时清除钮隐藏或不可用', () => {
    const empty = mount({ clearable: '' })
    expect(empty.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.hidden).toBe(true)
    const ro = mount({ value: '2026-08-09', clearable: '', readonly: '' })
    ro.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.click()
    expect(ro.getAttribute('value')).toBe('2026-08-09')
    const dis = mount({ value: '2026-08-09', clearable: '', disabled: '' })
    expect(dis.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.hidden).toBe(true)
  })

  it('clearable：daterange 清空派发数组语义 oas-clear', () => {
    const el = mount({ type: 'daterange', value: '["2026-08-05","2026-08-15"]', clearable: '' })
    let cleared: unknown
    el.addEventListener('oas-clear', (e: Event) => (cleared = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.click()
    expect(cleared).toEqual({ value: ['2026-08-05', '2026-08-15'] })
  })

  it('size：data-size 镜像（small/large，非法回落 medium），CSS 走 control token', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'large')
    expect(el.getAttribute('data-size')).toBe('large')
    el.setAttribute('size', 'huge')
    expect(el.getAttribute('data-size')).toBe('medium')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-size='small']")
    expect(css).toContain("[data-size='large']")
    expect(css).toContain('var(--oas-control-height-sm)')
    expect(css).toContain('var(--oas-control-height-lg)')
  })

  it('status：success/warning/error 镜像 data-status，error 联动 aria-invalid', () => {
    const ok = mount({ status: 'success' })
    expect(ok.getAttribute('data-status')).toBe('success')
    const warn = mount({ status: 'warning' })
    expect(warn.getAttribute('data-status')).toBe('warning')
    const err = mount({ status: 'error' })
    expect(err.getAttribute('data-status')).toBe('error')
    expect(err.getAttribute('aria-invalid')).toBe('true')
    err.setAttribute('status', '')
    expect(err.hasAttribute('data-status')).toBe(false)
    expect(err.hasAttribute('aria-invalid')).toBe(false)
    const css = err.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-status='error']")
    expect(css).toContain("[data-status='warning']")
    expect(css).toContain("[data-status='success']")
  })

  it('readonly：面板可展开浏览，但点选/快捷/清除不提交', () => {
    const el = mount({ value: '2026-08-09', readonly: '' })
    expect(input(el).readOnly).toBe(true)
    open(el)
    expect(expanded(el)).toBe('true')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    day(el, '2026-08-15').click()
    expect(detail).toBeUndefined()
    expect(el.getAttribute('value')).toBe('2026-08-09')
    expect(expanded(el)).toBe('true')
    // 键盘导航仍可用（浏览）
    gridKey(el, 'ArrowRight')
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-10')
  })
})

// ---- 受控 open + 事件（open-change / focus / blur） ----

describe('受控 open 与事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('初始 open 属性：挂载即展开面板（不抢焦点）', () => {
    const el = mount({ value: '2026-08-09', open: '' })
    expect(expanded(el)).toBe('true')
    expect(grids(el).length).toBe(1)
  })

  it('受控模式：trigger 手势只派发 oas-open-change，不自行开合', () => {
    const el = mount({ value: '2026-08-09', open: '' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) =>
      events.push((e as CustomEvent).detail.open),
    )
    trigger(el).click()
    expect(events).toEqual([false])
    expect(expanded(el)).toBe('true') // 属性仍在场 → 保持展开
    el.removeAttribute('open')
    expect(expanded(el)).toBe('false')
    el.setAttribute('open', '')
    expect(expanded(el)).toBe('true')
  })

  it('非受控：开合均派发 oas-open-change', () => {
    const el = mount({ value: '2026-08-09' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) =>
      events.push((e as CustomEvent).detail.open),
    )
    trigger(el).click()
    expect(events).toEqual([true])
    panel(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(events).toEqual([true, false])
  })

  it('oas-focus / oas-blur：组件整体焦点进出派发（内部转移不误报）', () => {
    const el = mount({ value: '2026-08-09' })
    let focused = 0
    let blurred = 0
    el.addEventListener('oas-focus', () => focused++)
    el.addEventListener('oas-blur', () => blurred++)
    input(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(focused).toBe(1)
    // 组件内转移（input → 面板日格）不派发 blur
    rovingRef(el)?.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: rovingRef(el) }),
    )
    expect(blurred).toBe(0)
    input(el).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    expect(blurred).toBe(1)
  })

  function rovingRef(el: OASDatePicker): HTMLElement | null {
    return el.shadowRoot!.querySelector('.day')
  }
})

// ---- 面板能力（unlink-panels / default-value / 周号 / 周起始 / 键盘 / 导航边界 / cell 渲染） ----

describe('面板能力', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('oas-calendar-change：daterange 起止落选即派发', () => {
    const el = mount({ type: 'daterange', 'default-value': '2026-08-01' })
    open(el)
    const events: unknown[] = []
    el.addEventListener('oas-calendar-change', (e: Event) =>
      events.push((e as CustomEvent).detail),
    )
    day(el, '2026-08-10').click()
    day(el, '2026-08-20').click()
    expect(events[0]).toEqual({ value: ['2026-08-10', null] })
    expect(events[1]).toEqual({ value: ['2026-08-10', '2026-08-20'] })
  })

  it('unlink-panels：双月各自独立翻页；默认联动同翻', () => {
    const linked = mount({ type: 'daterange', value: '["2026-08-05","2026-08-15"]' })
    open(linked)
    const titles = () =>
      [...linked.shadowRoot!.querySelectorAll<HTMLElement>('.range-grid .title')].map(
        (t) => t.textContent,
      )
    expect(titles()[0]).toContain('2026年8月')
    expect(titles()[1]).toContain('2026年9月')
    linked.shadowRoot!.querySelectorAll<HTMLElement>('.range-grid [part="next"]')[0]!.click()
    expect(titles()[0]).toContain('2026年9月')
    expect(titles()[1]).toContain('2026年10月')

    const unlinked = mount({
      type: 'daterange',
      value: '["2026-08-05","2026-08-15"]',
      'unlink-panels': '',
    })
    open(unlinked)
    const titles2 = () =>
      [...unlinked.shadowRoot!.querySelectorAll<HTMLElement>('.range-grid .title')].map(
        (t) => t.textContent,
      )
    unlinked.shadowRoot!.querySelectorAll<HTMLElement>('.range-grid [part="next"]')[0]!.click()
    expect(titles2()[0]).toContain('2026年9月')
    expect(titles2()[1]).toContain('2026年9月') // 第二面板不动
  })

  it('default-value：空值打开面板锚定初始月', () => {
    const el = mount({ 'default-value': '2026-08-15' })
    open(el)
    const title = panel(el).querySelector<HTMLElement>('[part="title"]')!.textContent!
    expect(title).toContain('2026年8月')
    expect(day(el, '2026-08-15')).toBeTruthy()
  })

  it('show-week-number：网格出现周号列', () => {
    const el = mount({ value: '2026-08-09', 'show-week-number': '' })
    open(el)
    const grid = grids(el)[0]!
    expect(grid.classList.contains('has-week-number')).toBe(true)
    expect(grid.querySelectorAll('.week-number').length).toBeGreaterThan(4)
  })

  it('first-day-of-week 覆写周起始（默认 zh 周一，覆写 0 周日）', () => {
    const def = mount({ value: '2026-08-09' })
    open(def)
    expect(grids(def)[0]!.querySelector<HTMLButtonElement>('.day')!.getAttribute('data-date')).toBe(
      '2026-07-27',
    )
    const sun = mount({ value: '2026-08-09', 'first-day-of-week': '0' })
    open(sun)
    expect(grids(sun)[0]!.querySelector<HTMLButtonElement>('.day')!.getAttribute('data-date')).toBe(
      '2026-07-26',
    )
  })

  it('键盘：Home/End 跳周首尾，PageUp/PageDown 换月（Shift 换年），自动换页跟随', () => {
    const el = mount({ value: '2026-08-09' }) // 周日，所在周为 08-03 ~ 08-09
    open(el)
    gridKey(el, 'Home')
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-03')
    gridKey(el, 'End')
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-08-09')
    gridKey(el, 'PageDown')
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-09-09')
    expect(panel(el).querySelector<HTMLElement>('[part="title"]')!.textContent).toContain('2026年9月')
    gridKey(el, 'PageUp', 0)
    gridKey(el, 'PageUp', 0)
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2026-07-09')
    grids(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', shiftKey: true, bubbles: true }))
    expect(rovingFocus(el).getAttribute('data-date')).toBe('2025-07-09')
  })

  it('min/max 导航边界：翻页到界置灰', () => {
    const el = mount({ value: '2026-08-15', min: '2026-08-01', max: '2026-08-31' })
    open(el)
    const prev = panel(el).querySelector<HTMLButtonElement>('[part="prev"]')!
    const next = panel(el).querySelector<HTMLButtonElement>('[part="next"]')!
    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(true)
    const free = mount({ value: '2026-08-15' })
    open(free)
    expect(panel(free).querySelector<HTMLButtonElement>('[part="prev"]')!.disabled).toBe(false)
    // month 面板按年界置灰
    const mo = mount({ type: 'month', value: '2026-08', min: '2026-01-01', max: '2026-12-31' })
    open(mo)
    expect(panel(mo).querySelector<HTMLButtonElement>('[part="prev"]')!.disabled).toBe(true)
    expect(panel(mo).querySelector<HTMLButtonElement>('[part="next"]')!.disabled).toBe(true)
  })

  it('cell 渲染钩子：oas-cell-render 逐格派发，template[slot=cell] 克隆进单元格', () => {
    const el = mount({ value: '2026-08-09' })
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'cell')
    tpl.innerHTML = '<span class="cell-dot"></span><span data-cell-date></span>'
    el.appendChild(tpl)
    const rendered: { date: Date; element: HTMLElement }[] = []
    el.addEventListener('oas-cell-render', (e: Event) => {
      const d = (e as CustomEvent).detail
      rendered.push({ date: d.date, element: d.element })
    })
    open(el)
    const dayCount = el.shadowRoot!.querySelectorAll('.day').length
    expect(rendered.length).toBe(dayCount)
    const aug1 = day(el, '2026-08-01')
    expect(aug1.querySelector('.cell-dot')).not.toBeNull()
    expect(aug1.querySelector<HTMLElement>('[data-cell-date]')!.textContent).toBe('1')
  })
})

// ---- 手输通道（单值类型：date / month / year / week / datetime） ----

describe('手输通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('date：键入合法日期失焦提交，派发 oas-change', () => {
    const el = mount()
    type(el, '2026-08-15')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    blurInput(el)
    expect(el.getAttribute('value')).toBe('2026-08-15')
    expect(detail).toEqual({ value: '2026-08-15' })
    expect(input(el).value).toBe('2026-08-15')
  })

  it('date：非法输入失焦回退原显示，不提交', () => {
    const el = mount({ value: '2026-08-09' })
    type(el, 'not-a-date')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    blurInput(el)
    expect(detail).toBeUndefined()
    expect(el.getAttribute('value')).toBe('2026-08-09')
    expect(input(el).value).toBe('2026-08-09')
  })

  it('date：容错分隔符（2026/8/5）与 Enter 提交', () => {
    const el = mount()
    type(el, '2026/8/5')
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('2026-08-05')
  })

  it('month / year / week / datetime：按值格式键入提交', () => {
    const mo = mount({ type: 'month' })
    type(mo, '2026年8月')
    blurInput(mo)
    expect(mo.getAttribute('value')).toBe('2026-08')

    const yr = mount({ type: 'year' })
    type(yr, '2026')
    blurInput(yr)
    expect(yr.getAttribute('value')).toBe('2026')

    const wk = mount({ type: 'week' })
    type(wk, '2026-W32')
    blurInput(wk)
    expect(wk.getAttribute('value')).toBe('2026-W32')

    const dt = mount({ type: 'datetime' })
    type(dt, '2026-08-15 09:30')
    blurInput(dt)
    expect(dt.getAttribute('value')).toBe('2026-08-15T09:30:00')
  })

  it('month：键入 2026-08 数字形式提交', () => {
    const el = mount({ type: 'month' })
    type(el, '2026-08')
    blurInput(el)
    expect(el.getAttribute('value')).toBe('2026-08')
  })

  it('键入值命中 min/禁用日期时不提交并回退', () => {
    const el = mount({ value: '2026-08-09', min: '2026-08-10' })
    type(el, '2026-08-05')
    blurInput(el)
    expect(el.getAttribute('value')).toBe('2026-08-09')
    expect(input(el).value).toBe('2026-08-09')
  })

  it('readonly / 范围与多选形态输入只读（二期通道）', () => {
    const ro = mount({ value: '2026-08-09', readonly: '' })
    expect(input(ro).readOnly).toBe(true)
    const range = mount({ type: 'daterange', value: '["2026-08-05","2026-08-15"]' })
    expect(input(range).readOnly).toBe(true)
    const multi = mount({ value: '2026-08-09', multiple: '' })
    expect(input(multi).readOnly).toBe(true)
  })

  it('ArrowDown 打开面板，Esc 关闭并回退未提交输入', () => {
    const el = mount({ value: '2026-08-09' })
    type(el, '2026-08-15')
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(expanded(el)).toBe('true')
    panel(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(expanded(el)).toBe('false')
    expect(el.getAttribute('value')).toBe('2026-08-15') // ArrowDown 已提交合法键入
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
