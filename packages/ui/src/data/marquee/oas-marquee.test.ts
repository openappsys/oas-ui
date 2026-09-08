import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASMarquee } from './index.js'
import { resolveSpeedPx, computeRepeat, computeDuration } from './oas-marquee.js'

function mount(attrs: Record<string, string> = {}, content = 'OAS-UI 滚动内容'): OASMarquee {
  const el = new OASMarquee()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = content
  document.body.appendChild(el)
  return el
}

function track(el: OASMarquee): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
}

function clone(el: OASMarquee): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="group"].clone')!
}

function styleText(el: OASMarquee): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('纯函数：速度/份数/时长推导（px/s 语义）', () => {
  it('resolveSpeedPx：默认 48（像素/秒）', () => {
    expect(resolveSpeedPx('')).toBe(48)
    expect(resolveSpeedPx(null)).toBe(48)
  })

  it('resolveSpeedPx：合法正数按 px/s 透传', () => {
    expect(resolveSpeedPx('100')).toBe(100)
    expect(resolveSpeedPx('48.5')).toBe(48.5)
  })

  it('resolveSpeedPx：非法/非正数回退默认 48', () => {
    expect(resolveSpeedPx('abc')).toBe(48)
    expect(resolveSpeedPx('0')).toBe(48)
    expect(resolveSpeedPx('-5')).toBe(48)
    expect(resolveSpeedPx('NaN')).toBe(48)
  })

  it('computeRepeat：内容不小于容器时 1 份（双组结构退化原形态）', () => {
    expect(computeRepeat(0, 0)).toBe(1)
    expect(computeRepeat(300, 500)).toBe(1)
    expect(computeRepeat(300, 300)).toBe(1)
  })

  it('computeRepeat：内容不足一屏时向上取整填充', () => {
    expect(computeRepeat(300, 100)).toBe(3)
    expect(computeRepeat(250, 100)).toBe(3)
    expect(computeRepeat(100, 34)).toBe(3)
  })

  it('computeRepeat：克隆份数封顶（防 DOM 膨胀）', () => {
    expect(computeRepeat(100000, 10)).toBe(50)
    expect(computeRepeat(600, 10)).toBe(50)
  })

  it('computeDuration：时长=距离/速度（秒）', () => {
    expect(computeDuration(480, 48)).toBe(10)
    expect(computeDuration(240, 48)).toBe(5)
  })

  it('computeDuration：速度非法回退默认速度计算', () => {
    expect(computeDuration(480, 0)).toBe(10)
    expect(computeDuration(480, -5)).toBe(10)
  })
})

