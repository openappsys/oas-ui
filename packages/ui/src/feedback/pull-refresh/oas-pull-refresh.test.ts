import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASPullRefresh } from './index.js'

/**
 * oas-pull-refresh（feedback 族，移动原生形态批）—— 下拉刷新。
 *
 * 设计前必答清单（AGENTS.md 六问）：
 * 1. 取消路径：释放不足阈值回弹归零（零事件零残留）；pointercancel 强制回弹不派发；
 *    refreshing 中断开连接时 onCleanup 清 success 计时器（零孤儿产物）。
 * 2. 属性默认值：`threshold` 缺省 60px（非法/非正回落 60，生效值夹取到 max-pull-1（渐近不可达修正））；
 *    `max-pull` 缺省 100px（非法/非正回落 100）；`disabled` 缺省否；`refreshing` 缺省否。
 * 3. 多步交互失败点：释放过阈值派发 oas-refresh 后停驻阈值高度进刷新中视觉——宿主不响应则
 *    保持停驻（等待宿主）；宿主移除 refreshing → success 文案 ~600ms → 回弹复位；
 *    refreshing/success 中再次下拉忽略；拖拽中 disabled 置位立即取消回弹。
 * 4. 破坏性选项：无破坏性操作；回弹/复位不产生副作用。
 * 5. 键盘/ARIA：指示区 role="status" + aria-live="polite"（状态文案切换读屏播报）；
 *    组件不抢键盘焦点（纯手势增强，宿主内容语义不受影响）。
 * 6. 受控/非受控：`refreshing` 为宿主受控属性，组件只派发事件、零属性写回；
 *    属性名均非 DOM 内建 property（HTMLElement 无 disabled/threshold/max-pull/refreshing），
 *    Vue/React 桥接安全。
 *
 * happy-dom 限制：无布局引擎（getBoundingClientRect 全 0、CSS 类样式不进 element.style）——
 * 拉动位移断言走 track 的 inline transform，接管断言走事件 defaultPrevented + data-dragging
 * 属性 + 实例覆写 setPointerCapture；配色断言锁「样式表含 token 表达式」的机制形态，
 * 真实配色/视觉由 e2e（qa-regression/pull-refresh.spec.ts）在浏览器复核。
 */

const DEFAULT_HTML = [
  '<div class="row">列表项 01</div>',
  '<div class="row">列表项 02</div>',
  '<div class="row">列表项 03</div>',
].join('')

function mount(attrs: Record<string, string> = {}, html: string = DEFAULT_HTML): OASPullRefresh {
  const el = new OASPullRefresh()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

/** 滚动盒（.root）：容器自身为滚动盒 */
function scroller(el: OASPullRefresh): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="root"]')!
}

/** 位移层（.track）：拉动 transform 承载 */
function track(el: OASPullRefresh): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
}

function indicator(el: OASPullRefresh): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
}

function labelEl(el: OASPullRefresh): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
}

function arrowEl(el: OASPullRefresh): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="arrow"]')!
}

function spinnerEl(el: OASPullRefresh): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="spinner"]')!
}

/** 当前拉动位移（inline transform 的 translateY，px） */
function pullOf(el: OASPullRefresh): number {
  const t = track(el).style.transform
  const m = /translateY\(([-\d.]+)px\)/.exec(t)
  return m ? Number(m[1]) : 0
}

/** 宿主状态镜像（data-state：idle/pulling/refreshing/success） */
function stateOf(el: OASPullRefresh): string | null {
  return el.getAttribute('data-state')
}

/** 记录 setPointerCapture/releasePointerCapture 调用（happy-dom 可能未实现，直接覆写实例方法） */
function spyCapture(el: OASPullRefresh): { captures: number[]; releases: number[] } {
  const captures: number[] = []
  const releases: number[] = []
  scroller(el).setPointerCapture = ((id: number) => captures.push(id)) as Element['setPointerCapture']
  scroller(el).releasePointerCapture = ((id: number) => releases.push(id)) as Element['releasePointerCapture']
  return { captures, releases }
}

function pointer(type: string, clientY: number, pointerId = 7): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId,
    clientY,
  })
}

/** 完整下拉手势：down(0) → 逐档 move → up，dy 数组为逐档累计位移 */
function drag(el: OASPullRefresh, dys: number[], pointerId = 7): void {
  const root = scroller(el)
  root.dispatchEvent(pointer('pointerdown', 0, pointerId))
  for (const dy of dys) root.dispatchEvent(pointer('pointermove', dy, pointerId))
  root.dispatchEvent(pointer('pointerup', dys[dys.length - 1] ?? 0, pointerId))
}

