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

  it('template[slot="cell"] 克隆到日单元格，data-cell-date 绑定日期数字', () => {
    const el = new OASCalendar()
    el.setAttribute('value', '2026-08-09')
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'cell')
    tpl.innerHTML = '<span class="dot"></span><span data-cell-date></span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    const btn = day(el, '2026-08-15')
    expect(btn.querySelector('.dot')).not.toBeNull()
    expect(btn.querySelector('[data-cell-date]')!.textContent).toBe('15')
  })

  it('oas-cell-render 每个日单元格派发 { date, element }，宿主可标记节假日', () => {
    const el = new OASCalendar()
    el.setAttribute('value', '2026-08-09')
    const marked: Array<{ iso: string; text: string }> = []
    el.addEventListener('oas-cell-render', (e: Event) => {
      const { date, element } = (e as CustomEvent).detail as {
        date: Date
        element: HTMLElement
      }
      if (date.getMonth() === 7 && (date.getDate() === 1 || date.getDate() === 15)) {
        element.classList.add('holiday')
        const dot = document.createElement('span')
        dot.className = 'cell-dot'
        element.appendChild(dot)
      }
      marked.push({ iso: toISO(date), text: element.textContent ?? '' })
    })
    document.body.appendChild(el)
    expect(day(el, '2026-08-01').classList.contains('holiday')).toBe(true)
    expect(day(el, '2026-08-15').querySelector('.cell-dot')).not.toBeNull()
    expect(day(el, '2026-08-02').classList.contains('holiday')).toBe(false)
    // 42 格全部派发（含前后月补位）
    expect(marked.length).toBeGreaterThanOrEqual(42)
    expect(marked.some((m) => m.iso === '2026-08-01' && m.text === '1')).toBe(true)
    // 重新导航重渲染后标记保持（宿主监听幂等重写）
    el.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!.click()
    expect(day(el, '2026-09-15').classList.contains('holiday')).toBe(false)
    expect(el.shadowRoot!.querySelectorAll('.day.holiday').length).toBe(0)
  })

  it('year 模式点击月份：value 更新 yyyy-MM、切回 month 视图并派发 oas-mode-change', () => {
    const el = mount({ value: '2026-07', mode: 'year' })
    const events: Array<[string, unknown]> = []
    el.addEventListener('oas-change', (e: Event) =>
      events.push(['change', (e as CustomEvent).detail]),
    )
    el.addEventListener('oas-mode-change', (e: Event) =>
      events.push(['mode', (e as CustomEvent).detail]),
    )
    el.shadowRoot!.querySelectorAll('.month-cell')[6]!.dispatchEvent(new MouseEvent('click'))
    expect(events).toContainEqual(['change', { value: '2026-07' }])
    expect(events).toContainEqual(['mode', { mode: 'month' }])
    expect(el.getAttribute('mode')).toBe('month')
    // 回到月视图：标题 + 日网格，选中 7 月 1 日
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年7月')
    expect(el.shadowRoot!.querySelectorAll('.day').length).toBeGreaterThan(0)
    expect(day(el, '2026-07-01').classList.contains('selected')).toBe(true)
  })

  it('e2e 场景锁定：month 起始 → 宿主切 year → 选月 → oas-mode-change 与 oas-change 均派发', () => {
    // 复现 qa-regression「模式切换」用例的完整链路：
    // 默认 month 视图 → 宿主 setAttribute('mode','year') → 点 2026 年 7 月
    const el = mount({ value: '2026-08-09' })
    const events: Array<[string, unknown]> = []
    el.addEventListener('oas-change', (e: Event) =>
      events.push(['change', (e as CustomEvent).detail]),
    )
    el.addEventListener('oas-mode-change', (e: Event) =>
      events.push(['mode', (e as CustomEvent).detail]),
    )
    el.setAttribute('mode', 'year')
    el.shadowRoot!.querySelectorAll('.month-cell')[6]!.dispatchEvent(new MouseEvent('click'))
    // 两个事件都派发：选月切回月视图 + value 更新
    expect(events).toContainEqual(['mode', { mode: 'year' }])
    expect(events).toContainEqual(['mode', { mode: 'month' }])
    expect(events).toContainEqual(['change', { value: '2026-07' }])
    // 终态：month 视图 + 值已更新（与 demo 反馈展示顺序无关）
    expect(el.getAttribute('value')).toBe('2026-07')
    expect(el.getAttribute('mode')).toBe('month')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年7月')
  })

  it('mode 属性变化即时切换 month/year 视图', () => {
    const el = mount({ value: '2026-08-09' })
    expect(el.shadowRoot!.querySelectorAll('.day').length).toBe(42)
    el.setAttribute('mode', 'year')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年')
    expect(el.shadowRoot!.querySelectorAll('.month-cell').length).toBe(12)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="today"]')!.hidden).toBe(true)
    el.setAttribute('mode', 'month')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('2026年8月')
    expect(el.shadowRoot!.querySelectorAll('.day').length).toBe(42)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="today"]')!.hidden).toBe(false)
  })

  it('year 模式键盘方向键不拦截（原生按钮可达），停留年视图', () => {
    const el = mount({ value: '2026-07', mode: 'year' })
    grid(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('.month-cell').length).toBe(12)
    expect(el.getAttribute('mode')).toBe('year')
  })

  it('宿主设置 mode 属性同样派发 oas-mode-change（受控通知）', () => {
    const el = mount({ value: '2026-08-09' })
    const details: unknown[] = []
    el.addEventListener('oas-mode-change', (e: Event) =>
      details.push((e as CustomEvent).detail),
    )
    el.setAttribute('mode', 'year')
    expect(details).toEqual([{ mode: 'year' }])
    el.setAttribute('mode', 'month')
    expect(details).toEqual([{ mode: 'year' }, { mode: 'month' }])
    // 重复设置同值不重复派发
    el.setAttribute('mode', 'month')
    expect(details).toEqual([{ mode: 'year' }, { mode: 'month' }])
  })
})

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
