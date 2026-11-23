import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASTimeSelect } from './index.js'

// 设计前必答 6 问的测试映射：
// 1. 取消路径：无浮层/无计时器；空时段集合渲染空态文案而非空白块
// 2. 默认值：days=3 / mode=express / value 自动取首个可用时段 / slots 缺省空态
// 3. 多步交互失败点：点击休息或满约时段不改变值也不派发事件；非法 JSON 告警一次并回落
// 4. 破坏性：无破坏性操作；disabled 全量禁用
// 5. 键盘 / ARIA：日期列 tablist + tab、时段网格 radiogroup + radio，两处各自 roving tabindex
// 6. 双通道：value / days 属性与 property 双向，赋值不派发事件

const START = '2026-01-05'

function mount(attrs: Record<string, string> = {}): OASTimeSelect {
  const el = new OASTimeSelect()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

function dates(el: OASTimeSelect): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.date')]
}

function slots(el: OASTimeSelect): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.slot')]
}

function modeButtons(el: OASTimeSelect): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.mode')]
}

const BASE_SLOTS = JSON.stringify([
  { key: 'm', label: '09:00–11:00' },
  { key: 'a', label: '14:00–16:00' },
  { key: 'e', label: '18:00–20:00' },
])

describe('OAS time-select 配送时段选择', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('缺省 3 天 + 尽快送达：自动选中首个可用时段并反射到 value 属性', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS })
    expect(el.days).toBe(3)
    expect(dates(el)).toHaveLength(3)
    expect(el.value).toEqual({ date: START, slot: 'm' })
    expect(el.getAttribute('value')).toBe(JSON.stringify({ date: START, slot: 'm' }))
    expect(el.shadowRoot!.querySelector('.picker')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.express')!.hidden).toBe(false)
  })

  it('days 属性控制日期数量；非法值回落 3 并告警一次', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, days: '2' })
    expect(dates(el)).toHaveLength(2)
    el.setAttribute('days', 'abc')
    expect(el.days).toBe(3)
    expect(dates(el)).toHaveLength(3)
  })

  it('days 上界：超过 14 视为非法，回落 3（不按 14 钳制）', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, days: '30' })
    expect(el.days, '超出合法范围按非法值处理').toBe(3)
    expect(dates(el)).toHaveLength(3)
    el.setAttribute('days', '14')
    expect(dates(el)).toHaveLength(14)
    el.setAttribute('days', '15')
    expect(dates(el)).toHaveLength(3)
  })

  it('日期键从 start-date 起逐日递增，今天 / 明天有相对文案', () => {
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const el = mount({ slots: BASE_SLOTS })
    const keys = dates(el).map((button) => button.dataset.date)
    expect(keys[0]).toBe(key)
    expect(dates(el)[0]!.textContent).toContain('今天')
    expect(dates(el)[1]!.textContent).toContain('明天')
  })

  it('slots 非法 JSON 渲染空态文案（不留空白块），不抛错', () => {
    const el = mount({ 'start-date': START, slots: '{oops' })
    const empty = el.shadowRoot!.querySelector<HTMLElement>('.empty')!
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).not.toBe('')
    expect(el.value).toEqual({ date: '', slot: '' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('.picker')!.hidden).toBe(true)
  })

  it('休息与满约两种不可选语义：视觉标记可区分，点击不改值也不派发事件', () => {
    const el = mount({
      'start-date': START,
      slots: JSON.stringify([
        { key: 'r', label: '09:00–11:00', disabled: true },
        { key: 'f', label: '11:00–13:00', full: true },
        { key: 'a', label: '14:00–16:00' },
      ]),
      mode: 'schedule',
    })
    const [rest, full, open] = slots(el)
    expect(rest!.getAttribute('data-state')).toBe('rest')
    expect(rest!.disabled, '不可选时段走原生 disabled').toBe(true)
    expect(rest!.textContent).toContain('休息')
    expect(full!.getAttribute('data-state')).toBe('full')
    expect(full!.disabled).toBe(true)
    expect(full!.textContent).toContain('已满约')
    expect(full!.querySelector('.slot-label')!.textContent).toBe('11:00–13:00')
    expect(open!.hasAttribute('data-state')).toBe(false)

    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    rest!.click()
    full!.click()
    expect(changes).toBe(0)
    expect(el.value).toEqual({ date: START, slot: 'a' })
  })

  it('预约模式下点击时段写回 value 并派发 oas-change（detail 含 mode/date/slot）', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, mode: 'schedule' })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-change', (event) => detail.push((event as CustomEvent).detail))
    slots(el)[2]!.click()
    expect(el.value).toEqual({ date: START, slot: 'e' })
    expect(el.getAttribute('value')).toBe(JSON.stringify({ date: START, slot: 'e' }))
    expect(detail).toHaveLength(1)
    expect(detail[0]).toMatchObject({ mode: 'schedule', date: START, slot: 'e' })
    expect(detail[0]!.value).toEqual({ date: START, slot: 'e' })
  })

  it('预约模式切换日期：保留该日同样可用的时段，否则回落到该日首个可用时段', () => {
    const el = mount({
      'start-date': START,
      slots: BASE_SLOTS,
      'slots-override': JSON.stringify({
        '2026-01-06': [
          { key: 'm', label: '09:00–11:00', full: true },
          { key: 'a', label: '14:00–16:00' },
        ],
        '2026-01-07': [{ key: 'e', label: '18:00–20:00' }],
      }),
      mode: 'schedule',
      value: JSON.stringify({ date: START, slot: 'a' }),
    })
    expect(el.value).toEqual({ date: START, slot: 'a' })
    dates(el)[1]!.click()
    expect(el.value).toEqual({ date: '2026-01-06', slot: 'a' })
    expect(slots(el)).toHaveLength(2)
    dates(el)[2]!.click()
    expect(el.value).toEqual({ date: '2026-01-07', slot: 'e' })
    expect(slots(el)).toHaveLength(1)
  })

  it('slots-override 空数组表示该日不可配送：日期标 aria-disabled 且不可选中', () => {
    const el = mount({
      'start-date': START,
      slots: BASE_SLOTS,
      'slots-override': JSON.stringify({ '2026-01-06': [] }),
      mode: 'schedule',
    })
    const [, second] = dates(el)
    expect(second!.getAttribute('aria-disabled')).toBe('true')
    expect(second!.disabled).toBe(true)
    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    second!.click()
    expect(changes).toBe(0)
    expect(el.value).toEqual({ date: START, slot: 'm' })
  })

  it('日期列键盘：方向键在可用日期间移动并选中，Home / End 到首末可用日，跳过不可配送日', () => {
    const el = mount({
      'start-date': START,
      slots: BASE_SLOTS,
      'slots-override': JSON.stringify({ '2026-01-06': [] }),
      mode: 'schedule',
    })
    dates(el)[0]!.focus()
    dates(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(el.value.date).toBe('2026-01-07')
    const focused = el.shadowRoot!.activeElement as HTMLButtonElement
    expect(focused?.dataset.date).toBe('2026-01-07')
    focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(el.value.date).toBe(START)
  })

  it('时段网格键盘：方向键跳过休息 / 满约项，End 到末个可用时段', () => {
    const el = mount({
      'start-date': START,
      slots: JSON.stringify([
        { key: 'a', label: '09:00–11:00' },
        { key: 'r', label: '11:00–13:00', disabled: true },
        { key: 'b', label: '14:00–16:00' },
        { key: 'f', label: '16:00–18:00', full: true },
        { key: 'c', label: '18:00–20:00' },
      ]),
      mode: 'schedule',
      value: JSON.stringify({ date: START, slot: 'a' }),
    })
    slots(el)[0]!.focus()
    slots(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.value.slot).toBe('b')
    slots(el)[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.value.slot).toBe('c')
    slots(el)[4]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(el.value.slot).toBe('a')
    slots(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(el.value.slot).toBe('c')
  })

  it('两处各自只有一个 Tab 停靠点（roving tabindex）', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, mode: 'schedule' })
    const dateStops = dates(el).filter((button) => button.tabIndex === 0)
    const slotStops = slots(el).filter((button) => button.tabIndex === 0)
    expect(dateStops).toHaveLength(1)
    expect(dateStops[0]!.dataset.date).toBe(START)
    expect(slotStops).toHaveLength(1)
    expect(slotStops[0]!.dataset.slot).toBe('m')
  })

  it('模式切换：写回 mode 属性、显示对应区域并派发 oas-change', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-change', (event) => detail.push((event as CustomEvent).detail))
    expect(modeButtons(el)[0]!.getAttribute('aria-checked')).toBe('true')
    modeButtons(el)[1]!.click()
    expect(el.getAttribute('mode')).toBe('schedule')
    expect(modeButtons(el)[1]!.getAttribute('aria-checked')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.picker')!.hidden).toBe(false)
    expect(detail).toHaveLength(1)
    expect(detail[0]).toMatchObject({ mode: 'schedule' })
    modeButtons(el)[0]!.click()
    expect(el.getAttribute('mode')).toBe('express')
    expect(el.value).toEqual({ date: START, slot: 'm' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('.picker')!.hidden).toBe(true)
  })

  // 修复批 I1：radiogroup + roving 却无 keydown 时，Tab 只能到选中模式，另一模式纯键盘不可达。
  it('模式组键盘：方向键切换模式并迁移焦点，Home / End 到首末模式', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-change', (event) => detail.push((event as CustomEvent).detail))
    modeButtons(el)[0]!.focus()
    modeButtons(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('mode')).toBe('schedule')
    expect(detail).toHaveLength(1)
    expect((el.shadowRoot!.activeElement as HTMLButtonElement).dataset.mode, '焦点必须跟到新节点').toBe('schedule')
    el.shadowRoot!.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(el.getAttribute('mode')).toBe('express')
    expect((el.shadowRoot!.activeElement as HTMLButtonElement).dataset.mode).toBe('express')
    el.shadowRoot!.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(el.getAttribute('mode')).toBe('schedule')
  })

  it('模式组键盘 RTL：ArrowLeft 是前进方向（镜像 LTR 的 ArrowRight）', () => {
    const wrap = document.createElement('div')
    wrap.setAttribute('dir', 'rtl')
    document.body.appendChild(wrap)
    const el = new OASTimeSelect()
    el.setAttribute('start-date', START)
    el.setAttribute('slots', BASE_SLOTS)
    wrap.appendChild(el)
    modeButtons(el)[0]!.focus()
    modeButtons(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('mode')).toBe('schedule')
    expect((el.shadowRoot!.activeElement as HTMLButtonElement).dataset.mode).toBe('schedule')
    el.shadowRoot!.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('mode')).toBe('express')
  })

  it('尽快送达忽略宿主写入的 value：恒取首个可用时段', () => {
    const el = mount({
      'start-date': START,
      slots: JSON.stringify([
        { key: 'r', label: '09:00–11:00', disabled: true },
        { key: 'a', label: '14:00–16:00' },
      ]),
      value: JSON.stringify({ date: '2026-01-09', slot: 'r' }),
    })
    expect(el.value).toEqual({ date: START, slot: 'a' })
    expect(el.getAttribute('value')).toBe(JSON.stringify({ date: START, slot: 'a' }))
  })

  it('value property 双通道：对象赋值与 JSON 字符串赋值都生效，且不派发事件', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, mode: 'schedule' })
    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    el.value = { date: '2026-01-07', slot: 'e' }
    expect(el.value).toEqual({ date: '2026-01-07', slot: 'e' })
    expect(dates(el)[2]!.getAttribute('aria-selected')).toBe('true')
    el.value = JSON.stringify({ date: START, slot: 'e' })
    expect(el.value).toEqual({ date: START, slot: 'e' })
    expect(changes).toBe(0)
  })

  it('value 指向不可选时段时回落到该日首个可用时段（不静默停在坏值）', () => {
    const el = mount({
      'start-date': START,
      slots: JSON.stringify([
        { key: 'a', label: '09:00–11:00' },
        { key: 'f', label: '11:00–13:00', full: true },
      ]),
      mode: 'schedule',
      value: JSON.stringify({ date: START, slot: 'f' }),
    })
    expect(el.value).toEqual({ date: START, slot: 'a' })
    expect(slots(el)[1]!.getAttribute('aria-checked')).toBe('false')
  })

  it('disabled：整组禁用、不响应点击与键盘选择', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, mode: 'schedule', disabled: '' })
    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    expect(el.shadowRoot!.querySelector('.root')!.getAttribute('aria-disabled')).toBe('true')
    expect(dates(el).every((button) => button.disabled)).toBe(true)
    slots(el)[1]!.click()
    dates(el)[1]!.click()
    expect(changes).toBe(0)
  })

  it('ARIA 骨架：日期列 tablist + tab（aria-selected），时段网格 radiogroup + radio（aria-checked）', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, mode: 'schedule' })
    const list = el.shadowRoot!.querySelector('.dates')!
    expect(list.getAttribute('role')).toBe('tablist')
    expect(list.getAttribute('aria-orientation')).toBe('vertical')
    expect(list.getAttribute('aria-label')).toBe('配送日期')
    const tab = dates(el)[0]!
    expect(tab.getAttribute('role')).toBe('tab')
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(tab.getAttribute('aria-controls')).toBe(el.shadowRoot!.querySelector('.slots')!.id)

    const grid = el.shadowRoot!.querySelector('.slots')!
    expect(grid.getAttribute('role')).toBe('radiogroup')
    const groupLabel = el.shadowRoot!.querySelector<HTMLElement>('[part="slots-label"]')!
    expect(groupLabel.textContent).toBe('配送时段')
    expect(grid.getAttribute('aria-labelledby')).toBe(`${groupLabel.id} ${tab.id}`)
    const radios = slots(el)
    expect(radios[0]!.getAttribute('role')).toBe('radio')
    expect(radios[0]!.getAttribute('aria-checked')).toBe('true')
    expect(slots(el)[1]!.getAttribute('aria-checked')).toBe('false')
  })

  it('日期文案 locale 感知（切换语言后重渲染日期与模式文案）', async () => {
    const { setLocale, registerLocale } = await import('@oas-ui/i18n/registry')
    const en = (await import('@oas-ui/i18n/en')).default
    registerLocale(en)
    const el = mount({ 'start-date': START, slots: BASE_SLOTS })
    expect(modeButtons(el)[0]!.textContent).toBe('尽快送达')
    setLocale('en')
    expect(modeButtons(el)[0]!.textContent).toBe('As soon as possible')
    expect(dates(el)[0]!.querySelector('.date-main')!.textContent).toMatch(/\d/)
    setLocale('zh-CN')
    expect(modeButtons(el)[0]!.textContent).toBe('尽快送达')
  })

  it('断连重连后仍可交互（事件绑定重建，不重复派发）', () => {
    const el = mount({ 'start-date': START, slots: BASE_SLOTS, mode: 'schedule' })
    el.remove()
    document.body.appendChild(el)
    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    slots(el)[1]!.click()
    expect(changes).toBe(1)
    expect(el.value.slot).toBe('a')
  })
})
