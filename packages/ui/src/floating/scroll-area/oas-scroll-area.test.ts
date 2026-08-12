import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASScrollArea } from './index.js'

function mount(attrs: Record<string, string> = {}): OASScrollArea {
  const el = new OASScrollArea()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function viewport(el: OASScrollArea): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
}

function track(el: OASScrollArea, part: 'track-v' | 'track-h'): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)!
}

function thumb(el: OASScrollArea, part: 'thumb-v' | 'thumb-h'): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)!
}

/** 模拟滚动容器尺寸（happy-dom 无布局，手动覆写只读属性） */
function mockSize(vp: HTMLElement, size: { cw: number; ch: number; sw: number; sh: number }): void {
  Object.defineProperty(vp, 'clientWidth', { value: size.cw, configurable: true })
  Object.defineProperty(vp, 'clientHeight', { value: size.ch, configurable: true })
  Object.defineProperty(vp, 'scrollWidth', { value: size.sw, configurable: true })
  Object.defineProperty(vp, 'scrollHeight', { value: size.sh, configurable: true })
}

function scrollTo(el: OASScrollArea, left: number, top: number): void {
  const vp = viewport(el)
  vp.scrollLeft = left
  vp.scrollTop = top
  vp.dispatchEvent(new Event('scroll'))
}

const flushRaf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

