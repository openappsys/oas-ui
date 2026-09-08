import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASCarousel } from './index.js'

function mount(attrs: Record<string, string> = {}, slides = 3): OASCarousel {
  const el = new OASCarousel()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = Array.from({ length: slides }, (_, i) => `<div class="slide">${i + 1}</div>`).join('')
  document.body.appendChild(el)
  return el
}

function track(el: OASCarousel): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
}

function pointer(type: string, x: number, y = 0): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, clientX: x, clientY: y })
}

describe('OASCarousel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染滑动容器与指示器', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="track"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(3)
  })

  it('点击指示器切换并派发 oas-change（detail 含 index 与 prevIndex）', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelectorAll('[part="dot"]')[2] as HTMLElement).click()
    expect(detail).toEqual({ index: 2, prevIndex: 0 })
    expect(el.getAttribute('index')).toBe('2')
  })

  it('渲染左右箭头按钮', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.getAttribute('aria-label')).toBe(
      '上一屏',
    )
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.getAttribute('aria-label')).toBe(
      '下一屏',
    )
  })

  it('arrows=never 时箭头隐藏（hidden），不渲染可见箭头元素', () => {
    const el = mount({ arrows: 'never' })
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelectorAll('[part="arrow-prev"]:not([hidden])').length).toBe(0)
    expect(el.shadowRoot!.querySelectorAll('[part="arrow-next"]:not([hidden])').length).toBe(0)
  })

  it('arrows=hover 时箭头保留在 DOM，可见性由 CSS 控制', () => {
    const el = mount({ arrows: 'hover' })
    expect(el.getAttribute('arrows')).toBe('hover')
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(false)
  })

  it('arrows=always 时箭头始终显示（无 hidden）', () => {
    const el = mount({ arrows: 'always' })
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(false)
  })

  it('未指定 arrows 时默认悬停形态（hover），箭头保留在 DOM', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(false)
  })

  it('点击 next 箭头 index+1 并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="arrow-next"]') as HTMLElement).click()
    expect(detail).toEqual({ index: 1, prevIndex: 0 })
    expect(el.getAttribute('index')).toBe('1')
  })

  it('点击 prev 箭头循环到最后一屏', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="arrow-prev"]') as HTMLElement).click()
    expect(detail).toEqual({ index: 2, prevIndex: 0 })
    expect(el.getAttribute('index')).toBe('2')
  })

  it('autoplay 时定时切换', () => {
    vi.useFakeTimers()
    const el = mount({ autoplay: '' })
    vi.advanceTimersByTime(3500)
    expect(el.getAttribute('index')).toBe('1')
    vi.useRealTimers()
  })

  it('locale：箭头/指示器 aria-label 随 setLocale 切换', () => {
    const el = mount()
    const prev = el.shadowRoot!.querySelector<HTMLElement>('[part="arrow-prev"]')!
    const next = el.shadowRoot!.querySelector<HTMLElement>('[part="arrow-next"]')!
    const dot = el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!
    expect(prev.getAttribute('aria-label')).toBe('上一屏')
    expect(next.getAttribute('aria-label')).toBe('下一屏')
    expect(dot.getAttribute('aria-label')).toBe('第 1 张')

    setLocale(en)
    expect(prev.getAttribute('aria-label')).toBe('Previous slide')
    expect(next.getAttribute('aria-label')).toBe('Next slide')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!.getAttribute('aria-label'),
    ).toBe('Slide 1')

    setLocale('zh-CN')
    expect(prev.getAttribute('aria-label')).toBe('上一屏')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!.getAttribute('aria-label'),
    ).toBe('第 1 张')
  })

  describe('指示器 API', () => {
    it('indicators=false 时隐藏指示器且不渲染圆点', () => {
      const el = mount({ indicators: 'false' })
      const dots = el.shadowRoot!.querySelector<HTMLElement>('[part="dots"]')!
      expect(dots.hasAttribute('hidden')).toBe(true)
      expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(0)
    })

    it('indicators 默认开启', () => {
      const el = mount()
      const dots = el.shadowRoot!.querySelector<HTMLElement>('[part="dots"]')!
      expect(dots.hasAttribute('hidden')).toBe(false)
      expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(3)
    })

    it('indicator-position=outside 时指示器容器带 outside 形态类（流内占位）', () => {
      const el = mount({ 'indicator-position': 'outside' })
      const dots = el.shadowRoot!.querySelector<HTMLElement>('[part="dots"]')!
      expect(dots.classList.contains('outside')).toBe(true)
      expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(3)
    })

    it('indicator-type=line 时指示器容器带 line 形态类', () => {
      const el = mount({ 'indicator-type': 'line' })
      const dots = el.shadowRoot!.querySelector<HTMLElement>('[part="dots"]')!
      expect(dots.classList.contains('line')).toBe(true)
    })

    it('指示器圆点颜色走组件级 CSS 变量 token（含激活/悬停态）', () => {
      const el = mount()
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toContain('--oas-carousel-dot-bg')
      expect(style).toContain('--oas-carousel-dot-active-bg')
      // 激活/悬停态背景必须引用 token 变量
      const activeRule = style.split('.dot[aria-current')[1] ?? ''
      expect(activeRule).toContain('var(--oas-carousel-dot-active-bg')
    })
  })

  describe('动态增删轮播项（slotchange）', () => {
    it('追加一屏后指示器数量同步更新', async () => {
      const el = mount()
      expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(3)
      const extra = document.createElement('div')
      extra.className = 'slide'
      extra.textContent = '四'
      el.appendChild(extra)
      await vi.waitFor(
        () => expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(4),
        { timeout: 500 },
      )
    })

    it('删除轮播项后指示器数量同步更新且 index 收敛', async () => {
      const el = mount({ index: '2' })
      el.removeChild(el.children[2]!)
      await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(2), {
        timeout: 500,
      })
      expect(el.getAttribute('index')).toBe('1')
    })
  })

  describe('effect=fade', () => {
    it('fade 模式下轮播项叠层并以内联 opacity 区分激活屏', () => {
      const el = mount({ effect: 'fade' })
      const slides = Array.from(el.children) as HTMLElement[]
      expect(slides[0]!.style.opacity).toBe('1')
      expect(slides[1]!.style.opacity).toBe('0')
      expect(slides[2]!.style.opacity).toBe('0')
      expect(slides[1]!.style.pointerEvents).toBe('none')
    })

    it('fade 模式切换后仅激活屏 opacity=1', () => {
      const el = mount({ effect: 'fade' })
      el.goTo(1)
      const slides = Array.from(el.children) as HTMLElement[]
      expect(slides[0]!.style.opacity).toBe('0')
      expect(slides[1]!.style.opacity).toBe('1')
    })

    it('从 fade 切回 slide 时清理子项内联 opacity', () => {
      const el = mount({ effect: 'fade' })
      el.removeAttribute('effect')
      const slides = Array.from(el.children) as HTMLElement[]
      expect(slides[0]!.style.opacity).toBe('')
      expect(slides[1]!.style.pointerEvents).toBe('')
    })

    it('slide 模式不写子项内联 opacity', () => {
      const el = mount()
      const slides = Array.from(el.children) as HTMLElement[]
      expect(slides[0]!.style.opacity).toBe('')
    })
  })

  describe('受控 current 方法', () => {
    it('next()/prev() 切换并回写 index', () => {
      const el = mount()
      el.next()
      expect(el.getAttribute('index')).toBe('1')
      el.prev()
      expect(el.getAttribute('index')).toBe('0')
    })

    it('goTo(index) 跳转到指定屏', () => {
      const el = mount()
      el.goTo(2)
      expect(el.getAttribute('index')).toBe('2')
    })

    it('方法切换派发 oas-change 且 detail 含 prevIndex', () => {
      const el = mount()
      const details: unknown[] = []
      el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
      el.goTo(2)
      el.next()
      expect(details).toEqual([
        { index: 2, prevIndex: 0 },
        { index: 0, prevIndex: 2 },
      ])
    })
  })

  describe('loop 开关', () => {
    it('loop=false 时 prev 在首屏不循环、不派发事件', () => {
      const el = mount({ loop: 'false' })
      const details: unknown[] = []
      el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
      el.prev()
      expect(el.getAttribute('index')).toBe('0')
      expect(details).toEqual([])
    })

    it('loop=false 时 next 在末屏停住', () => {
      const el = mount({ loop: 'false' })
      el.goTo(2)
      el.next()
      expect(el.getAttribute('index')).toBe('2')
    })

    it('loop=false 时 goTo 越界收敛到边界', () => {
      const el = mount({ loop: 'false' })
      el.goTo(99)
      expect(el.getAttribute('index')).toBe('2')
      el.goTo(-5)
      expect(el.getAttribute('index')).toBe('0')
    })

    it('loop=false 时边界箭头 disabled', () => {
      const el = mount({ loop: 'false' })
      expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('disabled')).toBe(true)
      el.goTo(1)
      expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('disabled')).toBe(false)
      el.goTo(2)
      expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('disabled')).toBe(true)
    })

    it('默认 loop 循环', () => {
      const el = mount()
      el.prev()
      expect(el.getAttribute('index')).toBe('2')
    })
  })

  describe('autoplay 暂停', () => {
    it('悬停暂停：pointerenter 期间不走屏，离开后恢复', () => {
      vi.useFakeTimers()
      const el = mount({ autoplay: '', interval: '1000' })
      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(5000)
      expect(el.getAttribute('index')).toBe('0')
      el.dispatchEvent(new PointerEvent('pointerleave'))
      vi.advanceTimersByTime(2500)
      expect(el.getAttribute('index')).toBe('2')
      vi.useRealTimers()
    })

    it('焦点暂停：focusin 期间不走屏，focusout 恢复', () => {
      vi.useFakeTimers()
      const el = mount({ autoplay: '', interval: '1000' })
      el.dispatchEvent(new FocusEvent('focusin'))
      vi.advanceTimersByTime(3500)
      expect(el.getAttribute('index')).toBe('0')
      el.dispatchEvent(new FocusEvent('focusout'))
      vi.advanceTimersByTime(1500)
      expect(el.getAttribute('index')).toBe('1')
      vi.useRealTimers()
    })

    it('pause-on-hover=false 时悬停不暂停', () => {
      vi.useFakeTimers()
      const el = mount({ autoplay: '', interval: '1000', 'pause-on-hover': 'false' })
      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(2500)
      expect(el.getAttribute('index')).toBe('2')
      vi.useRealTimers()
    })

    it('页面不可见时停播，恢复可见后继续', () => {
      vi.useFakeTimers()
      const el = mount({ autoplay: '', interval: '1000' })
      const hiddenDesc = Object.getOwnPropertyDescriptor(document, 'hidden')
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      vi.advanceTimersByTime(5000)
      expect(el.getAttribute('index')).toBe('0')
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      vi.advanceTimersByTime(2500)
      expect(el.getAttribute('index')).toBe('2')
      if (hiddenDesc) Object.defineProperty(document, 'hidden', hiddenDesc)
      vi.useRealTimers()
    })
  })

  describe('direction=vertical', () => {
    it('垂直模式轨道沿 Y 轴位移', () => {
      const el = mount({ direction: 'vertical' })
      el.goTo(1)
      expect(track(el).style.transform).toContain('translateY')
      expect(track(el).style.transform).not.toContain('translateX')
    })

    it('水平模式默认 translateX', () => {
      const el = mount()
      el.goTo(1)
      expect(track(el).style.transform).toContain('translateX')
    })
  })

  describe('slides-per-view 多图一屏', () => {
    it('slides-per-view=2 时指示器按页渲染（4 图 2 页）', () => {
      const el = mount({ 'slides-per-view': '2' }, 4)
      expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(2)
    })

    it('按屏步进：第二页位移 2 个 slide 宽', () => {
      const el = mount({ 'slides-per-view': '2' }, 4)
      el.goTo(1)
      expect(track(el).style.transform).toContain('translateX')
      expect(el.getAttribute('index')).toBe('1')
    })

    it('gap 参与位移计算', () => {
      const el = mount({ 'slides-per-view': '2', gap: '16' }, 4)
      expect(track(el).style.transform).toContain('16px')
    })

    it('非整除时末页对齐轨道末尾（不溢出空白）', () => {
      const el = mount({ 'slides-per-view': '2' }, 5)
      // 3 页：末页 offsetSlides = min(2*2, 5-2) = 3
      el.goTo(2)
      expect(el.getAttribute('index')).toBe('2')
      expect(track(el).style.transform).toContain('translateX')
    })
  })

  describe('拖拽切换', () => {
    it('水平拖动超过阈值后松手切到下一屏', () => {
      const el = mount()
      const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      viewport.dispatchEvent(pointer('pointerdown', 400))
      viewport.dispatchEvent(pointer('pointermove', 280))
      expect(track(el).classList.contains('no-transition')).toBe(true)
      viewport.dispatchEvent(pointer('pointerup', 280))
      expect(el.getAttribute('index')).toBe('1')
      expect(track(el).classList.contains('no-transition')).toBe(false)
    })

    it('水平向左拖（回前一个方向）切到上一屏', () => {
      const el = mount({ index: '1' })
      const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      viewport.dispatchEvent(pointer('pointerdown', 100))
      viewport.dispatchEvent(pointer('pointermove', 220))
      viewport.dispatchEvent(pointer('pointerup', 220))
      expect(el.getAttribute('index')).toBe('0')
    })

    it('未达阈值松手回弹，index 不变', () => {
      const el = mount()
      const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      viewport.dispatchEvent(pointer('pointerdown', 400))
      viewport.dispatchEvent(pointer('pointermove', 370))
      viewport.dispatchEvent(pointer('pointerup', 370))
      expect(el.getAttribute('index')).toBe('0')
    })

    it('拖拽跟手：拖动中轨道 transform 带像素偏移', () => {
      const el = mount()
      const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      viewport.dispatchEvent(pointer('pointerdown', 400))
      viewport.dispatchEvent(pointer('pointermove', 300))
      expect(track(el).style.transform).toContain('100px')
      viewport.dispatchEvent(pointer('pointerup', 300))
    })

    it('垂直模式按纵向位移判定', () => {
      const el = mount({ direction: 'vertical' })
      const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      viewport.dispatchEvent(pointer('pointerdown', 0, 400))
      viewport.dispatchEvent(pointer('pointermove', 0, 280))
      viewport.dispatchEvent(pointer('pointerup', 0, 280))
      expect(el.getAttribute('index')).toBe('1')
    })

    it('非主键（右键）不启动拖拽', () => {
      const el = mount()
      const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      const right = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 2,
        pointerId: 1,
        clientX: 400,
      })
      viewport.dispatchEvent(right)
      viewport.dispatchEvent(pointer('pointermove', 200))
      expect(track(el).style.transform).not.toContain('200px')
    })

    it('拖拽结束后重置 autoplay 计时', () => {
      vi.useFakeTimers()
      const el = mount({ autoplay: '', interval: '1000' })
      const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      vi.advanceTimersByTime(900)
      viewport.dispatchEvent(pointer('pointerdown', 400))
      viewport.dispatchEvent(pointer('pointermove', 200))
      viewport.dispatchEvent(pointer('pointerup', 200))
      // 拖拽已切到第 1 屏；计时从松手重新起算，100ms 后不应再走屏
      vi.advanceTimersByTime(100)
      expect(el.getAttribute('index')).toBe('1')
      vi.advanceTimersByTime(1000)
      expect(el.getAttribute('index')).toBe('2')
      vi.useRealTimers()
    })
  })

  describe('键盘导航', () => {
    function key(el: OASCarousel, k: string): void {
      el.shadowRoot!
        .querySelector<HTMLElement>('[part="dots"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    }

    it('方向键切换屏幕', () => {
      const el = mount()
      key(el, 'ArrowRight')
      expect(el.getAttribute('index')).toBe('1')
      key(el, 'ArrowLeft')
      expect(el.getAttribute('index')).toBe('0')
    })

    it('Home/End 跳到首/末屏', () => {
      const el = mount()
      key(el, 'End')
      expect(el.getAttribute('index')).toBe('2')
      key(el, 'Home')
      expect(el.getAttribute('index')).toBe('0')
    })
  })

  describe('无障碍', () => {
    it('autoplay 时视口 aria-live=off，否则 polite', () => {
      const el = mount({ autoplay: '' })
      expect(el.shadowRoot!.querySelector('[part="viewport"]')?.getAttribute('aria-live')).toBe(
        'off',
      )
      el.removeAttribute('autoplay')
      expect(el.shadowRoot!.querySelector('[part="viewport"]')?.getAttribute('aria-live')).toBe(
        'polite',
      )
    })

    it('激活指示器 aria-current=true', () => {
      const el = mount()
      el.goTo(1)
      const dots = el.shadowRoot!.querySelectorAll<HTMLElement>('[part="dot"]')
      expect(dots[0]!.getAttribute('aria-current')).toBe('false')
      expect(dots[1]!.getAttribute('aria-current')).toBe('true')
    })
  })
})