/** 记录组件派发的 oas-refresh */
function recordRefresh(el: OASPullRefresh): CustomEvent[] {
  const events: CustomEvent[] = []
  el.addEventListener('oas-refresh', (e) => events.push(e as CustomEvent))
  return events
}

function styleText(el: OASPullRefresh): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASPullRefresh', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.useRealTimers()
  })

  // ---------- 结构与空态 ----------

  it('渲染结构：滚动盒 + 位移层 + 指示区 + 内容插槽；初始位移 0（内联值确定）状态 idle', () => {
    const el = mount()
    expect(scroller(el)).not.toBeNull()
    expect(track(el)).not.toBeNull()
    expect(indicator(el)).not.toBeNull()
    expect(labelEl(el)).not.toBeNull()
    expect(el.shadowRoot!.querySelector('slot:not([name])')).not.toBeNull()
    expect(pullOf(el)).toBe(0)
    // 初始即写内联 transform（宿主/测试可稳定读取，不经手势也有确定值）
    expect(track(el).style.transform).toBe('translateY(0px)')
    expect(stateOf(el)).toBe('idle')
  })

  it('空态：无内容不报错，手势照常（指示区 + 回弹）', () => {
    const el = mount({}, '')
    const events = recordRefresh(el)
    drag(el, [100])
    expect(events.length).toBe(1)
    expect(pullOf(el)).toBe(60)
    expect(stateOf(el)).toBe('refreshing')
  })

  // ---------- 手势接管与阻力曲线 ----------

  it('顶部下拉接管：dy>0 才接管（preventDefault + setPointerCapture + data-dragging）', () => {
    const el = mount()
    const { captures } = spyCapture(el)
    const root = scroller(el)
    // 向上移动（dy<0）：不接管、放行原生滚动
    root.dispatchEvent(pointer('pointerdown', 0))
    const upFirst = root.dispatchEvent(pointer('pointermove', -30))
    expect(upFirst, 'dy<0 不接管，不 preventDefault').toBe(true)
    expect(el.hasAttribute('data-dragging')).toBe(false)
    // 向下移动：接管
    const down = root.dispatchEvent(pointer('pointermove', 30))
    expect(down, 'dy>0 接管，preventDefault 阻断原生滚动').toBe(false)
    expect(el.hasAttribute('data-dragging')).toBe(true)
    expect(captures).toEqual([7])
  })

  it('阻力曲线：位移渐近 max-pull（默认 100），随 dy 增大而增益递减', () => {
    const el = mount()
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.dispatchEvent(pointer('pointermove', 50))
    const p1 = pullOf(el)
    root.dispatchEvent(pointer('pointermove', 150))
    const p2 = pullOf(el)
    root.dispatchEvent(pointer('pointermove', 10050))
    const p3 = pullOf(el)
    // 渐近曲线：每段增量递减，上限封顶 max-pull
    expect(p1).toBeCloseTo(100 * (1 - Math.exp(-0.5)), 1)
    expect(p2 - p1, '第二段增量小于第一段（阻力递增）').toBeLessThan(p1)
    expect(p3).toBeLessThanOrEqual(100)
    expect(p3, '大位移渐近上限').toBeGreaterThan(99)
  })

  it('过阈值进入松手提示：label 变「松开立即刷新」+ 箭头翻转（flipped 类）', () => {
    const el = mount()
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.dispatchEvent(pointer('pointermove', 40))
    expect(labelEl(el).textContent).toBe('下拉刷新')
    expect(arrowEl(el).classList.contains('flipped')).toBe(false)
    root.dispatchEvent(pointer('pointermove', 100))
    expect(labelEl(el).textContent).toBe('松开立即刷新')
    expect(arrowEl(el).classList.contains('flipped')).toBe(true)
  })

  it('回拉越回阈值：提示回落「下拉刷新」+ 箭头复原', () => {
    const el = mount()
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.dispatchEvent(pointer('pointermove', 100))
    expect(arrowEl(el).classList.contains('flipped')).toBe(true)
    root.dispatchEvent(pointer('pointermove', 30))
    expect(labelEl(el).textContent).toBe('下拉刷新')
    expect(arrowEl(el).classList.contains('flipped')).toBe(false)
  })

  // ---------- 释放判定 ----------

  it('释放过阈值：派发 oas-refresh 一次 + 停驻阈值高度（60px）进刷新中视觉', () => {
    const el = mount()
    const events = recordRefresh(el)
    const { releases } = spyCapture(el)
    drag(el, [100])
    expect(events.length, '恰好派发一次').toBe(1)
    expect(pullOf(el), '停驻在阈值高度').toBe(60)
    expect(stateOf(el)).toBe('refreshing')
    expect(labelEl(el).textContent).toBe('刷新中…')
    expect(el.hasAttribute('data-dragging')).toBe(false)
    expect(releases, '释放指针捕获').toEqual([7])
  })

  it('释放不足阈值：回弹归零、零事件零残留', () => {
    const el = mount()
    const events = recordRefresh(el)
    drag(el, [40])
    expect(events.length, '不足阈值不派发').toBe(0)
    expect(pullOf(el), '回弹归零').toBe(0)
    expect(stateOf(el)).toBe('idle')
    expect(el.hasAttribute('data-dragging')).toBe(false)
    expect(labelEl(el).textContent).toBe('下拉刷新')
  })

  it('pointercancel：强制回弹、不派发 oas-refresh（取消语义）', () => {
    const el = mount()
    const events = recordRefresh(el)
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.dispatchEvent(pointer('pointermove', 100))
    root.dispatchEvent(pointer('pointercancel', 100))
    expect(events.length).toBe(0)
    expect(pullOf(el)).toBe(0)
    expect(stateOf(el)).toBe('idle')
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  it('未移动直接松手：无事发生（pull=0 < threshold）', () => {
    const el = mount()
    const events = recordRefresh(el)
    scroller(el).dispatchEvent(pointer('pointerdown', 0))
    scroller(el).dispatchEvent(pointer('pointerup', 0))
    expect(events.length).toBe(0)
    expect(pullOf(el)).toBe(0)
    expect(stateOf(el)).toBe('idle')
  })

  it('滚轮不触发：wheel 事件不改变状态与位移（只 pointer 拖拽）', () => {
    const el = mount()
    const events = recordRefresh(el)
    scroller(el).dispatchEvent(new Event('wheel', { bubbles: true }))
    scroller(el).dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
    expect(events.length).toBe(0)
    expect(pullOf(el)).toBe(0)
    expect(stateOf(el)).toBe('idle')
  })

  // ---------- refreshing 生命周期 ----------

  it('宿主置 refreshing：停驻保持刷新中视觉（不重复派发）', () => {
    const el = mount()
    const events = recordRefresh(el)
    drag(el, [100])
    expect(events.length).toBe(1)
    el.setAttribute('refreshing', '')
    expect(stateOf(el)).toBe('refreshing')
    expect(pullOf(el)).toBe(60)
    expect(labelEl(el).textContent).toBe('刷新中…')
    expect(events.length, '宿主响应不回派事件').toBe(1)
  })

  it('refreshing 移除 → success 文案 ~600ms → 回弹复位（状态机完整链）', () => {
    const el = mount()
    const events = recordRefresh(el)
    drag(el, [100])
    el.setAttribute('refreshing', '')
    el.removeAttribute('refreshing')
    expect(stateOf(el)).toBe('success')
    expect(labelEl(el).textContent).toBe('刷新成功')
    expect(pullOf(el), 'success 停驻期间保持阈值高度').toBe(60)
    vi.advanceTimersByTime(599)
    expect(stateOf(el)).toBe('success')
    vi.advanceTimersByTime(1)
    expect(stateOf(el)).toBe('idle')
    expect(pullOf(el), '回弹归零').toBe(0)
    expect(labelEl(el).textContent).toBe('下拉刷新')
    expect(el.hasAttribute('data-dragging')).toBe(false)
    expect(events.length).toBe(1)
  })

  it('refreshing 中再次下拉忽略：无第二次派发、位移不变', () => {
    const el = mount()
    const events = recordRefresh(el)
    drag(el, [100])
    el.setAttribute('refreshing', '')
    drag(el, [120])
    expect(events.length).toBe(1)
    expect(pullOf(el)).toBe(60)
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  it('程序性 refreshing（无手势直接置位）：停驻刷新中视觉、不派发；移除走 success 复位', () => {
    const el = mount()
    const events = recordRefresh(el)
    el.setAttribute('refreshing', '')
    expect(stateOf(el)).toBe('refreshing')
    expect(pullOf(el)).toBe(60)
    expect(labelEl(el).textContent).toBe('刷新中…')
    expect(events.length, '程序性置位不派发 oas-refresh').toBe(0)
    el.removeAttribute('refreshing')
    vi.advanceTimersByTime(600)
    expect(stateOf(el)).toBe('idle')
    expect(pullOf(el)).toBe(0)
  })

  it('idle 时移除 refreshing（从未进入刷新）：无 success 假播报', () => {
    const el = mount()
    el.removeAttribute('refreshing')
    expect(stateOf(el)).toBe('idle')
    expect(labelEl(el).textContent).toBe('下拉刷新')
  })

  it('宿主不响应 oas-refresh（不置 refreshing）：保持停驻等待宿主', () => {
    const el = mount()
    drag(el, [100])
    vi.advanceTimersByTime(5000)
    expect(stateOf(el)).toBe('refreshing')
    expect(pullOf(el)).toBe(60)
  })

  it('断开连接清 success 计时器：断连后计时器到点不报错、状态冻结', () => {
    const el = mount()
    drag(el, [100])
    el.setAttribute('refreshing', '')
    el.removeAttribute('refreshing')
    expect(stateOf(el)).toBe('success')
    el.remove()
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
  })

  // ---------- disabled ----------

  it('disabled：手势全禁（不接管、零事件、零位移）+ data-disabled 镜像', () => {
    const el = mount({ disabled: '' })
    const events = recordRefresh(el)
    expect(el.hasAttribute('data-disabled')).toBe(true)
    drag(el, [100])
    expect(events.length).toBe(0)
    expect(pullOf(el)).toBe(0)
    expect(stateOf(el)).toBe('idle')
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  it('拖拽中置 disabled：立即取消回弹（不派发）', () => {
    const el = mount()
    const events = recordRefresh(el)
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.dispatchEvent(pointer('pointermove', 80))
    el.setAttribute('disabled', '')
    root.dispatchEvent(pointer('pointermove', 100))
    root.dispatchEvent(pointer('pointerup', 100))
    expect(events.length).toBe(0)
    expect(pullOf(el)).toBe(0)
    expect(stateOf(el)).toBe('idle')
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  // ---------- 滚动协调 ----------

  it('scrollTop > 0 不接管：原生滚动不受干扰（零 preventDefault、零位移）', () => {
    const el = mount()
    const events = recordRefresh(el)
    const root = scroller(el)
    root.scrollTop = 50
    expect(root.scrollTop).toBe(50)
    drag(el, [100])
    expect(events.length).toBe(0)
    expect(pullOf(el)).toBe(0)
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  it('拖拽起点在顶部、松手前列表被滚走（scrollTop > 0）：按当前 pull 判定不派发', () => {
    // 机制说明：接管后 capture 生效，原生滚动被阻断（preventDefault），此路径理论上不可达；
    // 防御性守卫：move 时若已滚离顶部且尚未接管则放弃手势
    const el = mount()
    const events = recordRefresh(el)
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.scrollTop = 30
    root.dispatchEvent(pointer('pointermove', 50))
    root.dispatchEvent(pointer('pointerup', 50))
    expect(events.length).toBe(0)
  })

  // ---------- 属性解析 ----------

  it('threshold 自定义：阈值 40 → dy=55（pull≈42.3）释放即刷新、停驻 40px', () => {
    const el = mount({ threshold: '40' })
    const events = recordRefresh(el)
    drag(el, [55])
    expect(events.length).toBe(1)
    expect(pullOf(el)).toBe(40)
  })

  it('threshold 非法回落 60；threshold 超过 max-pull 按上限夹取（渐近封顶后可达）', () => {
    const el = mount({ threshold: 'abc' })
    const events = recordRefresh(el)
    drag(el, [100])
    expect(pullOf(el)).toBe(60)
    expect(events.length).toBe(1)

    const el2 = mount({ threshold: '150', 'max-pull': '100' })
    const events2 = recordRefresh(el2)
    drag(el2, [2000])
    // threshold 夹到 max-pull-1（=max-pull 时渐近曲线不可达，review M5 配置陷阱修正）
    expect(events2.length, 'threshold=150 夹到 99，大位移后可达').toBe(1)
    expect(pullOf(el2)).toBe(99)
  })

  it('max-pull 自定义：位移上限 50、threshold 夹取后 40 仍可达', () => {
    const el = mount({ 'max-pull': '50', threshold: '40' })
    const events = recordRefresh(el)
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.dispatchEvent(pointer('pointermove', 10000))
    expect(pullOf(el), '位移封顶 max-pull').toBe(50)
    root.dispatchEvent(pointer('pointermove', 30))
    expect(pullOf(el), '回拉按阻力曲线回落').toBeCloseTo(50 * (1 - Math.exp(-0.6)), 1)
    root.dispatchEvent(pointer('pointerup', 30))
    expect(events.length, '回拉后不足阈值回弹不派发').toBe(0)
    expect(pullOf(el)).toBe(0)
    // max-pull=50 下达到 pull 40 需 dy ≥ 50·ln(5) ≈ 80.5
    drag(el, [81])
    expect(events.length, 'threshold 40 < max-pull 50：按 40 判定可达').toBe(1)
    expect(pullOf(el), '停驻阈值高度').toBe(40)
  })

  // ---------- i18n ----------

  it('指示区文案走 i18n（zh-CN 基准 + en 切换跟随）', () => {
    const el = mount()
    expect(labelEl(el).textContent).toBe('下拉刷新')
    setLocale(en)
    expect(labelEl(el).textContent).toBe('Pull to refresh')
    setLocale('zh-CN')
    expect(labelEl(el).textContent).toBe('下拉刷新')
  })

  it('en 文案：松手/刷新中/成功四态', () => {
    const el = mount()
    setLocale(en)
    const root = scroller(el)
    root.dispatchEvent(pointer('pointerdown', 0))
    root.dispatchEvent(pointer('pointermove', 100))
    expect(labelEl(el).textContent).toBe('Release to refresh')
    root.dispatchEvent(pointer('pointerup', 100))
    expect(labelEl(el).textContent).toBe('Refreshing…')
    el.setAttribute('refreshing', '')
    el.removeAttribute('refreshing')
    expect(labelEl(el).textContent).toBe('Refresh successful')
    vi.advanceTimersByTime(600)
    expect(labelEl(el).textContent).toBe('Pull to refresh')
  })

  // ---------- a11y ----------

  it('指示区 role="status" + aria-live="polite"；滚动盒键盘可达、宿主不抢焦点', () => {
    const el = mount()
    expect(indicator(el).getAttribute('role')).toBe('status')
    expect(indicator(el).getAttribute('aria-live')).toBe('polite')
    // 宿主本身不加 tabindex（不抢内容焦点）；滚动盒 tabindex=0 键盘可达
    // （axe scrollable-region-focusable：滚动区域必须键盘可滚动）
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(scroller(el).getAttribute('tabindex')).toBe('0')
    // 键盘聚焦可见（focus ring 走 token）
    const css = styleText(el)
    expect(css).toContain('.root:focus-visible')
    expect(css).toContain('var(--oas-focus-ring)')
  })

  it('spinner/箭头互斥：refreshing 态 data-state 镜像供 CSS 互斥显示', () => {
    const el = mount()
    // 初始：data-state=idle（CSS 默认隐藏 spinner）
    expect(spinnerEl(el)).not.toBeNull()
    drag(el, [100])
    expect(stateOf(el)).toBe('refreshing')
    el.setAttribute('refreshing', '')
    el.removeAttribute('refreshing')
    expect(stateOf(el)).toBe('success')
    vi.advanceTimersByTime(600)
    expect(stateOf(el)).toBe('idle')
  })

  // ---------- 样式 token ----------

  it('配色只走 CSS 变量 token（无硬编码色值），暗色随 token 适配', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('var(--oas-color-text-secondary)')
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toContain('var(--oas-color-border)')
    expect(css).toContain('--oas-pull-refresh-indicator-height')
    expect(css).toContain('--oas-pull-refresh-label-color')
    expect(css).toContain('--oas-pull-refresh-spinner-color')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  it('滚动协调 CSS：overscroll-behavior-y contain + touch-action pan-y（防滚动链、保留纵向接管权）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('overscroll-behavior-y: contain')
    expect(css).toContain('touch-action: pan-y')
    expect(css).toContain('overflow-y: auto')
  })

  it('prefers-reduced-motion：回弹/过渡无动画', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })

  // ---------- DSD 真水合 ----------

  it('DSD 真水合：快照接管（shadow 不重建、指纹移除、结构保留），水合后属性变化可更新', () => {
    const ref = mount()
    const snapshot = ref.shadowRoot!.innerHTML
    expect(snapshot).toContain('<style>')
    ref.remove()

    const el = new OASPullRefresh()
    el.innerHTML = DEFAULT_HTML
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-pull-refresh" data-oas-ssr-v="1">${snapshot}`
    const styleRef = el.shadowRoot!.querySelector('style')
    document.body.appendChild(el)

    expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(scroller(el)).not.toBeNull()
    expect(stateOf(el)).toBe('idle')

    el.setAttribute('refreshing', '')
    expect(stateOf(el)).toBe('refreshing')
  })

  it('DSD 回退：快照缺关键结构时 render 全量重建', () => {
    const el = new OASPullRefresh()
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-pull-refresh" data-oas-ssr-v="1"><span>broken</span>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="root"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(stateOf(el)).toBe('idle')
  })
})
