import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASNumberAnimation } from './index.js'

/** 手控 rAF：回调排队，由测试手动推进帧 */
let rafCb: FrameRequestCallback | null = null
let now = 0

function stubRaf(): void {
  rafCb = null
  now = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCb = cb
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    rafCb = null
  })
}

/** 推进一帧：未完成时自动继续排队，直到完成或显式停止 */
function advanceFrame(ts: number): void {
  const cb = rafCb
  rafCb = null
  cb?.(ts)
}

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', () => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
}

function mount(attrs: Record<string, string> = {}): OASNumberAnimation {
  const el = new OASNumberAnimation()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function text(el: OASNumberAnimation): string {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="value"]')!.textContent!
}

function runToEnd(duration: number): void {
  advanceFrame(0) // startedAt = 0，p=0
  advanceFrame(duration) // p=1 完成
}

describe('OASNumberAnimation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    stubRaf()
    stubMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('无 value 时静态显示 0，不启动动画', () => {
    const el = mount()
    expect(text(el)).toBe('0')
    expect(rafCb).toBeNull()
  })

  it('从 0 缓动到目标值并在结束后派发 oas-finish', () => {
    const el = mount({ value: '1000', duration: '500' })
    expect(text(el)).toBe('0')
    const listener = vi.fn()
    el.addEventListener('oas-finish', listener)
    runToEnd(500)
    expect(text(el)).toBe('1000')
    expect(rafCb).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0].detail).toEqual({ value: 1000 })
  })

  it('to-fixed 控制小数位，动画结束后精确显示', () => {
    const el = mount({ value: '3.14159', duration: '200', 'to-fixed': '2' })
    runToEnd(200)
    expect(text(el)).toBe('3.14')
  })

  it('duration 默认 1500ms，0 时直接跳目标', () => {
    const el = mount({ value: '42', duration: '0' })
    expect(text(el)).toBe('42')
    expect(rafCb).toBeNull()
  })

  it('动画中途改 value：从当前显示值续动到新目标', () => {
    const el = mount({ value: '1000', duration: '1000' })
    advanceFrame(0) // startedAt=0
    advanceFrame(500) // p=0.5，easeOutCubic 后显示值 > 875
    const mid = Number(text(el))
    expect(mid).toBeGreaterThan(800)
    expect(mid).toBeLessThan(1000)
    el.setAttribute('value', '2000')
    expect(text(el)).toBe(String(mid)) // 续动起点为当前显示值
    runToEnd(1000) // 新动画从当前值到 2000
    expect(text(el)).toBe('2000')
  })

  it('prefers-reduced-motion 直接跳目标且无 rAF', () => {
    stubMatchMedia(true)
    const el = mount({ value: '999', duration: '5000' })
    expect(text(el)).toBe('999')
    expect(rafCb).toBeNull()
  })

  it('断开连接取消 rAF（无泄漏）', () => {
    const el = mount({ value: '500', duration: '1000' })
    expect(rafCb).not.toBeNull()
    el.remove()
    expect(rafCb).toBeNull()
  })

  it('value 非法按 0 处理', () => {
    const el = mount({ value: 'abc', duration: '0' })
    expect(text(el)).toBe('0')
  })
})
