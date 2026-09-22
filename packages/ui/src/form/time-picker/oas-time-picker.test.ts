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
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
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

  it('presets[hidden] CSS 兜底：作者级 .presets{display:flex} 不覆盖 hidden 属性（无 presets 不渲染空条）', () => {
    const el = mount({ value: '10:00:00' })
    const wrap = el.shadowRoot!.querySelector('[part="presets"]')!
    // 隐藏态：未设 presets 时 hidden 属性在位（逻辑层既有行为）
    expect(wrap.hasAttribute('hidden'), '无 presets 时容器应带 hidden 属性').toBe(true)
    // CSS 层兜底：display:flex 压过模板静态 hidden，必须显式补回（与 .clear-btn[hidden] 同款）
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css, '作者层 display:flex 压过 UA hidden，必须有 .presets[hidden] 兜底').toMatch(
      /\.presets\[hidden\]\s*\{[^}]*display:\s*none/,
    )
    // 非 hidden 态：基础 display 语义保持 flex（设 presets 后正常渲染快捷按钮）
    el.presets = [{ label: '整点', value: '12:00:00' }]
    expect(wrap.hasAttribute('hidden')).toBe(false)
    expect(css).toMatch(/\.presets\s*\{[^}]*display:\s*flex/)
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
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    trigger(el).click()
    expect(events).toEqual([false])
    expect(expanded(el)).toBe('true')
    el.removeAttribute('open')
    expect(expanded(el)).toBe('false')
  })

  it('非受控：开合均派发 oas-open-change', () => {
    const el = mount({ value: '09:05:30' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
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
    dropdown(el).getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 220 }) as DOMRect
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

describe('OASTimePicker 移动端底部抽屉（bottom-sheet 接入）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  /** 可控 matchMedia stub：模拟触屏（coarse pointer）或桌面（fine pointer） */
  function stubPointer(coarse: boolean): void {
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: coarse && query.includes('(pointer: coarse)'),
          media: query,
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    )
  }

  function sheet(el: OASTimePicker): HTMLElement {
    return el.shadowRoot!.querySelector('oas-bottom-sheet')!
  }

  it('模板恒包 oas-bottom-sheet（SSR/客户端结构一致），PC 默认 passive 透传', () => {
    const el = mount()
    expect(sheet(el)).toBeTruthy()
    expect(sheet(el).getAttribute('part')).toBe('sheet')
    expect(sheet(el).hasAttribute('passive')).toBe(true)
    expect(sheet(el).contains(dropdown(el))).toBe(true)
    expect(el.hasAttribute('data-mobile-sheet')).toBe(false)
  })

  it('触屏进入移动形态：去 passive + data-mobile-sheet，展开走 sheet 且跳过浮层定位，oas-close 同步收起', () => {
    stubPointer(true)
    const el = mount()
    el.setAttribute('placeholder', 'x') // 触发 update → syncMobileMode
    expect(el.hasAttribute('data-mobile-sheet')).toBe(true)
    expect(sheet(el).hasAttribute('passive')).toBe(false)
    computePositionMock.mockClear()
    open(el)
    expect(expanded(el)).toBe('true')
    expect(sheet(el).hasAttribute('open')).toBe(true)
    // 移动形态跳过 fixed 锚定（原定位由 bottom-sheet 容器承载）
    expect(computePositionMock.mock.calls.length).toBe(0)
    // oas-close（下滑/backdrop/Esc 由 bottom-sheet 派发）→ 组件同步收起
    sheet(el).dispatchEvent(new Event('oas-close'))
    expect(expanded(el)).toBe('false')
    expect(sheet(el).hasAttribute('open')).toBe(false)
  })

  it('PC 恢复：data-mobile-sheet 移除、passive 恢复，展开回落 fixed 锚定', () => {
    stubPointer(true)
    const el = mount()
    el.setAttribute('placeholder', 'x')
    expect(el.hasAttribute('data-mobile-sheet')).toBe(true)
    stubPointer(false)
    el.setAttribute('placeholder', 'y')
    expect(el.hasAttribute('data-mobile-sheet')).toBe(false)
    expect(sheet(el).hasAttribute('passive')).toBe(true)
    computePositionMock.mockClear()
    open(el)
    expect(expanded(el)).toBe('true')
    expect(sheet(el).hasAttribute('open')).toBe(false)
    expect(computePositionMock.mock.calls.length).toBeGreaterThan(0)
  })

  it('移动形态时间列选项触控目标抬升：.option min-height 对齐 --oas-touch-target-min', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 移动形态（抽屉内）：时分秒选项行最小高度抬到触摸目标 token（theme 默认 44px）
    expect(css).toContain(":host([data-mobile-sheet]) [part='dropdown'] .option")
    expect(css).toContain('min-height: var(--oas-touch-target-min, 44px)')
    // PC 基础规则不携带该抬升（仅存在于 data-mobile-sheet 块内）
    const pcCss = css.split(':host([data-mobile-sheet])')[0]!
    expect(pcCss).not.toContain('min-height: var(--oas-touch-target-min, 44px)')
  })
})

