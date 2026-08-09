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
function mockSize(
  vp: HTMLElement,
  size: { cw: number; ch: number; sw: number; sh: number },
): void {
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
})
