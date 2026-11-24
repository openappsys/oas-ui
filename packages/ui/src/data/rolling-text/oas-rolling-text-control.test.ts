import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASRollingText } from './index.js'

function mount(attrs: Record<string, string> = {}): OASRollingText {
  const el = new OASRollingText()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function digitCols(el: OASRollingText): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.digit-col')]
}

function stripOf(col: HTMLElement): HTMLElement {
  return col.querySelector<HTMLElement>('.strip')!
}

function nOf(col: HTMLElement): string {
  return stripOf(col).style.getPropertyValue('--n')
}

describe('oas-rolling-text direction / stop-order / start / reset', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('direction="up"：恒向上翻（9→0 走正向越界瞬态，不倒卷）', () => {
    const el = mount({ value: '9', direction: 'up' })
    expect(nOf(digitCols(el)[0]!)).toBe('9')
    el.setAttribute('value', '0')
    // 9→0 向上 = 前进 1 格，落在越界瞬态 10（动画结束后归位到 0）
    expect(nOf(digitCols(el)[0]!)).toBe('10')
  })

  it('direction="down"：恒向下翻（0→9 走反向越界瞬态）', () => {
    const el = mount({ value: '0', direction: 'down' })
    expect(nOf(digitCols(el)[0]!)).toBe('0')
    el.setAttribute('value', '9')
    // 0→9 向下 = 后退 1 格，落在瞬态 -1
    expect(nOf(digitCols(el)[0]!)).toBe('-1')
  })

  it('缺省 direction：最短路径（现状不变，9→0 落 10）', () => {
    const el = mount({ value: '9' })
    el.setAttribute('value', '0')
    expect(nOf(digitCols(el)[0]!)).toBe('10')
    const el2 = mount({ value: '0' })
    el2.setAttribute('value', '9')
    expect(nOf(digitCols(el2)[0]!)).toBe('-1')
  })

  it('非法 direction：回落最短路径并 devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ value: '9', direction: 'sideways' })
      el.setAttribute('value', '0')
      expect(nOf(digitCols(el)[0]!)).toBe('10')
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('direction'))).toHaveLength(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('stop-order：各列按位次递增延迟（列间 stagger）', () => {
    const el = mount({ value: '00', duration: '600', 'stop-order': '' })
    el.setAttribute('value', '99')
    const delays = digitCols(el).map((col) => stripOf(col).style.transitionDelay)
    expect(delays[0]).toBe('0ms')
    expect(delays[1]).toBe('72ms')
  })

  it('无 stop-order：列间无延迟（现状不变）', () => {
    const el = mount({ value: '00', duration: '600' })
    el.setAttribute('value', '99')
    for (const col of digitCols(el)) expect(stripOf(col).style.transitionDelay).toBe('')
  })

  it('reset()：清掉动画态，无过渡直接呈现当前 value', () => {
    vi.useFakeTimers()
    const el = mount({ value: '123', duration: '600' })
    el.setAttribute('value', '456')
    el.reset()
    const ns = digitCols(el).map(nOf)
    expect(ns).toEqual(['4', '5', '6'])
    // reset 后无进行中的归位计时器
    vi.advanceTimersByTime(2000)
    expect(digitCols(el).map(nOf)).toEqual(['4', '5', '6'])
  })

  it('start()：按当前 value 重新播放一次完整翻滚（列整体重建后翻回目标并归位）', () => {
    vi.useFakeTimers()
    const el = mount({ value: '42', duration: '600' })
    // 先落定
    el.reset()
    expect(digitCols(el).map(nOf)).toEqual(['4', '2'])
    // start() 触发列整体重建：列节点被替换（不重建 = 复用旧节点 → 此断言红）
    const before = digitCols(el)
    el.start()
    const after = digitCols(el)
    expect(after).toHaveLength(before.length)
    expect(after[0]).not.toBe(before[0])
    expect(after[1]).not.toBe(before[1])
    // 目标档位已同步写入（浏览器里 CSS transition 从零档起翻；happy-dom 无动画仅同步属性）
    expect(after.map(nOf)).toEqual(['4', '2'])
    // 含越界瞬态的归位计时结束后仍在目标（start 触发的翻滚链完整走完）
    vi.advanceTimersByTime(1200)
    expect(digitCols(el).map(nOf)).toEqual(['4', '2'])
  })
})