describe('OASMarquee', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('默认 speed 为 48px/s（--oas-marquee-speed 写入 track）', () => {
    const el = mount()
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('48')
  })

  it('speed 属性按 px/s 写入变量；非法/非正数回退 48', () => {
    const el = mount({ speed: '100' })
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('100')
    el.setAttribute('speed', '3.5')
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('3.5')
    el.setAttribute('speed', 'abc')
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('48')
    el.setAttribute('speed', '-1')
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('48')
  })

  it('内容 slot 复制形成无缝循环（克隆 aria-hidden）', () => {
    const el = mount()
    const groups = el.shadowRoot!.querySelectorAll('[part="group"]')
    expect(groups.length).toBe(2)
    expect(clone(el).getAttribute('aria-hidden')).toBe('true')
    expect(clone(el).textContent).toBe('OAS-UI 滚动内容')
    expect(groups[0]!.querySelector('slot')).not.toBeNull()
  })

  it('slotchange 后克隆组与内容保持一致', () => {
    const el = mount()
    const span = document.createElement('span')
    span.textContent = '新增条目'
    el.appendChild(span)
    const slot = el.shadowRoot!.querySelector('slot')!
    slot.dispatchEvent(new Event('slotchange'))
    expect(clone(el).textContent).toContain('新增条目')
  })

  it('pause-on-hover 反射且样式含暂停规则', () => {
    const el = mount({ 'pause-on-hover': '' })
    expect(el.hasAttribute('pause-on-hover')).toBe(true)
    const css = styleText(el)
    expect(css).toContain('[pause-on-hover]')
    expect(css).toContain('animation-play-state: paused')
  })

  it('prefers-reduced-motion 时静态（样式含媒体查询关闭动画）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('animation: none')
  })

  it('样式含水平无缝循环关键帧与隐藏溢出', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('@keyframes')
    expect(css).toContain('translateX(calc(-1 * var(--oas-marquee-shift)))')
    expect(css).toContain('overflow: hidden')
  })

  it('reverse 存在时动画反向（animation-direction: reverse）', () => {
    const el = mount({ reverse: '' })
    const css = styleText(el)
    expect(css).toContain('[reverse]')
    expect(css).toContain('animation-direction: reverse')
  })

  it('orientation=vertical 走垂直关键帧；非法值不改变水平默认', () => {
    const el = mount({ orientation: 'vertical' })
    const css = styleText(el)
    expect(css).toContain("[orientation='vertical']")
    expect(css).toContain('translateY(calc(-1 * var(--oas-marquee-shift)))')
    el.setAttribute('orientation', 'diagonal')
    // 非法值：CSS 仅匹配 vertical 精确值，水平关键帧不受影响
    expect(el.getAttribute('orientation')).toBe('diagonal')
  })

  it('fade-edges 样式：开启时用 mask-image 渐隐且尺寸走变量（默认关）', () => {
    const el = mount()
    const css = styleText(el)
    const fadeRule = css.split('}').find((rule) => rule.includes('[fade-edges]'))
    expect(fadeRule).toBeDefined()
    expect(fadeRule).toContain('mask-image')
    expect(fadeRule).toContain('var(--oas-marquee-fade-size')
    // 默认关：渐隐只挂在 [fade-edges] 选择器下，基础 .track 规则无 mask
    const trackRule = css.split('}').find((rule) => rule.includes('.track {') || rule.includes('.track\n') || rule.includes('.track\r'))
    expect(trackRule).toBeDefined()
    expect(trackRule).not.toContain('mask-image')
  })

  it('observedAttributes 覆盖全部新属性', () => {
    expect(OASMarquee.observedAttributes).toEqual(
      expect.arrayContaining(['speed', 'pause-on-hover', 'fade-edges', 'orientation', 'reverse']),
    )
  })

  it('测量后：克隆组按份数填充、时长变量写入、measuring 态解除', () => {
    let roCallback: (() => void) | null = null
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      constructor(cb: () => void) {
        roCallback = cb
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const el = mount({}, '短内容')
    // happy-dom 布局全 0：用 getBoundingClientRect spy 注入尺寸
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      width: 300,
      height: 40,
      top: 0,
      left: 0,
      right: 300,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    const sourceGroup = el.shadowRoot!.querySelector<HTMLElement>('.group:not(.clone)')!
    vi.spyOn(sourceGroup, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 40,
      top: 0,
      left: 0,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    expect(track(el).classList.contains('measuring')).toBe(true)
    ;(roCallback as unknown as () => void)()
    // 容器 300 / 内容 100 → 3 份克隆
    expect(clone(el).textContent).toBe('短内容'.repeat(3))
    expect(track(el).style.getPropertyValue('--oas-marquee-shift')).toBe('100px')
    // 时长 = 100px / 48px/s
    expect(track(el).style.getPropertyValue('--oas-marquee-duration')).toBe(`${100 / 48}s`)
    expect(track(el).classList.contains('measuring')).toBe(false)
  })

  it('内容更新相位保持：getAnimations 记录相位并以负 animation-delay 恢复', () => {
    const el = mount()
    const t = track(el)
    ;(t as unknown as { getAnimations: () => Array<{ currentTime: number | null }> }).getAnimations =
      () => [{ currentTime: 2500 }]
    const span = document.createElement('span')
    span.textContent = '动态追加'
    el.appendChild(span)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    expect(t.style.animationDelay).toBe('-2500ms')
    expect(clone(el).textContent).toContain('动态追加')
  })

  it('相位保持退化：getAnimations 不可用/无动画时归零重启（不设负 delay）', () => {
    const el = mount()
    const t = track(el)
    // happy-dom 无 getAnimations → 走退化路径
    expect(typeof (t as unknown as { getAnimations?: unknown }).getAnimations).toBe('undefined')
    const span = document.createElement('span')
    span.textContent = '动态追加'
    el.appendChild(span)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    expect(t.style.animationDelay).toBe('')
    expect(clone(el).textContent).toContain('动态追加')
  })

  it('断开连接清理 ResizeObserver', () => {
    const disconnectSpy = vi.fn()
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect = disconnectSpy
      constructor(_cb: () => void) {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const el = mount()
    el.remove()
    expect(disconnectSpy).toHaveBeenCalled()
  })
})
