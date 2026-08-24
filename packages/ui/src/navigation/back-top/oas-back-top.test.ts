import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASBackTop } from './index.js'

/** happy-dom 中 window.scrollY 是只读 getter（恒 0），用 defineProperty 覆写模拟滚动位置 */
function setWindowScrollY(y: number): void {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
}

/** 触发 window scroll 事件 */
function fireWindowScroll(): void {
  window.dispatchEvent(new Event('scroll'))
}

/** 创建可 mock 滚动几何的容器（happy-dom 的 scrollTop/scrollHeight/clientHeight 可被实例属性遮蔽） */
function mockBox(
  id: string,
  opts: { scrollTop?: number; scrollHeight?: number; clientHeight?: number } = {},
): HTMLDivElement {
  const box = document.createElement('div')
  box.id = id
  Object.defineProperty(box, 'scrollTop', {
    value: opts.scrollTop ?? 0,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(box, 'scrollHeight', {
    value: opts.scrollHeight ?? 1000,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(box, 'clientHeight', {
    value: opts.clientHeight ?? 400,
    configurable: true,
    writable: true,
  })
  document.body.appendChild(box)
  return box
}

const RING_C = 2 * Math.PI * 18 // viewBox 40 r=18

describe('OASBackTop', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    // 防止上个用例的 scrollY mock 泄漏（happy-dom window.scrollY 恒 0，需每次显式复位）
    setWindowScrollY(0)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // ---------- visibility-height 自动显隐 ----------
  it('默认隐藏，滚动超过 visibility-height（默认 400）自动显示并派发 oas-visibility-change', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    const events: boolean[] = []
    el.addEventListener('oas-visibility-change', (e: Event) => {
      events.push((e as CustomEvent<{ visible: boolean }>).detail.visible)
    })
    expect(btn.getAttribute('aria-hidden')).toBe('true')
    expect(btn.classList.contains('show')).toBe(false)

    setWindowScrollY(500)
    fireWindowScroll()
    expect(btn.getAttribute('aria-hidden')).toBe('false')
    expect(btn.classList.contains('show')).toBe(true)
    expect(events).toEqual([true])

    setWindowScrollY(0)
    fireWindowScroll()
    expect(btn.getAttribute('aria-hidden')).toBe('true')
    expect(events).toEqual([true, false])
  })

  it('visibility-height 阈值可配', () => {
    const el = new OASBackTop()
    el.setAttribute('visibility-height', '200')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    setWindowScrollY(100)
    fireWindowScroll()
    expect(btn.getAttribute('aria-hidden')).toBe('true')
    setWindowScrollY(300)
    fireWindowScroll()
    expect(btn.getAttribute('aria-hidden')).toBe('false')
  })

  it('visibility-height=0 时滚动即显示', () => {
    const el = new OASBackTop()
    el.setAttribute('visibility-height', '0')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    setWindowScrollY(1)
    fireWindowScroll()
    expect(btn.getAttribute('aria-hidden')).toBe('false')
  })

  it('受控模式（visible 属性）下滚动不干预显隐；属性切换同样派发 oas-visibility-change', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    const events: boolean[] = []
    el.addEventListener('oas-visibility-change', (e: Event) => {
      events.push((e as CustomEvent<{ visible: boolean }>).detail.visible)
    })
    el.setAttribute('visible', '')
    expect(el.shadowRoot!.querySelector('[part="btn"]')!.getAttribute('aria-hidden')).toBe('false')
    // 受控模式：滚动不改变显隐
    setWindowScrollY(500)
    fireWindowScroll()
    expect(el.shadowRoot!.querySelector('[part="btn"]')!.getAttribute('aria-hidden')).toBe('false')
    // 回到顶部后移除受控属性 → 回到滚动阈值控制 → 隐藏
    setWindowScrollY(0)
    fireWindowScroll()
    el.removeAttribute('visible')
    expect(el.shadowRoot!.querySelector('[part="btn"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(events).toEqual([true, false])
  })

  // ---------- target 目标容器 ----------
  it('target 目标容器滚动自动显隐', () => {
    const box = mockBox('bt-box', { scrollTop: 0, scrollHeight: 1200, clientHeight: 400 })
    const el = new OASBackTop()
    el.setAttribute('target', '#bt-box')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!

    box.scrollTop = 100
    box.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('true')

    box.scrollTop = 500
    box.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('false')
  })

  it('点击 target 容器滚动回其顶部（duration=0 直接跳转）', () => {
    const box = mockBox('bt-go-top', { scrollTop: 800, scrollHeight: 1200, clientHeight: 400 })
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('target', '#bt-go-top')
    el.setAttribute('duration', '0')
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(fired).toBe(1)
    expect(box.scrollTop).toBe(0)
  })

  it('target 属性变化后重新监听新容器', () => {
    const boxA = mockBox('bt-ta', { scrollTop: 0, scrollHeight: 1200, clientHeight: 400 })
    const boxB = mockBox('bt-tb', { scrollTop: 0, scrollHeight: 1200, clientHeight: 400 })
    const el = new OASBackTop()
    el.setAttribute('target', '#bt-ta')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!

    el.setAttribute('target', '#bt-tb')
    boxA.scrollTop = 500
    boxA.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('true')

    boxB.scrollTop = 500
    boxB.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('false')
  })

  // ---------- 默认插槽 ----------
  it('默认插槽自定义内容（有内容时隐藏内置箭头）', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.innerHTML = '<span class="my-c">返回顶部 ↑</span>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.querySelector('.my-c')).not.toBeNull()
    const icon = el.shadowRoot!.querySelector('[part="icon"]')!
    expect(icon.classList.contains('hidden')).toBe(true)
  })

  it('无插槽内容时显示内置箭头图标', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    const icon = el.shadowRoot!.querySelector('[part="icon"]')!
    expect(icon.classList.contains('hidden')).toBe(false)
  })

  // ---------- duration / easing 滚动动画 ----------
  it('duration=0 直接跳转', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('duration', '0')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('duration>0 按缓动逐帧滚动（linear 中间帧位置精确）', () => {
    const box = mockBox('bt-anim', { scrollTop: 800, scrollHeight: 1600, clientHeight: 600 })
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('target', '#bt-anim')
    el.setAttribute('duration', '200')
    el.setAttribute('easing', 'linear')
    document.body.appendChild(el)
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000)
    let calls = 0
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      if (calls++ < 1) {
        nowSpy.mockReturnValue(1100) // p=0.5
        cb(performance.now())
      }
      return calls
    })
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    // linear：800 → 0，p=0.5 处恰为 400
    expect(box.scrollTop).toBe(400)
  })

  it('动画完整跑完到达目标（多次 rAF 推进）', () => {
    const box = mockBox('bt-anim2', { scrollTop: 800, scrollHeight: 1600, clientHeight: 600 })
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('target', '#bt-anim2')
    el.setAttribute('duration', '200')
    document.body.appendChild(el)
    const t0 = performance.now()
    let t = 0
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      t += 100
      cb(t0 + t)
      return t
    })
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(box.scrollTop).toBe(0)
  })

  it('prefers-reduced-motion 时忽略 duration 直接跳转', () => {
    const mq = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false
      },
    }
    vi.stubGlobal('matchMedia', () => mq)
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('duration', '500')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  // ---------- 进出场过渡 / shape / size / theme ----------
  it('transition/shape/size/theme 变体默认值', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    expect(el.getAttribute('data-shape')).toBe('circle')
    expect(el.getAttribute('data-size')).toBe('medium')
    expect(el.getAttribute('data-theme')).toBe('light')
    expect(el.getAttribute('data-transition')).toBe('fade')
  })

  it('transition/shape/size/theme 属性生效', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('shape', 'square')
    el.setAttribute('size', 'large')
    el.setAttribute('theme', 'primary')
    el.setAttribute('transition', 'scale')
    document.body.appendChild(el)
    expect(el.getAttribute('data-shape')).toBe('square')
    expect(el.getAttribute('data-size')).toBe('large')
    expect(el.getAttribute('data-theme')).toBe('primary')
    expect(el.getAttribute('data-transition')).toBe('scale')
  })

  it('样式只走 token 且含 prefers-reduced-motion 降级与焦点环', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('--oas-color-primary')
    expect(css).toContain('--oas-color-bg')
    expect(css).toContain('--oas-color-text-primary')
    expect(css).toContain('--oas-focus-ring')
    expect(css).toContain('--oas-z-fixed')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).not.toContain('#0b6cff')
    expect(css).not.toContain('#18181b')
  })

  // ---------- 显隐受控双模式 + 变更事件（已覆盖上方） + append-to + reduced-motion（已覆盖） ----------
  it('append-to 挂载点：连接后迁移到目标容器', () => {
    const wrap = document.createElement('div')
    const target = document.createElement('div')
    target.id = 'bt-root'
    document.body.append(wrap, target)
    const el = new OASBackTop()
    el.setAttribute('append-to', '#bt-root')
    wrap.appendChild(el)
    expect(el.parentElement).toBe(target)
  })

  // ---------- SSR 水合时序回归：append-to 不得在水合窗口内移动宿主 ----------
  // 缺陷：connectedCallback 即时 teleport，组件 chunk 先于水合 chunk 到达时
  // SSR 位置缺节点/目标容器多节点 → 「Hydration completed but contains mismatches.」
  // 修复语义：readyState 未 complete（水合窗口）宿主保持原位，load 后才迁移。
  describe('append-to SSR 水合时序', () => {
    /** 显式控制 document.readyState（happy-dom 默认 complete，需覆写模拟加载中页面） */
    function setReadyState(state: DocumentReadyState): void {
      Object.defineProperty(document, 'readyState', { value: state, configurable: true })
    }

    afterEach(() => {
      setReadyState('complete')
    })

    it('文档 load 前（水合窗口）宿主保持原位，load 后才迁移到目标容器', () => {
      setReadyState('interactive')
      const wrap = document.createElement('div')
      const target = document.createElement('div')
      target.id = 'bt-hy-root'
      document.body.append(wrap, target)
      const el = new OASBackTop()
      el.setAttribute('append-to', '#bt-hy-root')
      wrap.appendChild(el)
      // 水合窗口内：宿主留在原位（SSR 快照结构不变，水合可命中）
      expect(el.parentElement).toBe(wrap)
      window.dispatchEvent(new Event('load'))
      // load 后：迁移生效
      expect(el.parentElement).toBe(target)
    })

    it('文档已 complete（SPA 后挂载场景）时连接即迁移', () => {
      setReadyState('complete')
      const wrap = document.createElement('div')
      const target = document.createElement('div')
      target.id = 'bt-spa-root'
      document.body.append(wrap, target)
      const el = new OASBackTop()
      el.setAttribute('append-to', '#bt-spa-root')
      wrap.appendChild(el)
      expect(el.parentElement).toBe(target)
    })

    it('load 前断开连接：不再迁移（load 监听已清理）', () => {
      setReadyState('interactive')
      const wrap = document.createElement('div')
      const target = document.createElement('div')
      target.id = 'bt-off-root'
      document.body.append(wrap, target)
      const el = new OASBackTop()
      el.setAttribute('append-to', '#bt-off-root')
      wrap.appendChild(el)
      el.remove()
      window.dispatchEvent(new Event('load'))
      // load 后不迁移：宿主仍处于游离态（未被搬进目标容器）
      expect(el.parentElement).toBe(null)
      expect(el.isConnected).toBe(false)
      expect(target.contains(el)).toBe(false)
    })
  })

  // ---------- show-progress 进度环 ----------
  it('show-progress 滚动进度环随滚动更新', () => {
    const box = mockBox('bt-prog', { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 })
    const el = new OASBackTop()
    el.setAttribute('target', '#bt-prog')
    el.setAttribute('show-progress', '')
    document.body.appendChild(el)
    const ring = el.shadowRoot!.querySelector('[part="ring"]')!
    const bar = el.shadowRoot!.querySelector('[part="ring-bar"]')!
    expect(ring.hasAttribute('hidden')).toBe(false)
    // 顶部 → 进度 0 → dashoffset 满环
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(RING_C, 1)
    // 滚到中部（300/600=0.5）→ 半环
    box.scrollTop = 300
    box.dispatchEvent(new Event('scroll'))
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(RING_C / 2, 1)
    // 滚到底 → 进度 1 → dashoffset 0
    box.scrollTop = 600
    box.dispatchEvent(new Event('scroll'))
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1)
  })

  it('未设置 show-progress 时进度环隐藏', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    const ring = el.shadowRoot!.querySelector('[part="ring"]')!
    expect(ring.hasAttribute('hidden')).toBe(true)
  })

  it('reverse 下进度反向（底部为 0）', () => {
    const box = mockBox('bt-rev-prog', { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 })
    const el = new OASBackTop()
    el.setAttribute('target', '#bt-rev-prog')
    el.setAttribute('reverse', '')
    el.setAttribute('show-progress', '')
    document.body.appendChild(el)
    const bar = el.shadowRoot!.querySelector('[part="ring-bar"]')!
    // 顶部 → reverse 进度 1 → dashoffset 0
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1)
    box.scrollTop = 600
    box.dispatchEvent(new Event('scroll'))
    // 底部（600/600）→ 进度 0 → dashoffset 满环
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(RING_C, 1)
  })

  // ---------- reverse 反向滚到底 ----------
  it('reverse 反向模式：靠近底部隐藏，点击滚到容器底部', () => {
    const box = mockBox('bt-rev', { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 })
    const el = new OASBackTop()
    el.setAttribute('target', '#bt-rev')
    el.setAttribute('reverse', '')
    el.setAttribute('duration', '0')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    // 顶部 → 显示
    expect(btn.getAttribute('aria-hidden')).toBe('false')
    // 滚到底部（scrollTop 上限 = scrollHeight - clientHeight = 600）→ 隐藏
    box.scrollTop = 600
    box.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('true')
    // 回到中上部 → 显示并可点击滚到底
    box.scrollTop = 0
    box.dispatchEvent(new Event('scroll'))
    ;(btn as HTMLElement).click()
    expect(box.scrollTop).toBe(600)
  })

  // ---------- expand 撑满条 / position 方位 / tooltip / badge ----------
  it('expand 撑满条贴底全宽', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('expand', '')
    document.body.appendChild(el)
    expect(el.classList.contains('expand')).toBe(true)
    expect(el.style.left).toBe('0px')
    expect(el.style.right).toBe('0px')
    expect(el.style.bottom).toBe('0px')
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    expect(btn.classList.contains('expand')).toBe(true)
  })

  it('position 方位枚举定位宿主', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('position', 'top-left')
    document.body.appendChild(el)
    expect(el.style.top).toBe('0px')
    expect(el.style.left).toBe('0px')
    expect(el.style.bottom).toBe('')
    expect(el.style.right).toBe('')
  })

  it('无 position 时走 bottom/right 数值定位', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('bottom', '96px')
    el.setAttribute('right', '24px')
    document.body.appendChild(el)
    expect(el.style.bottom).toBe('96px')
    expect(el.style.right).toBe('24px')
  })

  it('tooltip / badge 透传内容', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('tooltip', '回到顶部')
    el.setAttribute('badge', '3')
    document.body.appendChild(el)
    const tip = el.shadowRoot!.querySelector('[part="tooltip"]')!
    expect(tip.textContent).toBe('回到顶部')
    expect(tip.hasAttribute('hidden')).toBe(false)
    const badge = el.shadowRoot!.querySelector('[part="badge"]')!
    expect(badge.textContent).toBe('3')
    expect(badge.hasAttribute('hidden')).toBe(false)
  })

  it('无 tooltip/badge 时对应元素隐藏', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="tooltip"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="badge"]')!.hasAttribute('hidden')).toBe(true)
  })

  // ---------- target 缺省自动探测（嵌套滚动容器内自动吸附） ----------
  it('target 缺省：自动吸附最近可滚祖先容器（overflow auto/scroll 且内容溢出）', () => {
    const outer = document.createElement('div')
    outer.style.overflow = 'auto'
    Object.defineProperty(outer, 'scrollHeight', { value: 1200, configurable: true })
    Object.defineProperty(outer, 'clientHeight', { value: 400, configurable: true })
    const inner = document.createElement('div')
    outer.appendChild(inner)
    document.body.appendChild(outer)
    const el = new OASBackTop()
    inner.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    outer.scrollTop = 500
    outer.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('false')
  })

  it('target 缺省：探测结果缓存，断开重连后仍监听同一容器（连断不清）', () => {
    const outer = document.createElement('div')
    outer.style.overflow = 'auto'
    Object.defineProperty(outer, 'scrollHeight', { value: 1200, configurable: true })
    Object.defineProperty(outer, 'clientHeight', { value: 400, configurable: true })
    document.body.appendChild(outer)
    const el = new OASBackTop()
    outer.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    outer.scrollTop = 500
    outer.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('false')
    // 断开 → 重连：仍吸附同一容器
    el.remove()
    document.body.appendChild(el)
    outer.scrollTop = 0
    outer.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('true')
    outer.scrollTop = 600
    outer.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('false')
  })

  it('target 显式设置优先于自动探测（不会吸附可滚祖先）', () => {
    const outer = document.createElement('div')
    outer.style.overflow = 'auto'
    Object.defineProperty(outer, 'scrollHeight', { value: 1200, configurable: true })
    Object.defineProperty(outer, 'clientHeight', { value: 400, configurable: true })
    const boxA = mockBox('bt-auto-prio', { scrollTop: 0, scrollHeight: 1200, clientHeight: 400 })
    outer.appendChild(boxA)
    document.body.appendChild(outer)
    const el = new OASBackTop()
    el.setAttribute('target', '#bt-auto-prio')
    boxA.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    // target 容器滚动 → 显示
    boxA.scrollTop = 500
    boxA.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('false')
    // 祖先容器滚动 → 不影响（显式 target 顶替自动探测）
    boxA.scrollTop = 0
    boxA.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('true')
    outer.scrollTop = 500
    outer.dispatchEvent(new Event('scroll'))
    expect(btn.getAttribute('aria-hidden')).toBe('true')
  })

  // ---------- tooltip 读屏可达（aria-describedby） ----------
  it('tooltip 开启时按钮 aria-describedby 关联提示文本，提示元素可被读屏读取', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    el.setAttribute('tooltip', '回到顶部')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    const tip = el.shadowRoot!.querySelector('[part="tooltip"]')!
    expect(tip.id).toBeTruthy()
    expect(btn.getAttribute('aria-describedby')).toBe(tip.id)
    expect(tip.getAttribute('aria-hidden')).toBe('false')
  })

  it('无 tooltip 时按钮不设 aria-describedby，提示元素保持读屏隐藏', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    const tip = el.shadowRoot!.querySelector('[part="tooltip"]')!
    expect(btn.getAttribute('aria-describedby')).toBeNull()
    expect(tip.getAttribute('aria-hidden')).toBe('true')
  })

  // ---------- 点击 / 可访问性 / 清理 ----------
  it('可见时点击派发 oas-click', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(fired).toBe(1)
  })

  it('隐藏时点击不派发 oas-click', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(fired).toBe(0)
  })

  it('点击宿主元素（demo 探针 DOM 兜底路径）同样派发 oas-click', () => {
    const el = new OASBackTop()
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    el.click()
    expect(fired).toBe(1)
  })

  it('隐藏时宿主 pointer-events: none，不拦截底层点击', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    expect(el.style.pointerEvents).toBe('none')
    el.setAttribute('visible', '')
    expect(el.style.pointerEvents).toBe('')
  })

  it('aria-label 无障碍名称', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="btn"]')!.getAttribute('aria-label')).toBe(
      '回到顶部',
    )
  })

  it('断开连接移除滚动监听，重连恢复', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[part="btn"]')!
    setWindowScrollY(500)
    fireWindowScroll()
    expect(btn.getAttribute('aria-hidden')).toBe('false')
    el.remove()
    // 断开后触发滚动不应抛错（监听已移除）
    setWindowScrollY(300)
    fireWindowScroll()
    document.body.appendChild(el)
    setWindowScrollY(500)
    fireWindowScroll()
    expect(btn.getAttribute('aria-hidden')).toBe('false')
  })

  // ---------- draggable 拖拽定位 ----------
  describe('draggable 拖拽定位', () => {
    const DRAG_POS_KEY = 'oas-back-top-pos'

    beforeEach(() => {
      window.localStorage.removeItem(DRAG_POS_KEY)
    })

    afterEach(() => {
      window.localStorage.removeItem(DRAG_POS_KEY)
    })

    /** 挂载一个 draggable 可见按钮，并 mock 几何（happy-dom 无布局） */
    function mountDraggable(): OASBackTop {
      const el = new OASBackTop()
      el.setAttribute('visible', '')
      el.setAttribute('draggable', '')
      document.body.appendChild(el)
      Object.defineProperty(el, 'offsetWidth', { value: 40, configurable: true })
      Object.defineProperty(el, 'offsetHeight', { value: 40, configurable: true })
      Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      return el
    }

    it('pointer 拖拽移动更新 left/top（free 定位），pointerup 持久化 localStorage', () => {
      const el = mountDraggable()
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 900,
        top: 700,
        width: 40,
        height: 40,
      } as DOMRect)
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 900,
          clientY: 700,
          button: 0,
          bubbles: true,
        }),
      )
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 500,
          clientY: 100,
          bubbles: true,
        }),
      )
      expect(el.style.left).toBe('500px')
      expect(el.style.top).toBe('100px')
      expect(el.style.bottom).toBe('')
      expect(el.style.right).toBe('')
      el.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, clientX: 500, clientY: 100, bubbles: true }),
      )
      expect(JSON.parse(window.localStorage.getItem(DRAG_POS_KEY)!)).toEqual({
        left: 500,
        top: 100,
      })
    })

    it('位移在阈值内（≤4px）算点击：仍派发 oas-click 并回顶', () => {
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const el = mountDraggable()
      el.setAttribute('duration', '0')
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          bubbles: true,
        }),
      )
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 102,
          clientY: 101,
          bubbles: true,
        }),
      )
      el.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, clientX: 102, clientY: 101, bubbles: true }),
      )
      ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
      expect(fired).toBe(1)
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    })

    it('位移超阈值算拖拽：抑制随后的点击（不派发 oas-click），下一次真实点击恢复正常', () => {
      const el = mountDraggable()
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 900,
          clientY: 700,
          button: 0,
          bubbles: true,
        }),
      )
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 500,
          clientY: 700,
          bubbles: true,
        }),
      )
      el.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, clientX: 500, clientY: 700, bubbles: true }),
      )
      // 拖拽结束后浏览器会在捕获目标上合成 click → 被抑制
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(fired).toBe(0)
      // 下一次真实点击恢复正常
      ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
      expect(fired).toBe(1)
    })

    it('持久化恢复：连接时读取 localStorage 位置（left/top 优先于 bottom/right）', () => {
      window.localStorage.setItem(DRAG_POS_KEY, JSON.stringify({ left: 120, top: 300 }))
      const el = new OASBackTop()
      el.setAttribute('visible', '')
      el.setAttribute('draggable', '')
      document.body.appendChild(el)
      expect(el.style.left).toBe('120px')
      expect(el.style.top).toBe('300px')
      expect(el.style.bottom).toBe('')
      expect(el.style.right).toBe('')
    })

    it('拖出视口边界回夹（left/top 夹在视口内）', () => {
      const el = mountDraggable()
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 900,
        top: 700,
        width: 40,
        height: 40,
      } as DOMRect)
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 900,
          clientY: 700,
          button: 0,
          bubbles: true,
        }),
      )
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 2000,
          clientY: 1500,
          bubbles: true,
        }),
      )
      // 视口 1000×800、按钮 40×40 → 最大 left=960、最大 top=760
      expect(el.style.left).toBe('960px')
      expect(el.style.top).toBe('760px')
    })

    it('pointercancel 清理拖拽会话：dragging 类移除、已移动位置持久化', () => {
      const el = mountDraggable()
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 900,
        top: 700,
        width: 40,
        height: 40,
      } as DOMRect)
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 7,
          clientX: 900,
          clientY: 700,
          button: 0,
          bubbles: true,
        }),
      )
      expect(el.classList.contains('dragging')).toBe(true)
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 7,
          clientX: 600,
          clientY: 500,
          bubbles: true,
        }),
      )
      el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7, bubbles: true }))
      expect(el.classList.contains('dragging')).toBe(false)
      // 中断时已移动的位置同样落盘（不丢拖拽结果）
      expect(JSON.parse(window.localStorage.getItem(DRAG_POS_KEY)!)).toEqual({
        left: 600,
        top: 500,
      })
      // 会话已清理：后续同 pointerId 的 move 不再移动
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 7,
          clientX: 300,
          clientY: 300,
          bubbles: true,
        }),
      )
      expect(el.style.left).toBe('600px')
    })

    it('draggable 时宿主 touch-action:none + 拖拽态 cursor（grab/grabbing）规则存在', () => {
      const el = mountDraggable()
      expect(el.style.touchAction).toBe('none')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain('cursor: grab')
      expect(css).toContain('cursor: grabbing')
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      // 非 draggable：touch-action 复位
      el.removeAttribute('draggable')
      expect(el.style.touchAction).toBe('')
    })
  })
})
