import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASAnchor, OASAnchorTarget } from './index.js'

const ITEMS = JSON.stringify([
  { href: '#section1', title: '第一节' },
  { href: '#section2', title: '第二节' },
  { href: '#section3', title: '第三节' },
])

const NESTED_ITEMS = JSON.stringify([
  {
    href: '#section1',
    title: '第一章',
    children: [
      { href: '#section1-1', title: '1.1 小节' },
      {
        href: '#section1-2',
        title: '1.2 小节',
        children: [{ href: '#section1-2-1', title: '1.2.1 小节' }],
      },
    ],
  },
  { href: '#section2', title: '第二章' },
])

interface RectLike {
  top: number
  bottom: number
  height: number
  left: number
  right: number
  width: number
  x: number
  y: number
}

function rect(top: number, height = 240): RectLike {
  return { top, bottom: top + height, height, left: 0, right: 200, width: 200, x: 0, y: top }
}

function linksOf(el: OASAnchor): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('[part="link"]'))
}

function activeLink(el: OASAnchor): string | null {
  const link = linksOf(el).find((l) => l.getAttribute('aria-current') === 'true')
  return link ? (link.getAttribute('href') ?? null) : null
}

function mount(attrs: Record<string, string> = {}): OASAnchor {
  const el = new OASAnchor()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!('items' in attrs)) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

/** 一次性跑完的 rAF：入参时刻必然 > performance.now()，单帧推进到终点 */
function stubRafInstant(): void {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback): number => {
      cb(performance.now() + 100_000)
      return 1
    },
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}

/** 按 stepMs 逐帧推进 rAF（验证多帧插值滚动） */
function stubRafFrames(stepMs: number): void {
  let base = 0
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback): number => {
      base += stepMs
      cb(performance.now() + base)
      return base
    },
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}

function spyScrollTo(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
}

/** 滚动/尺寸计算经 rAF 节流：默认 rAF stub 不执行回调，手动执行最新注册帧（模拟一帧） */
function flushRaf(): void {
  const raf = requestAnimationFrame as unknown as { mock: { calls: Array<[FrameRequestCallback]> } }
  const cb = raf.mock.calls.at(-1)?.[0]
  if (cb) cb(performance.now() + 100_000)
}

function stubHistory(): { push: ReturnType<typeof vi.spyOn>; replace: ReturnType<typeof vi.spyOn> } {
  const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
  const replace = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
  return { push, replace }
}