describe('OASScrollArea', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染滚动视口与自定义滚动条（纵向/横向 track + thumb）', () => {
    const el = mount()
    expect(viewport(el)).not.toBeNull()
    expect(track(el, 'track-v')).not.toBeNull()
    expect(thumb(el, 'thumb-v')).not.toBeNull()
    expect(track(el, 'track-h')).not.toBeNull()
    expect(thumb(el, 'thumb-h')).not.toBeNull()
  })

  it('height/width 属性映射到视口内联尺寸', () => {
    const el = mount({ height: '200', width: '320' })
    const vp = viewport(el)
    expect(vp.style.height).toBe('200px')
    expect(vp.style.width).toBe('320px')
  })

  it('未设置 height/width 时视口不强制尺寸', () => {
    const el = mount()
    expect(viewport(el).style.height).toBe('')
    expect(viewport(el).style.width).toBe('')
  })

  it('内容溢出时显示滚动条，未溢出隐藏', async () => {
    const el = mount()
    const vp = viewport(el)
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    scrollTo(el, 0, 0)
    await flushRaf()
    expect(track(el, 'track-v').classList.contains('visible')).toBe(true)

    mockSize(vp, { cw: 100, ch: 300, sw: 100, sh: 300 })
    scrollTo(el, 0, 0)
    await flushRaf()
    expect(track(el, 'track-v').classList.contains('visible')).toBe(false)
    expect(track(el, 'track-h').classList.contains('visible')).toBe(false)
  })

  it('纵向滚动条 thumb 尺寸与位置随 scrollTop 计算', async () => {
    const el = mount()
    const vp = viewport(el)
    // client 100 / scroll 400 → thumb = max(24, 100*100/400=25) = 25px
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 400 })
    scrollTo(el, 0, 0)
    await flushRaf()
    expect(thumb(el, 'thumb-v').style.height).toBe('25px')
    expect(thumb(el, 'thumb-v').style.transform).toBe('translateY(0px)')

    // maxScroll=300，maxTop=75，top = 75 * (50/300) = 12.5
    scrollTo(el, 0, 50)
    await flushRaf()
    expect(thumb(el, 'thumb-v').style.transform).toBe('translateY(12.5px)')
  })

  it('横向滚动条 thumb 随 scrollLeft 计算', async () => {
    const el = mount()
    const vp = viewport(el)
    mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
    scrollTo(el, 50, 0)
    await flushRaf()
    expect(track(el, 'track-h').classList.contains('visible')).toBe(true)
    expect(track(el, 'track-v').classList.contains('visible')).toBe(false)
    expect(thumb(el, 'thumb-h').style.width).toBe('25px')
    expect(thumb(el, 'thumb-h').style.transform).toBe('translateX(12.5px)')
  })

  it('滚动派发 oas-scroll（rAF 节流，detail 含 scrollTop/scrollLeft）', async () => {
    const el = mount()
    const vp = viewport(el)
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    let detail: unknown
    el.addEventListener('oas-scroll', (e: Event) => (detail = (e as CustomEvent).detail))
    scrollTo(el, 10, 30)
    await flushRaf()
    expect(detail).toEqual({ scrollTop: 30, scrollLeft: 10 })
  })

  it('同一帧内多次滚动只派发一次事件（节流）', async () => {
    const el = mount()
    const vp = viewport(el)
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    let count = 0
    el.addEventListener('oas-scroll', () => count++)
    scrollTo(el, 0, 40)
    scrollTo(el, 0, 60)
    await flushRaf()
    expect(count).toBe(1)
  })

  it('未设置 auto-hide 时滚动条在溢出时保持常显（peek）', async () => {
    const el = mount()
    const vp = viewport(el)
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    scrollTo(el, 0, 0)
    await flushRaf()
    expect(track(el, 'track-v').classList.contains('peek')).toBe(true)
  })

  it('auto-hide：滚动时显示滚动条，延时后自动隐藏', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const el = mount({ 'auto-hide': '' })
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
      scrollTo(el, 0, 30)
      await flushRaf()
      expect(track(el, 'track-v').classList.contains('peek')).toBe(true)
      vi.advanceTimersByTime(900)
      expect(track(el, 'track-v').classList.contains('peek')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('auto-hide：悬停视口显示滚动条', async () => {
    const el = mount({ 'auto-hide': '' })
    const vp = viewport(el)
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.scroll-area')!
    wrap.dispatchEvent(new PointerEvent('pointerenter'))
    expect(track(el, 'track-v').classList.contains('peek')).toBe(true)
  })

  it('断开连接后重新连接仍可正常渲染', () => {
    const el = mount({ height: '200' })
    el.remove()
    document.body.appendChild(el)
    expect(viewport(el)).not.toBeNull()
    expect(viewport(el).style.height).toBe('200px')
  })

  it('纯 CSR：update 同步写滚动条可见态（行为不变）', () => {
    const el = mount()
    const vp = viewport(el)
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    // 同值重设 height 触发 update → 溢出判定同步写 .visible
    el.setAttribute('height', '100')
    expect(track(el, 'track-v').classList.contains('visible')).toBe(true)
  })

  /** 模拟 DSD 水合：构造器 attachShadow 后注入「SSR 快照 + 指纹 meta」（等价于 DSD template 解析结果） */
  function dsdScrollArea(): OASScrollArea {
    const el = new OASScrollArea()
    el.shadowRoot!.innerHTML = `
      <meta data-oas-ssr="oas-scroll-area" data-oas-ssr-v="1">
      <style>.probe { color: red; }</style>
      <div class="scroll-area">
        <div class="viewport" part="viewport" tabindex="0"><slot></slot></div>
        <div class="track track-v" part="track-v" aria-hidden="true"><div class="thumb" part="thumb-v"></div></div>
        <div class="track track-h" part="track-h" aria-hidden="true"><div class="thumb" part="thumb-h"></div></div>
      </div>
    `
    return el
  }

  it('DSD 水合：首帧不写滚动条态，rAF 后按真实溢出校正', async () => {
    const el = dsdScrollArea()
    document.body.appendChild(el)
    const vp = viewport(el)
    // 水合接管：指纹移除、viewport 引用保持（shadow 未重建）
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(viewport(el)).toBe(vp)
    // 首帧：滚动条可见态/尺寸未写入
    expect(track(el, 'track-v').classList.contains('visible')).toBe(false)
    expect(thumb(el, 'thumb-v').style.height).toBe('')
    // rAF 前构造溢出条件，校正帧补写
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    await flushRaf()
    expect(track(el, 'track-v').classList.contains('visible')).toBe(true)
    // 100*100/300 = 33.333...（happy-dom 内联样式保留 6 位小数）
    expect(thumb(el, 'thumb-v').style.height).toBe('33.333333px')
    el.remove()
  })

  it('DSD 水合：rAF 前重复 update 一律抑制，校正后恢复正常', async () => {
    const el = dsdScrollArea()
    document.body.appendChild(el)
    const vp = viewport(el)
    // rAF 前多次触发 update（height 变化 / RO 回调）：仍不写滚动条态
    mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
    el.setAttribute('height', '100')
    expect(track(el, 'track-v').classList.contains('visible')).toBe(false)
    await flushRaf()
    // 校正帧补写（height=100 → 视口高 100px，内容高 300px → 纵向溢出）
    expect(track(el, 'track-v').classList.contains('visible')).toBe(true)
    // 校正后：尺寸变化同步生效
    mockSize(vp, { cw: 100, ch: 300, sw: 100, sh: 300 })
    el.setAttribute('width', '50')
    expect(track(el, 'track-v').classList.contains('visible')).toBe(false)
    el.remove()
  })

  describe('滚轮接管（仅横向可滚时）', () => {
    it('纵向不可滚、横向可滚：纵向滚轮增量转横向并阻止默认', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
      const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 50 })
      vp.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(true)
      expect(vp.scrollLeft).toBe(50)
    })

    it('deltaX 滚轮增量同样接管横向滚动', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
      const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 30 })
      vp.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(true)
      expect(vp.scrollLeft).toBe(30)
    })

    it('横向滚动中负增量可回退', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
      scrollTo(el, 100, 0)
      const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -30 })
      vp.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(true)
      expect(vp.scrollLeft).toBe(70)
    })

    it('已在横向边缘继续滚：不拦截，链式传给页面', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
      scrollTo(el, 300, 0) // maxX = 300
      const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 50 })
      vp.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(false)
      expect(vp.scrollLeft).toBe(300)
    })

    it('纵向可滚（含双向可滚）时滚轮不拦截，交给原生', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 300 })
      const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 50 })
      vp.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(false)
    })
  })

  describe('thumb 拖拽', () => {
    it('纵向：pointerdown→move 按比例滚动 scrollTop，松开结束并还原文本选择', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 100, sh: 400 })
      const vTrack = track(el, 'track-v')
      const vThumb = thumb(el, 'thumb-v')
      // 轨道高 96（top/bottom 各 2px）、thumb 高 25 → travel = 71，maxScroll = 300
      Object.defineProperty(vTrack, 'clientHeight', { value: 96, configurable: true })
      Object.defineProperty(vThumb, 'clientHeight', { value: 25, configurable: true })
      vThumb.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientY: 10 }),
      )
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: 45.5 }))
      // delta=35.5 → 35.5/71*300 = 150
      expect(vp.scrollTop).toBe(150)
      expect(document.body.style.userSelect).toBe('none')
      window.dispatchEvent(new PointerEvent('pointerup', {}))
      expect(document.body.style.userSelect).toBe('')
      // 拖拽结束后不再响应 move
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: 90 }))
      expect(vp.scrollTop).toBe(150)
    })

    it('横向：pointermove 按比例同步 scrollLeft', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
      const hTrack = track(el, 'track-h')
      const hThumb = thumb(el, 'thumb-h')
      Object.defineProperty(hTrack, 'clientWidth', { value: 96, configurable: true })
      Object.defineProperty(hThumb, 'clientWidth', { value: 25, configurable: true })
      hThumb.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 10 }),
      )
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 45.5 }))
      expect(vp.scrollLeft).toBe(150)
      window.dispatchEvent(new PointerEvent('pointerup', {}))
    })

    it('拖拽越界夹取到有效区间（maxScroll）', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
      const hTrack = track(el, 'track-h')
      const hThumb = thumb(el, 'thumb-h')
      Object.defineProperty(hTrack, 'clientWidth', { value: 96, configurable: true })
      Object.defineProperty(hThumb, 'clientWidth', { value: 25, configurable: true })
      hThumb.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 10 }),
      )
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 500 }))
      expect(vp.scrollLeft).toBe(300)
      window.dispatchEvent(new PointerEvent('pointerup', {}))
    })

    it('非主键按下不启动拖拽', () => {
      const el = mount()
      const vp = viewport(el)
      mockSize(vp, { cw: 100, ch: 100, sw: 400, sh: 100 })
      const hThumb = thumb(el, 'thumb-h')
      hThumb.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 2, clientX: 10 }),
      )
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 45 }))
      expect(vp.scrollLeft).toBe(0)
    })
  })
})