// ---- form-associated（原生表单集成） ----

describe('OASTimePicker form-associated（原生表单集成）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** happy-dom 不支持 attachInternals → 替身注入验证 plumbing；真实原生关联走浏览器 e2e */
  const fakeInternals = (el: OASTimePicker) => {
    const fake = { setFormValue: vi.fn(), setValidity: vi.fn(), labels: null, form: null }
    ;(el as unknown as { internals_: unknown }).internals_ = fake
    return fake
  }

  /** 展开面板、点选指定列的指定文本并 Enter 确认（面板确认通道） */
  function pick(el: OASTimePicker, colIndex: number, text: string): void {
    open(el)
    optionsIn(columns(el)[colIndex]!)
      .find((o) => o.textContent === text)!
      .click()
    keydown(el, 'Enter')
  }

  it('静态声明 formAssociated = true；required/name 进入 observedAttributes；无 ElementInternals 环境降级', () => {
    expect((OASTimePicker as unknown as { formAssociated: boolean }).formAssociated).toBe(true)
    expect(OASTimePicker.observedAttributes).toEqual(expect.arrayContaining(['required', 'name']))
    const el = mount({})
    expect(el.labels).toBeNull()
    expect(el.form).toBeNull()
  })

  it('单值提交：value 属性字符串；无选中提交 null（FormData 不含此项）', () => {
    const named = mount({ value: '09:30:00', name: 'meeting' })
    const fakeNamed = fakeInternals(named)
    named.setAttribute('size', 'small') // 触发 update → 同步 FormData
    expect(fakeNamed.setFormValue).toHaveBeenLastCalledWith('09:30:00')

    const empty = mount({ name: 'meeting' })
    const fakeEmpty = fakeInternals(empty)
    empty.setAttribute('size', 'small')
    expect(fakeEmpty.setFormValue).toHaveBeenLastCalledWith(null)
  })

  it('面板确认与手输提交均同步 FormData', () => {
    const el = mount({ name: 'meeting' })
    const fake = fakeInternals(el)
    pick(el, 1, '15') // 分钟列选 15
    expect(el.getAttribute('value')).toBe('00:15:00')
    expect(fake.setFormValue).toHaveBeenLastCalledWith('00:15:00')

    const typed = mount({ name: 'typed' })
    const fakeTyped = fakeInternals(typed)
    type(typed, '08:15')
    blurInput(typed)
    expect(typed.getAttribute('value')).toBe('08:15:00')
    expect(fakeTyped.setFormValue).toHaveBeenLastCalledWith('08:15:00')
  })

  it('范围提交 name-start / name-end 两条 entry；两侧皆空提交 null；只选一半空侧空串', () => {
    const el = mount({ 'is-range': '', value: '["09:00:00","11:30:00"]', name: 'window' })
    const fake = fakeInternals(el)
    el.setAttribute('size', 'small')
    const arg = fake.setFormValue.mock.calls.at(-1)?.[0] as FormData
    expect(arg).toBeInstanceOf(FormData)
    expect(arg.getAll('window-start')).toEqual(['09:00:00'])
    expect(arg.getAll('window-end')).toEqual(['11:30:00'])

    const empty = mount({ 'is-range': '', name: 'window' })
    const fakeEmpty = fakeInternals(empty)
    empty.setAttribute('size', 'small')
    expect(fakeEmpty.setFormValue).toHaveBeenLastCalledWith(null)

    const half = mount({ 'is-range': '', value: '["09:00:00"]', name: 'window' })
    const fakeHalf = fakeInternals(half)
    half.setAttribute('size', 'small')
    const halfArg = fakeHalf.setFormValue.mock.calls.at(-1)?.[0] as FormData
    expect(halfArg.getAll('window-start')).toEqual(['09:00:00'])
    expect(halfArg.getAll('window-end')).toEqual([''])
  })

  it('受控 value 写入同步 FormData（单值/范围）', () => {
    const el = mount({ name: 'meeting' })
    const fake = fakeInternals(el)
    el.setAttribute('value', '10:30:00')
    expect(fake.setFormValue).toHaveBeenLastCalledWith('10:30:00')

    const range = mount({ 'is-range': '', name: 'window' })
    const fakeRange = fakeInternals(range)
    range.setAttribute('value', '["09:00:00","11:00:00"]')
    const arg = fakeRange.setFormValue.mock.calls.at(-1)?.[0] as FormData
    expect(arg.getAll('window-start')).toEqual(['09:00:00'])
    expect(arg.getAll('window-end')).toEqual(['11:00:00'])
  })

  it('清空按钮同步 null（单值/范围）', () => {
    const single = mount({ clearable: '', value: '09:30:00', name: 'meeting' })
    const fakeSingle = fakeInternals(single)
    single.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.click()
    expect(fakeSingle.setFormValue).toHaveBeenLastCalledWith(null)

    const range = mount({ 'is-range': '', clearable: '', value: '["09:00:00","11:00:00"]', name: 'window' })
    const fakeRange = fakeInternals(range)
    range.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.click()
    expect(fakeRange.setFormValue).toHaveBeenLastCalledWith(null)
  })

  it('formResetCallback：用户选过后恢复初始基线（空），不派发事件，reset 后可继续选择', () => {
    const el = mount({ name: 'meeting' })
    const fake = fakeInternals(el)
    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    pick(el, 1, '15')
    expect(el.getAttribute('value')).toBe('00:15:00')
    el.formResetCallback()
    expect(el.hasAttribute('value')).toBe(false)
    expect(trigger(el).value).toBe('')
    expect(fake.setFormValue).toHaveBeenLastCalledWith(null)
    // 计数 = 1 全部来自上面的用户确认；reset 本身不再派发（与原生 reset 一致）
    expect(changes, 'reset 不派发 oas-change').toBe(1)
    // reset 已清脏：行为可重复（再选 → 再 reset 回空基线）
    pick(el, 0, '07')
    expect(el.getAttribute('value')).toBe('07:00:00')
    el.formResetCallback()
    expect(el.hasAttribute('value')).toBe(false)
  })

  it('受控写入刷新基线：reset 恢复受控写入后的值，不是挂载初值', () => {
    const el = mount({ value: '09:00:00', name: 'meeting' })
    el.setAttribute('value', '10:30:00') // 受控写入建立新基线
    pick(el, 1, '45') // 用户改分（置脏）
    expect(el.getAttribute('value')).toBe('10:45:00')
    el.formResetCallback()
    expect(el.getAttribute('value')).toBe('10:30:00')
    expect(trigger(el).value).toBe('10:30:00')
  })

  it('required：无选中 valueMissing（message 非空），选中后恢复合法', () => {
    const el = mount({ required: '', name: 'meeting' })
    const fake = fakeInternals(el)
    el.setAttribute('size', 'small') // 触发 update → 校验链同步
    // flag 为 true 时 message 按 Chromium 契约必须非空（基类 setValidity 会显式补 anchor 实参，只查前两个参数）
    const missing = fake.setValidity.mock.calls.at(-1)
    expect(missing?.[0]).toEqual({ valueMissing: true })
    expect(typeof missing?.[1]).toBe('string')
    expect((missing?.[1] as string).length).toBeGreaterThan(0)
    pick(el, 1, '15')
    expect(fake.setValidity).toHaveBeenLastCalledWith({})
  })

  it('required：范围两侧皆空 valueMissing，写入范围后恢复合法', () => {
    const el = mount({ 'is-range': '', required: '', name: 'window' })
    const fake = fakeInternals(el)
    el.setAttribute('size', 'small')
    expect(fake.setValidity.mock.calls.at(-1)?.[0]).toEqual({ valueMissing: true })
    el.setAttribute('value', '["09:00:00","11:00:00"]')
    expect(fake.setValidity).toHaveBeenLastCalledWith({})
  })

  it('formDisabledCallback：表单链路禁用并入（不回写 disabled 属性防自锁），解除后恢复', () => {
    const el = mount({})
    el.formDisabledCallback(true)
    expect(el.hasAttribute('disabled'), '不回写 disabled 属性（自锁防线）').toBe(false)
    expect(trigger(el).disabled).toBe(true)
    el.formDisabledCallback(false)
    expect(trigger(el).disabled).toBe(false)
  })

  it('label 点击（派到宿主的 click）聚焦 shadow 内 trigger；点击 trigger 本身不重复聚焦', () => {
    const el = mount({})
    const spy = vi.spyOn(trigger(el), 'focus')
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockClear()
    trigger(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('focus() 转到 shadow 内 trigger', () => {
    const el = mount({})
    const spy = vi.spyOn(trigger(el), 'focus')
    el.focus()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