describe('OASAnchor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('渲染锚点链接列表，nav+aria-label', () => {
    const el = mount()
    const nav = el.shadowRoot!.querySelector('nav')!
    expect(nav.getAttribute('aria-label')).toBe('锚点导航')
    expect(linksOf(el).length).toBe(3)
  })

  it('点击链接派发 oas-change（含新旧值）并标记当前项', () => {
    const el = mount()
    const details: Array<{ href: string; prevHref: string }> = []
    el.addEventListener('oas-change', (e: Event) =>
      details.push((e as CustomEvent).detail as { href: string; prevHref: string }),
    )
    stubRafInstant()
    spyScrollTo()
    stubHistory()
    ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
    expect(details).toEqual([{ href: '#section1', prevHref: '' }])
    expect(activeLink(el)).toBe('#section1')
  })

  it('active 属性标记当前项', () => {
    const el = mount({ active: '#section2' })
    const links = linksOf(el)
    expect(links[1]!.getAttribute('aria-current')).toBe('true')
    expect(links[0]!.getAttribute('aria-current')).toBe('false')
  })

  it('清除 active 恢复无高亮态', () => {
    const el = mount({ active: '#section2' })
    el.removeAttribute('active')
    expect(activeLink(el)).toBeNull()
  })

  describe('scroll-container 滚动容器', () => {
    function scenario(attrs: Record<string, string> = {}) {
      const container = document.createElement('div')
      container.id = 'scenario-sc'
      container.style.height = '240px'
      container.style.overflow = 'auto'
      const sections = ['section1', 'section2', 'section3'].map((id) => {
        const d = document.createElement('div')
        d.id = id
        container.appendChild(d)
        return d
      })
      const el = new OASAnchor()
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      if (!('items' in attrs)) el.setAttribute('items', ITEMS)
      document.body.appendChild(container)
      document.body.appendChild(el)
      return { el, container, sections }
    }

    function setRects(
      sc: ReturnType<typeof scenario>,
      tops: number[],
      containerTop = 100,
      height = 240,
    ): void {
      sc.container.getBoundingClientRect = () => rect(containerTop, height) as DOMRect
      sc.sections.forEach((s, i) => (s.getBoundingClientRect = () => rect(tops[i] ?? 0) as DOMRect))
    }

    function scroll(sc: ReturnType<typeof scenario>): void {
      sc.container.dispatchEvent(new Event('scroll'))
      flushRaf()
    }

    it('选择器指定滚动容器：滚动切换高亮并派发 oas-change（含新旧值）', () => {
      const sc = scenario({ 'scroll-container': '#scenario-sc' })
      const details: Array<{ href: string; prevHref: string }> = []
      sc.el.addEventListener('oas-change', (e: Event) =>
        details.push((e as CustomEvent).detail as { href: string; prevHref: string }),
      )
      // 初始：s1 在检测线上方 → 高亮 s1
      setRects(sc, [100, 400, 700])
      scroll(sc)
      expect(activeLink(sc.el)).toBe('#section1')
      expect(details).toEqual([{ href: '#section1', prevHref: '' }])
      // 滚动容器：s1 滚出、s2 顶到检测线 → 高亮切到 s2，事件带新旧值
      setRects(sc, [-200, 100, 400])
      scroll(sc)
      expect(activeLink(sc.el)).toBe('#section2')
      expect(details).toEqual([
        { href: '#section1', prevHref: '' },
        { href: '#section2', prevHref: '#section1' },
      ])
    })

    it('滚动到同一项不重复派发事件', () => {
      const sc = scenario({ 'scroll-container': '#scenario-sc' })
      let fired = 0
      sc.el.addEventListener('oas-change', () => fired++)
      setRects(sc, [100, 400, 700])
      scroll(sc)
      setRects(sc, [80, 380, 680])
      scroll(sc)
      expect(fired).toBe(1)
    })

    it('scroll-container 支持元素 id（无 # 前缀）', () => {
      const sc = scenario({ 'scroll-container': 'scenario-sc' })
      setRects(sc, [-200, 100, 400])
      scroll(sc)
      expect(activeLink(sc.el)).toBe('#section2')
    })

    it('scroll-container 支持元素引用 property（scrollContainer）', () => {
      const sc = scenario()
      sc.el.scrollContainer = sc.container
      setRects(sc, [-200, 100, 400])
      scroll(sc)
      expect(activeLink(sc.el)).toBe('#section2')
    })

    it('未指定滚动容器时按视口监听（window scroll）', () => {
      const el = mount()
      const sections = ['section1', 'section2', 'section3'].map((id) => {
        const d = document.createElement('div')
        d.id = id
        document.body.appendChild(d)
        return d
      })
      sections.forEach((s, i) => {
        const tops = [0, 300, 600]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      window.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(activeLink(el)).toBe('#section1')
      // 继续滚动：s1 滚出视口、s2 到达检测线
      sections.forEach((s, i) => {
        const tops = [-200, -50, 250]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      window.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(activeLink(el)).toBe('#section2')
    })

    it('目标不存在时滚动不崩、保持受控高亮', () => {
      const el = mount({ 'scroll-container': '#missing-container', active: '#section3' })
      expect(activeLink(el)).toBe('#section3')
      window.dispatchEvent(new Event('scroll'))
      expect(activeLink(el)).toBe('#section3')
    })
  })

  describe('点击落点（target-offset / block / duration / animation）', () => {
    function viewportSection(top = 400): HTMLElement {
      const d = document.createElement('div')
      d.id = 'section1'
      document.body.appendChild(d)
      d.getBoundingClientRect = () => rect(top) as DOMRect
      return d
    }

    it('target-offset 点击定位落点偏移（viewport）', () => {
      const el = mount({ 'target-offset': '80' })
      viewportSection(400)
      const spy = spyScrollTo()
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledWith(0, 320)
    })

    it('target-offset 未设置时回退 offset 作为落点偏移', () => {
      const el = mount({ offset: '80' })
      viewportSection(400)
      const spy = spyScrollTo()
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledWith(0, 320)
    })

    it('item 级 targetOffset 覆盖全局 target-offset', () => {
      const el = mount({
        items: JSON.stringify([{ href: '#section1', title: '第一节', targetOffset: 40 }]),
        'target-offset': '120',
      })
      viewportSection(400)
      const spy = spyScrollTo()
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledWith(0, 360)
    })

    it('scroll-container 容器内点击按容器滚动（target-offset 生效）', () => {
      const container = document.createElement('div')
      container.id = 'scenario-sc'
      container.style.overflow = 'auto'
      const s1 = document.createElement('div')
      s1.id = 'section1'
      container.appendChild(s1)
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('scroll-container', '#scenario-sc')
      el.setAttribute('target-offset', '80')
      document.body.append(container, el)
      // 目标在当前滚动位置：s1 内容顶 = 300（scrollTop 0 时距容器顶 300）
      container.getBoundingClientRect = () => rect(100) as DOMRect
      s1.getBoundingClientRect = () => rect(400) as DOMRect
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(container.scrollTop).toBe(220)
    })

    it('block=center 居中标定落点', () => {
      const el = mount({ 'target-offset': '0', block: 'center' })
      viewportSection(400)
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
      const spy = spyScrollTo()
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledWith(0, 220) // 400 - (600-240)/2
    })

    it('block=end 底对齐标定落点', () => {
      const el = mount({ 'target-offset': '0', block: 'end' })
      viewportSection(400)
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
      const spy = spyScrollTo()
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledWith(0, 40) // 400 - 600 + 240
    })

    it('duration 控制滚动时长（多帧插值滚动）', () => {
      const el = mount({ 'target-offset': '80', duration: '300' })
      viewportSection(400)
      const spy = spyScrollTo()
      stubRafFrames(16)
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy.mock.calls.length).toBeGreaterThan(3)
      const last = spy.mock.calls.at(-1) as [number, number]
      expect(last).toEqual([0, 320])
    })

    it('duration=0 立即滚动（单次定位）', () => {
      const el = mount({ 'target-offset': '80', duration: '0' })
      viewportSection(400)
      const spy = spyScrollTo()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(0, 320)
    })

    it('animation=false 关闭平滑滚动（立即滚动）', () => {
      const el = mount({ 'target-offset': '80', animation: 'false' })
      viewportSection(400)
      const spy = spyScrollTo()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(0, 320)
    })
  })

  describe('嵌套层级 children', () => {
    function nestedSections(): Map<string, HTMLElement> {
      const ids = ['section1', 'section1-1', 'section1-2', 'section1-2-1', 'section2']
      const map = new Map<string, HTMLElement>()
      for (const id of ids) {
        const d = document.createElement('div')
        d.id = id
        document.body.appendChild(d)
        map.set(id, d)
      }
      return map
    }

    it('嵌套 items 渲染多级链接（层级缩进）', () => {
      const el = mount({ items: NESTED_ITEMS })
      const links = linksOf(el)
      expect(links.length).toBe(5)
      const list = el.shadowRoot!.querySelector('.list')!
      const firstLi = list.children[0] as HTMLElement
      expect(firstLi.dataset.level).toBe('1')
      const sub = firstLi.querySelector<HTMLElement>('ul.anchor-children')!
      expect(sub.children.length).toBe(2)
      const l11 = sub.children[0] as HTMLElement
      expect(l11.dataset.level).toBe('2')
      const l12 = sub.children[1] as HTMLElement
      const subsub = l12.querySelector<HTMLElement>('ul.anchor-children')!
      expect(subsub.children.length).toBe(1)
      expect((subsub.children[0] as HTMLElement).dataset.level).toBe('3')
      // 文本顺序深度优先
      expect(links.map((l) => l.textContent)).toEqual([
        '第一章',
        '1.1 小节',
        '1.2 小节',
        '1.2.1 小节',
        '第二章',
      ])
    })

    it('嵌套子项参与滚动高亮与事件', () => {
      const el = mount({ items: NESTED_ITEMS })
      const container = document.createElement('div')
      container.id = 'nested-sc'
      container.style.overflow = 'auto'
      const targets = nestedSections()
      const map = new Map<HTMLElement, RectLike>()
      map.set(targets.get('section1')!, rect(100))
      map.set(targets.get('section1-1')!, rect(240))
      map.set(targets.get('section1-2')!, rect(340))
      map.set(targets.get('section1-2-1')!, rect(430))
      map.set(targets.get('section2')!, rect(700))
      for (const [el2, r] of map) el2.getBoundingClientRect = () => r as DOMRect
      container.getBoundingClientRect = () => rect(100) as DOMRect
      document.body.appendChild(container)
      el.setAttribute('scroll-container', '#nested-sc')
      const details: string[] = []
      el.addEventListener('oas-change', (e: Event) =>
        details.push((e as CustomEvent).detail.href as string),
      )
      const fire = (): void => {
        container.dispatchEvent(new Event('scroll'))
        flushRaf()
      }
      // 滚到 1.2.1 小节：其 top 越过检测线（line=105），前面各项也越过
      for (const [el2, r] of map) {
        if (el2 === targets.get('section2')) continue
        el2.getBoundingClientRect = () => ({ ...r, top: r.top - 400 }) as DOMRect
      }
      fire()
      expect(activeLink(el)).toBe('#section1-2-1')
      expect(linksOf(el).find((l) => l.getAttribute('href') === '#section1-2-1')?.getAttribute('aria-current')).toBe('true')
      expect(details.at(-1)).toBe('#section1-2-1')
    })
  })

  describe('direction 横向模式', () => {
    it('direction=horizontal 渲染横向布局 class', () => {
      const el = mount({ direction: 'horizontal' })
      expect(el.shadowRoot!.querySelector('nav')!.classList.contains('horizontal')).toBe(true)
    })
  })

  describe('affix 吸附', () => {
    it('affix 属性启用吸顶（sticky + affix-offset）', () => {
      const el = mount({ affix: '', 'affix-offset': '60' })
      expect(el.style.position).toBe('sticky')
      expect(el.style.top).toBe('60px')
    })

    it('移除 affix 恢复默认定位', () => {
      const el = mount({ affix: '' })
      el.removeAttribute('affix')
      expect(el.style.position).toBe('')
      expect(el.style.top).toBe('')
    })
  })

  describe('轨道 + 移动墨水条', () => {
    it('墨水条随当前项移动（top/height 定位）', () => {
      const el = mount({ active: '#section2' })
      const link = linksOf(el)[1]!
      Object.defineProperty(link, 'offsetTop', { value: 40, configurable: true })
      Object.defineProperty(link, 'offsetHeight', { value: 28, configurable: true })
      el.setAttribute('active', '#section2')
      const ink = el.shadowRoot!.querySelector<HTMLElement>('.ink')!
      expect(ink.style.display).not.toBe('none')
      expect(ink.style.top).toBe('40px')
      expect(ink.style.height).toBe('28px')
    })

    it('无 active 时墨水条隐藏', () => {
      const el = mount()
      const ink = el.shadowRoot!.querySelector<HTMLElement>('.ink')!
      expect(ink.style.display).toBe('none')
    })

    it('lineless/block 变体隐藏墨水条', () => {
      for (const variant of ['lineless', 'block']) {
        const el = mount({ variant, active: '#section1' })
        const ink = el.shadowRoot!.querySelector<HTMLElement>('.ink')!
        expect(ink.style.display).toBe('none')
      }
    })
  })

  describe('bounds 触发边界', () => {
    it('bounds 调整触发边界', () => {
      const sc = { el: null as unknown as OASAnchor }
      const container = document.createElement('div')
      container.id = 'scenario-sc'
      container.style.overflow = 'auto'
      const sections = ['section1', 'section2', 'section3'].map((id) => {
        const d = document.createElement('div')
        d.id = id
        container.appendChild(d)
        return d
      })
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      document.body.append(container, el)
      sc.el = el
      // s2 顶在 110（距容器顶 10px，恰在默认 bounds 之外、bounds=15 之内）
      container.getBoundingClientRect = () => rect(100) as DOMRect
      sections.forEach((s, i) => {
        const tops = [-190, 110, 410]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      el.setAttribute('scroll-container', '#scenario-sc')
      container.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(activeLink(el)).toBe('#section1') // 默认 bounds=5 → line=105 → s2(110) 未过线
      el.setAttribute('bounds', '15')
      container.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(activeLink(el)).toBe('#section2') // line=115 → s2(110) 过线
    })
  })

  describe('get-current-anchor 自定义高亮', () => {
    it('自定义策略接管滚动高亮', () => {
      const container = document.createElement('div')
      container.id = 'scenario-sc'
      container.style.overflow = 'auto'
      const sections = ['section1', 'section2', 'section3'].map((id) => {
        const d = document.createElement('div')
        d.id = id
        container.appendChild(d)
        return d
      })
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('scroll-container', '#scenario-sc')
      el.getCurrentAnchor = () => '#section3'
      document.body.append(container, el)
      container.getBoundingClientRect = () => rect(100) as DOMRect
      sections.forEach((s, i) => {
        const tops = [100, 400, 700]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      const details: string[] = []
      el.addEventListener('oas-change', (e: Event) =>
        details.push((e as CustomEvent).detail.href as string),
      )
      container.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(activeLink(el)).toBe('#section3')
      expect(details).toEqual(['#section3'])
    })

    it('get-current-anchor 属性指定全局函数名（HTML 场景）', () => {
      const container = document.createElement('div')
      container.id = 'scenario-sc'
      container.style.overflow = 'auto'
      const sections = ['section1', 'section2', 'section3'].map((id) => {
        const d = document.createElement('div')
        d.id = id
        container.appendChild(d)
        return d
      })
      ;(window as unknown as Record<string, unknown>).anchorForceSecond = () => '#section2'
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('scroll-container', '#scenario-sc')
      el.setAttribute('get-current-anchor', 'anchorForceSecond')
      document.body.append(container, el)
      container.getBoundingClientRect = () => rect(100) as DOMRect
      sections.forEach((s, i) => {
        const tops = [100, 400, 700]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      container.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(activeLink(el)).toBe('#section2')
    })
  })

  describe('hash / replace 历史控制', () => {
    it('点击更新 URL hash（pushState）', () => {
      const el = mount()
      const { push } = stubHistory()
      stubRafInstant()
      spyScrollTo()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(push).toHaveBeenCalledTimes(1)
      expect(String(push.mock.calls[0]![2])).toContain('#section1')
    })

    it('replace 属性改用 replaceState 替换历史', () => {
      const el = mount({ replace: '' })
      const { push, replace } = stubHistory()
      stubRafInstant()
      spyScrollTo()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(replace).toHaveBeenCalledTimes(1)
      expect(push).not.toHaveBeenCalled()
    })

    it('hash=false 不写历史', () => {
      const el = mount({ hash: 'false' })
      const { push, replace } = stubHistory()
      stubRafInstant()
      spyScrollTo()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(push).not.toHaveBeenCalled()
      expect(replace).not.toHaveBeenCalled()
    })
  })

  describe('size / variant 档位', () => {
    it('size 档位映射 nav class', () => {
      const small = mount({ size: 'small' })
      expect(small.shadowRoot!.querySelector('nav')!.classList.contains('size-small')).toBe(true)
      const large = mount({ size: 'large' })
      expect(large.shadowRoot!.querySelector('nav')!.classList.contains('size-large')).toBe(true)
    })

    it('variant 样式变体映射 nav class', () => {
      const el = mount({ variant: 'underline' })
      expect(el.shadowRoot!.querySelector('nav')!.classList.contains('variant-underline')).toBe(true)
      const block = mount({ variant: 'block' })
      expect(block.shadowRoot!.querySelector('nav')!.classList.contains('variant-block')).toBe(true)
    })
  })

  describe('scrollTo 实例方法', () => {
    it('scrollTo(href) 程序化定位并接管高亮', () => {
      const el = mount({ 'target-offset': '80' })
      const d = document.createElement('div')
      d.id = 'section1'
      document.body.appendChild(d)
      d.getBoundingClientRect = () => rect(400) as DOMRect
      const spy = spyScrollTo()
      stubRafInstant()
      el.scrollTo('#section1')
      expect(spy).toHaveBeenCalledWith(0, 320)
      // 目标不存在时静默
      expect(() => el.scrollTo('#nope')).not.toThrow()
    })
  })

  describe('target=_blank / internal-scrollable', () => {
    it('item target=_blank：不拦截默认行为并带 rel=noopener noreferrer', () => {
      const el = mount({
        items: JSON.stringify([
          { href: 'https://example.com/docs', title: '外部文档', target: '_blank' },
        ]),
      })
      const a = el.shadowRoot!.querySelector('[part="link"]')!
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
      let defaultPrevented = false
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
      a.addEventListener('click', (e: Event) => {
        if ((e as MouseEvent).defaultPrevented) defaultPrevented = true
      })
      a.dispatchEvent(ev)
      expect(defaultPrevented).toBe(false)
      // 不派发 oas-change
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(fired).toBe(0)
    })

    it('internal-scrollable 锚点栏自身内部滚动 class', () => {
      const el = mount({ 'internal-scrollable': '' })
      expect(el.shadowRoot!.querySelector('nav')!.classList.contains('internal-scrollable')).toBe(
        true,
      )
    })
  })

  describe('oas-click 事件分离（用户点击 vs 滚动联动）', () => {
    it('点击锚点派发 oas-click（detail 含 href 与完整 item）', () => {
      const el = mount()
      const clicks: Array<{ href: string; item: { href: string; title: string } }> = []
      el.addEventListener('oas-click', (e: Event) => clicks.push((e as CustomEvent).detail))
      stubRafInstant()
      spyScrollTo()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(clicks.length).toBe(1)
      expect(clicks[0]!.href).toBe('#section1')
      expect(clicks[0]!.item).toMatchObject({ href: '#section1', title: '第一节' })
    })

    it('滚动联动只派发 oas-change，不派发 oas-click', () => {
      const container = document.createElement('div')
      container.id = 'scroll-only-sc'
      container.style.overflow = 'auto'
      const sections = ['section1', 'section2', 'section3'].map((id) => {
        const d = document.createElement('div')
        d.id = id
        container.appendChild(d)
        return d
      })
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('scroll-container', '#scroll-only-sc')
      document.body.append(container, el)
      container.getBoundingClientRect = () => rect(100) as DOMRect
      sections.forEach((s, i) => {
        const tops = [100, 400, 700]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      let clicks = 0
      let changes = 0
      el.addEventListener('oas-click', () => clicks++)
      el.addEventListener('oas-change', () => changes++)
      container.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(changes).toBe(1)
      expect(clicks).toBe(0)
    })

    it('外部链接项（target=_blank）点击仍派发 oas-click，不派发 oas-change', () => {
      const el = mount({
        items: JSON.stringify([
          { href: 'https://example.com/docs', title: '外部文档', target: '_blank' },
        ]),
      })
      const clicks: Array<{ href: string }> = []
      let changes = 0
      el.addEventListener('oas-click', (e: Event) => clicks.push((e as CustomEvent).detail))
      el.addEventListener('oas-change', () => changes++)
      el.shadowRoot!.querySelector<HTMLAnchorElement>('[part="link"]')!.click()
      expect(clicks.length).toBe(1)
      expect(clicks[0]!.href).toBe('https://example.com/docs')
      expect(changes).toBe(0)
    })
  })

  describe('resize 重算（高亮 + 墨水条）', () => {
    it('window resize（rAF 节流）重算高亮：布局变化后高亮不因无滚动而过期', () => {
      const container = document.createElement('div')
      container.id = 'resize-sc'
      container.style.overflow = 'auto'
      container.style.height = '240px'
      const sections = ['section1', 'section2', 'section3'].map((id) => {
        const d = document.createElement('div')
        d.id = id
        container.appendChild(d)
        return d
      })
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('scroll-container', '#resize-sc')
      document.body.append(container, el)
      container.getBoundingClientRect = () => rect(100) as DOMRect
      // 初始滚动：s2 过检测线
      sections.forEach((s, i) => {
        const tops = [-200, 100, 400]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      container.dispatchEvent(new Event('scroll'))
      flushRaf()
      expect(activeLink(el)).toBe('#section2')
      // 容器宽度变化 → 章节位置整体下移 → resize 重算回落 s1（无滚动触发）
      sections.forEach((s, i) => {
        const tops = [200, 500, 800]
        s.getBoundingClientRect = () => rect(tops[i]!) as DOMRect
      })
      window.dispatchEvent(new Event('resize'))
      flushRaf()
      expect(activeLink(el)).toBe('#section1')
    })

    it('resize 后当前项不变时仍重定位墨水条（布局变化）', () => {
      const el = mount({ active: '#section2' })
      const link = linksOf(el)[1]!
      Object.defineProperty(link, 'offsetTop', { value: 40, configurable: true })
      Object.defineProperty(link, 'offsetHeight', { value: 28, configurable: true })
      el.setAttribute('active', '#section2')
      const ink = el.shadowRoot!.querySelector<HTMLElement>('.ink')!
      expect(ink.style.top).toBe('40px')
      // 布局变化：offsetTop 改变 → resize 后 ink 跟随新位置
      Object.defineProperty(link, 'offsetTop', { value: 88, configurable: true })
      window.dispatchEvent(new Event('resize'))
      flushRaf()
      expect(ink.style.top).toBe('88px')
    })
  })

  describe('block=nearest 最小滚动落点', () => {
    function viewportSection(top = 400): HTMLElement {
      const d = document.createElement('div')
      d.id = 'section1'
      document.body.appendChild(d)
      d.getBoundingClientRect = () => rect(top) as DOMRect
      return d
    }

    it('目标已完全可见：不滚动（最小滚动量语义）', () => {
      const el = mount({ 'target-offset': '0', block: 'nearest' })
      viewportSection(100)
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
      const spy = spyScrollTo()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).not.toHaveBeenCalled()
    })

    it('目标在视口下方：最小滚动使目标底部对齐视口底', () => {
      const el = mount({ 'target-offset': '0', block: 'nearest' })
      viewportSection(400)
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
      const spy = spyScrollTo()
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledWith(0, 40) // 400 - 600 + 240
    })

    it('目标在视口上方：对齐顶部（最小滚动露出）', () => {
      const el = mount({ 'target-offset': '0', block: 'nearest' })
      viewportSection(-100)
      Object.defineProperty(window, 'scrollY', { value: 800, configurable: true })
      const spy = spyScrollTo()
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(spy).toHaveBeenCalledWith(0, 700) // -100 + 800
    })

    it('容器内目标已可见：不滚动', () => {
      const container = document.createElement('div')
      container.id = 'nearest-sc'
      container.style.overflow = 'auto'
      container.style.height = '240px'
      const s1 = document.createElement('div')
      s1.id = 'section1'
      container.appendChild(s1)
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('scroll-container', '#nearest-sc')
      el.setAttribute('block', 'nearest')
      document.body.append(container, el)
      // happy-dom 不计算布局：显式给定容器可视高度（nearest 判定依赖 clientHeight）
      Object.defineProperty(container, 'clientHeight', { value: 240, configurable: true })
      container.getBoundingClientRect = () => rect(100) as DOMRect
      s1.getBoundingClientRect = () => rect(100) as DOMRect // contentTop=0，整块在容器内
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(container.scrollTop).toBe(0)
    })

    it('容器内目标在下方：滚动到底部对齐（最小滚动量）', () => {
      const container = document.createElement('div')
      container.id = 'nearest-sc2'
      container.style.overflow = 'auto'
      container.style.height = '240px'
      const s1 = document.createElement('div')
      s1.id = 'section1'
      container.appendChild(s1)
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('scroll-container', '#nearest-sc2')
      el.setAttribute('block', 'nearest')
      document.body.append(container, el)
      Object.defineProperty(container, 'clientHeight', { value: 240, configurable: true })
      container.getBoundingClientRect = () => rect(100) as DOMRect
      s1.getBoundingClientRect = () => rect(400) as DOMRect // contentTop=300
      stubRafInstant()
      stubHistory()
      ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
      expect(container.scrollTop).toBe(300) // 300 - 240 + 240
    })
  })

  describe('DSD 真水合', () => {
    it('SSR 快照接管：不重建 shadow、active 应用、事件可触发', () => {
      const el = new OASAnchor()
      el.setAttribute('items', ITEMS)
      el.setAttribute('active', '#section2')
      el.shadowRoot!.innerHTML = `
        <meta data-oas-ssr="oas-anchor" data-oas-ssr-v="1">
        <style>.probe { color: red; }</style>
        <nav part="nav" class="nav" aria-label="锚点导航">
          <div part="ink" class="ink" aria-hidden="true"></div>
          <ul part="list" class="list">
            <li class="anchor-item" data-level="1"><a part="link" href="#section1" aria-current="false">第一节</a></li>
            <li class="anchor-item" data-level="1"><a part="link" href="#section2" aria-current="false">第二节</a></li>
            <li class="anchor-item" data-level="1"><a part="link" href="#section3" aria-current="false">第三节</a></li>
          </ul>
        </nav>
      `
      document.body.appendChild(el)
      // 指纹移除、style 引用保持（shadow 未重建）
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      const style = el.shadowRoot!.querySelector('style')!
      expect(style.textContent).toBe('.probe { color: red; }')
      // items 指纹命中 → 链接不被重建
      const links = linksOf(el)
      expect(links.length).toBe(3)
      expect(links[1]!.getAttribute('aria-current')).toBe('true')
      // 水合后事件仍可触发
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      ;(links[2] as HTMLElement).click()
      expect(fired).toBe(1)
      el.remove()
    })
  })
})

describe('OASAnchorTarget', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 part=target 包裹插槽内容，id 同步到内部 target', () => {
    const t = new OASAnchorTarget()
    t.setAttribute('id', 'mark-1')
    t.innerHTML = '<h4>目标标题</h4>'
    document.body.appendChild(t)
    const target = t.shadowRoot!.querySelector('[part="target"]')!
    expect(target.getAttribute('id')).toBe('mark-1')
    expect(target.querySelector('slot')).not.toBeNull()
    expect(t.textContent).toBe('目标标题')
  })

  it('id 变化同步到内部 target', () => {
    const t = new OASAnchorTarget()
    document.body.appendChild(t)
    t.setAttribute('id', 'mark-2')
    expect(t.shadowRoot!.querySelector('[part="target"]')!.getAttribute('id')).toBe('mark-2')
    t.removeAttribute('id')
    expect(t.shadowRoot!.querySelector('[part="target"]')!.hasAttribute('id')).toBe(false)
  })
})
