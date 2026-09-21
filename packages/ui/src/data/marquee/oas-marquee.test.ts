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

/** 克隆组（shadow 内的具名 slot 容器；份本体在 light DOM，见 cloneCopies） */
function cloneGroup(el: OASMarquee): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="group"].clone')!
}

/** 克隆份包裹节点（light DOM 直系子节点，带内部标记属性）：页面样式表可达的唯一位置 */
function cloneCopies(el: OASMarquee): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>(':scope > [data-oas-marquee-copy]')]
}

/** 各克隆份文本拼接（应等于源内容文本 × 份数） */
function cloneText(el: OASMarquee): string {
  return cloneCopies(el)
    .map((c) => c.textContent ?? '')
    .join('')
}

/**
 * 当前生效的克隆份数：克隆份历史上落在 shadow 克隆组内（`.copy`），现在落在 light DOM
 * （页面样式可达，见 syncClone 注释）。两处都数——份数口径（容器测量）断言与克隆份落点无关。
 */
function copyCount(el: OASMarquee): number {
  return cloneGroup(el).querySelectorAll('.copy').length + cloneCopies(el).length
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
    expect(cloneGroup(el).getAttribute('aria-hidden')).toBe('true')
    expect(cloneText(el)).toBe('OAS-UI 滚动内容')
    expect(groups[0]!.querySelector('slot')).not.toBeNull()
  })

  it('克隆份在 light DOM（页面样式表可达）：宿主直系包裹节点 + 具名 slot 投递 + ::slotted 等价盒模型', () => {
    // 缺陷形态（旧实现）：克隆份落在 shadow 内 —— 页面样式表（class 选择器）对 shadow 内容无效，
    // 依赖页面 class 定尺寸的内容在克隆份上尺寸归零 → 右侧整片空白。
    // 修法：克隆份包裹节点放 light DOM（页面 CSS 自然生效），盒模型由 shadow 的
    // ::slotted([data-oas-marquee-copy]) 给（与源份 .copy 严格等价，份宽 == 位移距离不变量不变）。
    const el = mount({}, 'OAS-UI')
    const copies = cloneCopies(el)
    expect(copies.length, '克隆份是宿主 light DOM 直系子节点').toBe(1)
    expect(copies[0]!.getAttribute('slot'), '投递到克隆组的具名 slot').toBe('oas-marquee-copy')
    expect(cloneGroup(el).querySelector('slot[name="oas-marquee-copy"]')).not.toBeNull()
    expect(copies[0]!.getAttribute('aria-hidden'), '克隆份对读屏隐藏（自身标注，不依赖 shadow 祖先）').toBe('true')
    // 缺陷回归：aria-hidden 只挡读屏，克隆份里的按钮/链接仍留在 Tab 序里（可误操作视觉副本）
    expect(copies[0]!.hasAttribute('inert'), '克隆份带 inert（视觉副本不进键盘/AT 导航）').toBe(true)
    expect(copies[0]!.textContent).toBe('OAS-UI')
    // 幂等：重建时排除上一轮克隆份，份数不得滚雪球
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    expect(cloneCopies(el).length, '重建幂等（克隆份不计入源内容）').toBe(1)
    // 包裹节点盒模型走 ::slotted（与 .copy 同形：flex: none + nowrap，纵向另有分支）
    const css = styleText(el)
    const slotRule = css.split('}').find((rule) => rule.includes('::slotted([data-oas-marquee-copy])'))
    expect(slotRule, '存在 ::slotted 包裹节点盒模型规则').toBeDefined()
    expect(slotRule).toContain('flex: none')
    expect(slotRule).toContain('white-space: nowrap')
    expect(css).toContain(":host([orientation='vertical']) ::slotted([data-oas-marquee-copy])")
  })

  it('份与份结构一致：源组 1 份、克隆组 repeat 份，每份各自成块（份宽的充要结构）', () => {
    // 缺陷形态（旧实现）：repeat 份内容平铺在克隆组里 → 相邻两份文本连成同一行，
    // 份间空白折叠成 1 个空格被保留，而源组末尾空白是行尾空白被移除 →
    // 克隆份宽 = 源组宽 + 1 空格宽 ⇒ 份宽 ≠ 动画位移距离 ⇒ 每轮 wrap 内容横跳（接缝顿挫）
    const el = mount({}, 'OAS-UI')
    const srcGroup = el.shadowRoot!.querySelector('.group:not(.clone)')!
    const srcCopies = srcGroup.querySelectorAll('.copy')
    expect(srcCopies.length, '源组恰好 1 份 .copy').toBe(1)
    expect(srcCopies[0]!.querySelector('slot'), '源份内是 slot').not.toBeNull()
    const clnCopies = cloneCopies(el)
    expect(clnCopies.length, '克隆组默认 1 份').toBe(1)
    for (const c of clnCopies) expect(c.textContent).toBe('OAS-UI')
  })

  it('源份与克隆份的容器规则一致（多份时每份都是独立块）', () => {
    const css = styleText(mount())
    const base = css.match(/\.copy\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(base, '.copy 基础规则存在').not.toBe('')
    expect(base).toContain('display: flex')
    expect(base).toContain('flex: none')
    expect(css).toContain(":host([orientation='vertical']) .copy")
  })

  it('auto-fill 多份：克隆组生成 repeat 个独立 .copy 份', () => {
    const { fire } = installRo()
    const el = mount({}, '短内容')
    mockRects(el, 300, 100)
    fire()
    const copies = cloneCopies(el)
    expect(copies.length, '容器 300 / 内容 100 → 3 份').toBe(3)
    for (const c of copies) expect(c.textContent).toBe('短内容')
  })

  it('slotchange 后克隆组与内容保持一致', () => {
    const el = mount()
    const span = document.createElement('span')
    span.textContent = '新增条目'
    el.appendChild(span)
    const slot = el.shadowRoot!.querySelector('slot')!
    slot.dispatchEvent(new Event('slotchange'))
    expect(cloneText(el)).toContain('新增条目')
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
    const trackRule = css
      .split('}')
      .find((rule) => rule.includes('.track {') || rule.includes('.track\n') || rule.includes('.track\r'))
    expect(trackRule).toBeDefined()
    expect(trackRule).not.toContain('mask-image')
  })

  it('observedAttributes 覆盖全部新属性', () => {
    expect(OASMarquee.observedAttributes).toEqual(
      expect.arrayContaining(['speed', 'pause-on-hover', 'fade-edges', 'orientation', 'reverse']),
    )
  })

  it('测量后：克隆组按份数填充、时长变量写入、measuring 态解除', () => {
    const { fire } = installRo()
    const el = mount({}, '短内容')
    mockRects(el, 300, 100)
    expect(track(el).classList.contains('measuring')).toBe(true)
    fire()
    // 容器 300 / 内容 100 → 3 份克隆
    expect(cloneText(el)).toBe('短内容'.repeat(3))
    expect(track(el).style.getPropertyValue('--oas-marquee-shift')).toBe('100px')
    // 时长 = 100px / 48px/s
    expect(track(el).style.getPropertyValue('--oas-marquee-duration')).toBe(`${100 / 48}s`)
    expect(track(el).classList.contains('measuring')).toBe(false)
  })

  /** 注入 FakeResizeObserver——必须在 mount() 前调用（bind 时决定是否建立观察） */
  function installRo(): { fire: () => void } {
    let cb: (() => void) | null = null
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      constructor(callback: () => void) {
        cb = callback
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    return { fire: () => cb?.() }
  }

  /**
   * happy-dom 布局全 0：注入「容器可见区 + 内容宽」尺寸，配合 installRo().fire() 触发 remeasure。
   *
   * 容器口径 = 宿主 padding box（`clientWidth`/`clientHeight`，即 overflow 裁切区）：
   * border/padding 不参与份数判定。`borderBoxW` 一并 mock 成含边框的更大值作为对照——
   * 若实现回退到 border box 口径，`repeat` 会多一份，断言必挂（防「mock 变成空断言」）。
   */
  function mockRects(el: OASMarquee, containerW = 300, contentW = 100, borderBoxW = containerW): void {
    Object.defineProperty(el, 'clientWidth', { value: containerW, configurable: true })
    Object.defineProperty(el, 'clientHeight', { value: 40, configurable: true })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      width: borderBoxW,
      height: 40,
      top: 0,
      left: 0,
      right: borderBoxW,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    const sourceGroup = el.shadowRoot!.querySelector<HTMLElement>('.group:not(.clone)')!
    vi.spyOn(sourceGroup, 'getBoundingClientRect').mockReturnValue({
      width: contentW,
      height: 40,
      top: 0,
      left: 0,
      right: contentW,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
  }

  /**
   * 注入动画替身并把时钟推进到 currentTime。真机上动画对象是**长期存活**的（读它的 currentTime
   * 不需要样式落定，见 captureShift 的缓存通道），故同一元素上重复调用会复用同一个替身对象、
   * 只改 currentTime——用「每次调用返回新对象」的替身会掩盖缓存通道与 getAnimations 通道的差异。
   */
  function mockAnimTime(el: OASMarquee, currentTime: number): void {
    const t = track(el) as unknown as {
      getAnimations?: () => Array<{ currentTime: number | null }>
      __mockAnim?: { currentTime: number | null }
    }
    const anim = t.__mockAnim ?? { currentTime }
    anim.currentTime = currentTime
    t.__mockAnim = anim
    t.getAnimations = () => [anim]
  }

  it('容器口径取宿主 padding box（clientWidth/Height）：border 不得把份数抬高', () => {
    const { fire } = installRo()
    const el = mount({}, '短内容')
    // 宿主 border box 598+2（1px 边框），可见/裁切区（padding box）598；内容恰为 598
    mockRects(el, 598, 598, 600)
    fire()
    expect(copyCount(el), '内容恰等于可见宽 → 1 份（取 border box 会误判为 2 份）').toBe(1)
    expect(track(el).style.getPropertyValue('--oas-marquee-shift')).toBe('598px')
  })

  it('内容更新相位保持：按位移连续反解负 animation-delay（非简单 -currentTime）', () => {
    const { fire } = installRo()
    const el = mount()
    mockRects(el)
    fire()
    // shift=100px, speed=48 → duration = 100/48 s ≈ 2083.33ms
    const durMs = (100 / 48) * 1000
    mockAnimTime(el, 2500)
    const span = document.createElement('span')
    span.textContent = '动态追加'
    el.appendChild(span)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    const delay = parseFloat(track(el).style.animationDelay)
    expect(Number.isFinite(delay), '应写入负 animation-delay').toBe(true)
    expect(delay).toBeLessThanOrEqual(0)
    expect(delay, 'delay ∈ [-duration, 0)').toBeGreaterThanOrEqual(-durMs)
    // 连续性不变量：恢复后相位 = 捕获时相位（timing 未变）——capture: (2500-0) mod dur
    const phaseBefore = 2500 % durMs
    const phaseAfter = (((2500 - delay) % durMs) + durMs) % durMs
    expect(phaseAfter, '重建克隆前后动画相位相等（位移连续，不跳变）').toBeCloseTo(phaseBefore, 0)
    expect(cloneText(el)).toContain('动态追加')
  })

  it('reverse 运行时切换：按位移连续反解 delay（用新方向解读旧进度会整段跳变）', () => {
    const { fire } = installRo()
    const el = mount()
    mockRects(el)
    fire()
    const durMs = (100 / 48) * 1000
    mockAnimTime(el, 800)
    // 切换前：正向，位移比例 = 进度 = 800/durMs
    const ratioBefore = 800 / durMs
    el.setAttribute('reverse', '')
    const delay = parseFloat(track(el).style.animationDelay)
    expect(Number.isFinite(delay), '反向切换后应写入补偿 delay').toBe(true)
    expect(delay).toBeLessThanOrEqual(0)
    // 切换后：反向动画的位移比例 = 1 - 进度，必须等于切换前的位移比例（同一时刻视觉位置不变）
    const progress2 = ((((800 - delay) % durMs) + durMs) % durMs) / durMs
    const ratioAfterReverse = 1 - progress2
    expect(
      ratioAfterReverse,
      `反向切换前后位移比例相等（before=${ratioBefore.toFixed(4)}, after=${ratioAfterReverse.toFixed(4)}）`,
    ).toBeCloseTo(ratioBefore, 3)
  })

  it('reverse 关闭再开启同样保持位移连续（双向切换）', () => {
    const { fire } = installRo()
    const el = mount({ reverse: '' })
    mockRects(el)
    fire()
    const durMs = (100 / 48) * 1000
    mockAnimTime(el, 1200)
    // 反向运行中：位移比例 = 1 - 进度
    const ratioBefore = 1 - 1200 / durMs
    el.removeAttribute('reverse')
    const delay = parseFloat(track(el).style.animationDelay)
    const progress2 = ((((1200 - delay) % durMs) + durMs) % durMs) / durMs
    expect(progress2, '关反向前后位移比例相等').toBeCloseTo(ratioBefore, 3)
  })

  it('orientation 运行时切换：同步按新轴重测 + 重启补偿（相位不归零，内容不跳回循环起点）', () => {
    const { fire } = installRo()
    const el = mount()
    mockRects(el) // 容器 300×40、源组 100×40
    const durOld = (100 / 48) * 1000
    // 真机行为建模：动画对象长期存活；宿主属性一变（切轴）样式落定即取消旧动画，
    // 之后 getAnimations() 只会返回**新**动画（currentTime 归零）。故相位只能从缓存对象读。
    const oldAnim = { currentTime: durOld * 0.3 }
    const newAnim = { currentTime: 0 }
    let switched = false
    ;(track(el) as unknown as { getAnimations: () => Array<{ currentTime: number | null }> }).getAnimations = () =>
      switched ? [newAnim] : [oldAnim]
    fire() // 首次测量：无 timing 可补偿，但会缓存当时的动画对象
    expect(track(el).style.animationDelay, '首次测量无相位可补偿').toBe('')
    switched = true
    el.setAttribute('orientation', 'vertical')
    // 切轴必须**同步**按新轴重测（否则纵向动画会拿横向位移距离跑，要等 RO 回调才修）
    expect(track(el).style.getPropertyValue('--oas-marquee-shift'), '切轴后同步按内容高重写位移距离').toBe('40px')
    // 物理事实：横向/纵向关键字帧不同名 → 切轴必然换 animation-name = 新动画（时钟归零），
    // 无法做到「动画不重启」；且新旧位移量纲不同（内容宽 100 vs 内容高 40）→ 绝对位移不可守恒。
    // 可守恒的最强不变量是相位（位移比例），故补偿基准取「新动画 localTime = 0」。
    const durNew = (40 / 48) * 1000
    const delay = parseFloat(track(el).style.animationDelay)
    expect(Number.isFinite(delay), '切轴后应写入重启补偿 delay（读不到切换前相位时不会写）').toBe(true)
    expect(delay, 'delay ∈ [-duration, 0]').toBeLessThanOrEqual(0)
    expect(delay).toBeGreaterThanOrEqual(-durNew)
    const phaseAfter = ((((0 - delay) % durNew) + durNew) % durNew) / durNew
    expect(phaseAfter, `切轴前后相位相等（before=0.3, after=${phaseAfter.toFixed(4)}；归零 = 跳回起点）`).toBeCloseTo(
      0.3,
      2,
    )
  })

  it('orientation 切轴用缓存动画对象读切换前相位（读 getAnimations 会拿到已归零的新动画）', () => {
    const { fire } = installRo()
    const el = mount()
    mockRects(el)
    const durOld = (100 / 48) * 1000
    const oldAnim = { currentTime: durOld * 0.5 }
    const newAnim = { currentTime: 0 }
    let switched = false
    ;(track(el) as unknown as { getAnimations: () => Array<{ currentTime: number | null }> }).getAnimations = () =>
      switched ? [newAnim] : [oldAnim]
    fire()
    switched = true
    el.setAttribute('orientation', 'vertical')
    // 缺陷形态：captureShift 直接调 getAnimations() → 拿到的已是新动画 t=0 → 相位丢成 0（内容跳回起点）
    const durNew = (40 / 48) * 1000
    const delay = parseFloat(track(el).style.animationDelay)
    const phaseAfter = ((((0 - delay) % durNew) + durNew) % durNew) / durNew
    expect(phaseAfter, `缓存通道必须保住切换前相位 0.5（实际 ${phaseAfter.toFixed(4)}）`).toBeCloseTo(0.5, 2)
  })

  it('orientation 切轴后缓存作废：下一次捕获走 getAnimations 取新动画对象（不残留失效对象）', () => {
    const { fire } = installRo()
    const el = mount()
    mockRects(el)
    const durOld = (100 / 48) * 1000
    const oldAnim: { currentTime: number | null } = { currentTime: durOld * 0.3 }
    const newAnim: { currentTime: number | null } = { currentTime: 0 }
    let switched = false
    const t = track(el) as unknown as { getAnimations: () => Array<{ currentTime: number | null }> }
    t.getAnimations = () => (switched ? [newAnim] : [oldAnim])
    fire()
    switched = true
    el.setAttribute('orientation', 'vertical')
    // 重启后新动画跑起来（新对象时钟推进）；旧对象此时在真机上已取消（currentTime = null）
    oldAnim.currentTime = null
    newAnim.currentTime = 120
    const durNew = (40 / 48) * 1000
    const delay1 = parseFloat(track(el).style.animationDelay)
    el.setAttribute('speed', '96') // 再触发一次捕获：必须取新动画对象（120ms）而非失效的旧对象
    const durNew2 = (40 / 96) * 1000
    const delay2 = parseFloat(track(el).style.animationDelay)
    expect(Number.isFinite(delay2), '缓存作废后仍能读到新动画相位').toBe(true)
    const phaseBefore = ((((120 - delay1) % durNew) + durNew) % durNew) / durNew
    const phaseAfter = ((((120 - delay2) % durNew2) + durNew2) % durNew2) / durNew2
    expect(phaseAfter, `变速前后相位相等（before=${phaseBefore.toFixed(4)}）`).toBeCloseTo(phaseBefore, 3)
  })

  it('orientation 首帧不当作「切轴」处理（连接即 vertical 不触发重启补偿路径）', () => {
    const { fire } = installRo()
    const el = mount({ orientation: 'vertical' })
    mockRects(el)
    fire()
    // 首帧无旧动画可捕获 → 归零重启（delay 清空），不得写入任何补偿
    expect(track(el).style.animationDelay).toBe('')
    expect(track(el).style.getPropertyValue('--oas-marquee-shift')).toBe('40px')
  })

  it('时长变化相位连续：speed 属性变更后等位移反解 delay（不整段重映射进度）', () => {
    const { fire } = installRo()
    const el = mount()
    mockRects(el)
    fire()
    const durMs1 = (100 / 48) * 1000
    mockAnimTime(el, 2500)
    const delay1 = 0 // 尚未有任何恢复，生效 delay 为 0
    const distBefore = ((((2500 - delay1) % durMs1) + durMs1) % durMs1) / durMs1 // 进度（位移比例）
    el.setAttribute('speed', '96') // 时长变 100/96 s，位移比例不得跳变
    const durMs2 = (100 / 96) * 1000
    const delay2 = parseFloat(track(el).style.animationDelay)
    expect(Number.isFinite(delay2), '时长变化后应写入补偿 delay').toBe(true)
    const distAfter = ((((2500 - delay2) % durMs2) + durMs2) % durMs2) / durMs2
    expect(distAfter, '时长变更前后位移比例相等（视觉位置不跳）').toBeCloseTo(distBefore, 3)
  })

  it('相位保持退化：无可用动画相位（无 getAnimations 或无动画）时归零重启（不设负 delay）', () => {
    const el = mount()
    const t = track(el)
    // 能力探测覆盖两条路径：旧版 happy-dom 没有 getAnimations；happy-dom ≥20.14.5 提供该方法
    // 但默认无动画（返回空数组）。两者对组件等价于「无可用相位」→ 同样走退化归零重启。
    // （「有相位」路径由上方 mockAnimTime 用例覆盖：断言写入连续补偿的负 animation-delay。）
    const getAnimations = (t as unknown as { getAnimations?: () => unknown[] }).getAnimations
    const noUsableTiming = getAnimations === undefined || getAnimations.call(t).length === 0
    expect(noUsableTiming, '当前环境应无可用动画相位（无方法或无动画）').toBe(true)
    const span = document.createElement('span')
    span.textContent = '动态追加'
    el.appendChild(span)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    expect(t.style.animationDelay).toBe('')
    expect(cloneText(el)).toContain('动态追加')
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
