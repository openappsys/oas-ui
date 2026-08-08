import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASCountdown, formatDuration } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCountdown {
  const el = new OASCountdown()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function display(el: OASCountdown): string {
  return el.shadowRoot!.querySelector('[part="display"]')!.textContent!
}

describe('formatDuration（纯函数）', () => {
  it('HH:mm:ss 默认把天滚入小时', () => {
    expect(formatDuration(90061000, 'HH:mm:ss')).toBe('25:01:01')
    expect(formatDuration(5000, 'HH:mm:ss')).toBe('00:00:05')
  })

  it('DD:HH:mm:ss 分天显示', () => {
    expect(formatDuration(90061000, 'DD:HH:mm:ss')).toBe('01:01:01:01')
    expect(formatDuration(0, 'DD:HH:mm:ss')).toBe('00:00:00:00')
  })

  it('支持中文单位模板（单字母 token 不补零）', () => {
    expect(formatDuration(90061000, 'D天H时m分s秒')).toBe('1天1时1分1秒')
    expect(formatDuration(90061000, 'D天HH时mm分ss秒')).toBe('1天01时01分01秒')
  })

  it('负数按 0 处理', () => {
    expect(formatDuration(-100, 'HH:mm:ss')).toBe('00:00:00')
  })
})

describe('OASCountdown', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('渲染初始剩余值（HH:mm:ss）', () => {
    const el = mount({ value: '5000' })
    expect(display(el)).toBe('00:00:05')
  })

  it('format 决定展示（分天模板）', () => {
    const el = mount({ value: '90061000', format: 'DD:HH:mm:ss' })
    expect(display(el)).toBe('01:01:01:01')
  })

  it('实时递减（fake timers）', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300) // 250ms tick 粒度：1300ms 处剩余 3700ms → 3s
    expect(display(el)).toBe('00:00:03')
    vi.advanceTimersByTime(2000)
    expect(display(el)).toBe('00:00:01')
  })

  it('到 0 停止并派发 oas-finish', () => {
    vi.useFakeTimers()
    const el = mount({ value: '2000' })
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    vi.advanceTimersByTime(2100)
    expect(finished).toBe(1)
    expect(display(el)).toBe('00:00:00')
    // 计时器已停止，不再变化也不重复派发
    vi.advanceTimersByTime(5000)
    expect(finished).toBe(1)
    expect(display(el)).toBe('00:00:00')
  })

  it('空态：value=0 显示全零且不派发 finish', () => {
    vi.useFakeTimers()
    const el = mount({ value: '0' })
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    expect(display(el)).toBe('00:00:00')
    vi.advanceTimersByTime(3000)
    expect(finished).toBe(0)
  })

  it('外部改 value 重置倒计时', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:03')
    el.setAttribute('value', '10000')
    expect(display(el)).toBe('00:00:10')
    vi.advanceTimersByTime(1500)
    expect(display(el)).toBe('00:00:08')
  })

  it('断开连接清理计时器，重连后按截止点继续', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:03')
    el.remove()
    // 断开后不再推进
    vi.advanceTimersByTime(5000)
    expect(display(el)).toBe('00:00:03')
    // 重连：期间真实时间已流逝，按原截止点继续（已归零）
    document.body.appendChild(el)
    expect(display(el)).toBe('00:00:00')
  })
})
