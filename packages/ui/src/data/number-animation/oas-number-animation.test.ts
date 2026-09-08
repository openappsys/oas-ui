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

  // ---- from 起始值（新一轮起播生效） ----

  it('from 指定起始值：首帧从 from 起播', () => {
    const el = mount({ value: '1000', from: '400', duration: '500' })
    advanceFrame(0)
    expect(text(el)).toBe('400')
    runToEnd(500)
    expect(text(el)).toBe('1000')
  })

  it('from 缺省仍从 0 起播（兼容现状）', () => {
    const el = mount({ value: '1000', duration: '500' })
    advanceFrame(0)
    expect(text(el)).toBe('0')
  })

  it('from 等于目标值：定值不启动动画', () => {
    const el = mount({ value: '100', from: '100', duration: '500' })
    expect(text(el)).toBe('100')
    expect(rafCb).toBeNull()
  })

  // ---- active 受控（false 停帧；false→true 触发） ----

  it('active=false 挂载：静态显示起始值，不播放', () => {
    const el = mount({ value: '1000', from: '200', active: 'false', duration: '500' })
    expect(text(el)).toBe('200')
    expect(rafCb).toBeNull()
    // 未激活期间改目标值：静候，不起播
    el.setAttribute('value', '800')
    expect(text(el)).toBe('200')
    expect(rafCb).toBeNull()
  })

  it('active=false→true 触发播放至目标并派发 finish', () => {
    const el = mount({ value: '1000', from: '200', active: 'false', duration: '500' })
    const listener = vi.fn()
    el.addEventListener('oas-finish', listener)
    el.setAttribute('active', 'true')
    expect(rafCb).not.toBeNull()
    runToEnd(500)
    expect(text(el)).toBe('1000')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('播放中置 active=false 停帧；恢复后续动到目标', () => {
    const el = mount({ value: '1000', duration: '1000' })
    advanceFrame(0)
    advanceFrame(500) // p=0.5，easeOut 后 ~875
    const mid = Number(text(el))
    expect(mid).toBeGreaterThan(800)
    el.setAttribute('active', 'false')
    expect(rafCb).toBeNull()
    // 停帧：文本保持当前值
    expect(text(el)).toBe(String(mid))
    el.setAttribute('active', 'true')
    expect(rafCb).not.toBeNull()
    runToEnd(1000)
    expect(text(el)).toBe('1000')
  })

  // ---- play() 方法 ----

  it('play() 同值重播：从 from 重新起播并再次派发 finish', () => {
    const el = mount({ value: '500', from: '0', duration: '300' })
    const listener = vi.fn()
    el.addEventListener('oas-finish', listener)
    runToEnd(300)
    expect(text(el)).toBe('500')
    expect(listener).toHaveBeenCalledTimes(1)
    el.play()
    expect(rafCb).not.toBeNull() // 重播已启动
    runToEnd(300)
    expect(text(el)).toBe('500')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('play() 播放中防重入', () => {
    const el = mount({ value: '500', duration: '300' })
    advanceFrame(0)
    el.play() // 播放中调用被忽略
    advanceFrame(300)
    expect(text(el)).toBe('500')
  })

  // ---- easing 四档枚举 ----

  it('easing=linear：中点值线性（p=0.5 恰为半程）', () => {
    const el = mount({ value: '1000', duration: '1000', easing: 'linear' })
    advanceFrame(0)
    advanceFrame(500)
    expect(Number(text(el))).toBe(500)
    runToEnd(1000)
    expect(text(el)).toBe('1000')
  })

  it('easing 非法值回落 ease-out（默认档）', () => {
    const el = mount({ value: '1000', duration: '1000', easing: 'bogus' })
    advanceFrame(0)
    advanceFrame(500)
    // easeOutCubic(0.5)=0.875
    expect(Number(text(el))).toBe(875)
  })

  it('easing=ease-in-out / spring 可用且抵达目标', () => {
    const el = mount({ value: '1000', duration: '1000', easing: 'ease-in-out' })
    advanceFrame(0)
    advanceFrame(500)
    expect(Number(text(el))).toBe(500) // cubic in-out 中点同为 0.5
    runToEnd(1000)
    expect(text(el)).toBe('1000')

    const spring = mount({ value: '1000', duration: '1000', easing: 'spring' })
    runToEnd(1000)
    expect(text(spring)).toBe('1000')
  })

  // ---- group-separator 千分位（Intl locale 感知） ----

  it('group-separator 开启：动画值按 locale 千分位格式化', () => {
    const el = mount({ value: '1234567', duration: '500', 'group-separator': 'true' })
    advanceFrame(0)
    runToEnd(500)
    expect(text(el)).toBe('1,234,567')
  })

  it('group-separator=false 关闭千分位', () => {
    const el = mount({
      value: '1234567',
      duration: '500',
      'group-separator': 'false',
    })
    runToEnd(500)
    expect(text(el)).toBe('1234567')
  })

  it('group-separator + to-fixed：小数位与分组同时生效', () => {
    const el = mount({
      value: '12345.678',
      duration: '500',
      'to-fixed': '2',
      'group-separator': 'true',
    })
    runToEnd(500)
    expect(text(el)).toBe('12,345.68')
  })

  // ---- DSD 水合 ----

  it('水合：SSR 快照（duration=0 目标值）直接接管不重建', () => {
    const ref = mount({ value: '9527', duration: '0' })
    const snap = ref.shadowRoot!.innerHTML
    ref.remove()
    const el = new OASNumberAnimation()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-number-animation" data-oas-ssr-v="1">${snap}`
    el.setAttribute('value', '9527')
    el.setAttribute('duration', '0')
    document.body.appendChild(el)
    expect(text(el)).toBe('9527')
  })
})
