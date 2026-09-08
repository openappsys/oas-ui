import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-lg);
}
:host([hidden]) {
  display: none;
}
.viewport {
  overflow: hidden;
  /* 水平模式放行纵向页面滚动，拖拽手势只接管横向 */
  touch-action: pan-y;
}
:host([direction='vertical']) .viewport {
  touch-action: pan-x;
}
.track {
  display: flex;
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
/* 拖拽跟手期间关闭过渡（松手后移除类，回弹/切屏恢复过渡） */
.track.no-transition {
  transition: none;
}
::slotted(*) {
  flex: 0 0 100%;
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
:host([direction='vertical']) .track {
  flex-direction: column;
  /* 垂直模式视口需定高（默认 200px，与 min-height 约定对齐），可用 --oas-carousel-height 覆盖 */
  height: 100%;
}
:host([direction='vertical']) .viewport {
  height: var(--oas-carousel-height, 200px);
}
:host([direction='vertical']) ::slotted(*) {
  flex: 0 0 100%;
  height: 100%;
  min-height: 0;
}
/* 淡出淡入：全部轮播项叠在同一网格单元（in-flow 堆叠，容器高度取最高屏） */
:host([effect='fade']) .track {
  display: grid;
}
:host([effect='fade']) ::slotted(*) {
  grid-area: 1 / 1;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out);
}
.dots {
  position: absolute;
  bottom: var(--oas-space-3);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: var(--oas-space-2);
  z-index: 2;
}
.dots[hidden] {
  display: none;
}
/* 指示器外挂（不占轮播盒内空间，撑高宿主） */
.dots.outside {
  position: static;
  margin-top: var(--oas-space-3);
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: var(--oas-carousel-dot-bg, rgba(255, 255, 255, 0.5));
  cursor: pointer;
  padding: 0;
  transition:
    width var(--oas-transition-base) var(--oas-ease-out),
    height var(--oas-transition-base) var(--oas-ease-out),
    background var(--oas-transition-base) var(--oas-ease-out);
}
.dot:hover {
  background: var(--oas-carousel-dot-active-bg, #ffffff);
}
.dot:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.dot[aria-current='true'] {
  background: var(--oas-carousel-dot-active-bg, #ffffff);
}
/* 线性指示器 */
.dots.line .dot {
  width: 20px;
  height: 4px;
  border-radius: var(--oas-radius-sm);
}
.dots.line .dot[aria-current='true'] {
  width: 28px;
}
/* 垂直模式：inside 指示器默认靠右（行业惯例），外挂则居右侧流内 */
:host([direction='vertical']) .dots {
  left: auto;
  right: var(--oas-space-3);
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  flex-direction: column;
}
:host([direction='vertical']) .dots.outside {
  position: static;
  transform: none;
  margin-top: 0;
  margin-inline-start: var(--oas-space-3);
}
:host([direction='vertical']) .dots.line .dot {
  width: 4px;
  height: 20px;
}
:host([direction='vertical']) .dots.line .dot[aria-current='true'] {
  width: 4px;
  height: 28px;
}
/* 垂直外挂：宿主改为横向排列（轮播区 + 右侧指示器） */
:host([direction='vertical']:has(.dots.outside)) {
  display: flex;
  align-items: center;
}
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: 50%;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg);
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
  /* 默认（悬停形态）：箭头隐藏，悬停/聚焦容器时淡入 */
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    color var(--oas-transition-base) var(--oas-ease-out),
    border-color var(--oas-transition-base) var(--oas-ease-out),
    background var(--oas-transition-base) var(--oas-ease-out);
}
:host(:hover) .arrow,
:host(:focus-within) .arrow {
  opacity: 1;
  pointer-events: auto;
}
:host([arrows='always']) .arrow {
  opacity: 1;
  pointer-events: auto;
}
/* hidden 属性需要显式覆盖 display（避免 class 的 display 优先级压过 UA 的 [hidden] 规则） */
.arrow[hidden] {
  display: none;
}
.arrow[disabled] {
  opacity: 0.45;
  pointer-events: none;
  cursor: not-allowed;
}
.arrow:hover {
  opacity: 1;
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.arrow:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.arrow-prev { left: var(--oas-space-3); }
.arrow-next { right: var(--oas-space-3); }
/* 垂直模式箭头：旋转 90°（‹ 朝上、› 朝下），改到顶部/底部居中 */
:host([direction='vertical']) .arrow {
  left: 50%;
  right: auto;
  transform: translateX(-50%) rotate(90deg);
}
:host([direction='vertical']) .arrow-prev {
  top: var(--oas-space-3);
}
:host([direction='vertical']) .arrow-next {
  top: auto;
  bottom: var(--oas-space-3);
}
`

export class OASCarousel extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'index',
      'autoplay',
      'interval',
      'arrows',
      'indicators',
      'indicator-position',
      'indicator-type',
      'effect',
      'direction',
      'loop',
      'pause-on-hover',
      'slides-per-view',
      'gap',
    ]
  }

  private count = 0
  private timer: ReturnType<typeof setInterval> | null = null
  /** 悬停/聚焦/页面不可见/拖拽 四种暂停源（WCAG 2.2.2：自动播放必须可暂停） */
  private hoverPaused = false
  private focusPaused = false
  private hiddenPaused = false
  private dragPaused = false
  /** 拖拽进行中的手势状态（null=未拖拽） */
  private drag: { startX: number; startY: number; delta: number } | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="viewport" part="viewport">
        <div class="track" part="track"><slot></slot></div>
      </div>
      <button type="button" class="arrow arrow-prev" part="arrow-prev" aria-label="">‹</button>
      <button type="button" class="arrow arrow-next" part="arrow-next" aria-label="">›</button>
      <div class="dots" part="dots" role="tablist"></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('.dots')?.addEventListener('click', (e) => {
      const dot = (e.target as HTMLElement).closest('[part="dot"]')
      if (dot) this.goTo(Number((dot as HTMLElement).getAttribute('data-index')) || 0)
    })
    // 指示器键盘导航（WAI-ARIA carousel pattern：方向键 + Home/End）
    this.shadow.querySelector('.dots')?.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key
      const pages = this.pageCount()
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        e.preventDefault()
        this.goTo(this.current() + 1)
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault()
        this.goTo(this.current() - 1)
      } else if (key === 'Home') {
        e.preventDefault()
        this.goTo(0)
      } else if (key === 'End') {
        e.preventDefault()
        this.goTo(pages - 1)
      }
    })
    this.shadow.querySelector('[part="arrow-prev"]')?.addEventListener('click', () => {
      this.prev()
    })
    this.shadow.querySelector('[part="arrow-next"]')?.addEventListener('click', () => {
      this.next()
    })
    // 动态增删轮播项：slotchange 重数数量、重建指示器、收敛 index
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => {
      this.update()
    })
    // 悬停/聚焦暂停自动播放（默认开，pause-on-hover=false 可关）
    this.addEventListener('pointerenter', () => {
      this.hoverPaused = true
    })
    this.addEventListener('pointerleave', () => {
      this.hoverPaused = false
      this.schedule()
    })
    this.addEventListener('focusin', () => {
      this.focusPaused = true
    })
    this.addEventListener('focusout', () => {
      this.focusPaused = false
      this.schedule()
    })
    // 页面不可见停播，可见后恢复
    const onVisibility = () => {
      this.hiddenPaused = document.hidden
      this.schedule()
    }
    document.addEventListener('visibilitychange', onVisibility)
    this.bindDrag()
    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
      document.removeEventListener('visibilitychange', onVisibility)
    })
  }

  /** pointer 拖拽跟手（触摸/鼠标统一）：按下暂停过渡，move 跟手，up 按阈值切屏或回弹 */
  private bindDrag(): void {
    const viewport = this.shadow.querySelector<HTMLElement>('[part="viewport"]')
    if (!viewport) return
    viewport.addEventListener('pointerdown', (e) => {
      const ev = e as PointerEvent
      if (this.drag || ev.button !== 0 || this.count === 0) return
      this.drag = { startX: ev.clientX, startY: ev.clientY, delta: 0 }
      this.dragPaused = true
      trackOf(this)?.classList.add('no-transition')
      try {
        viewport.setPointerCapture(ev.pointerId)
      } catch {
        /* 环境不支持指针捕获时忽略（事件仍挂在 viewport 上） */
      }
    })
    viewport.addEventListener('pointermove', (e) => {
      if (!this.drag) return
      const ev = e as PointerEvent
      const vertical = this.getAttr('direction', 'horizontal') === 'vertical'
      this.drag.delta = vertical ? ev.clientY - this.drag.startY : ev.clientX - this.drag.startX
      trackOf(this)?.style.setProperty('transform', this.trackTransform(this.drag.delta))
    })
    const finish = (e: Event) => {
      if (!this.drag) return
      const ev = e as PointerEvent
      const vertical = this.getAttr('direction', 'horizontal') === 'vertical'
      const delta = vertical
        ? this.drag.delta
        : ev.clientX - this.drag.startX || this.drag.delta
      this.drag = null
      this.dragPaused = false
      const t = trackOf(this)
      t?.classList.remove('no-transition')
      if (Math.abs(delta) > 50) this.goTo(this.current() + (delta < 0 ? 1 : -1))
      // 回弹/边界归位：统一重算 transform（未达阈值或循环关闭触界时恢复原位）
      this.update()
      // 拖拽后重置自动播放计时
      this.schedule()
    }
    viewport.addEventListener('pointerup', finish)
    viewport.addEventListener('pointercancel', finish)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（视口/轨道存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.viewport') || !this.shadow.querySelector('.track'))
      return false
    this.bind()
    return true
  }

  /** 当前屏（页）索引 */
  private current(): number {
    return Number(this.getAttr('index', '0')) || 0
  }

  /** 每屏轮播项数（fade 模式为全屏叠层语义，恒为 1） */
  private perView(): number {
    if (this.getAttr('effect', 'slide') === 'fade') return 1
    const n = Math.floor(Number(this.getAttr('slides-per-view', '1')))
    return Number.isFinite(n) && n > 0 ? n : 1
  }

  /** 页数 = 按屏步进的组数（指示器个数） */
  private pageCount(): number {
    if (this.count === 0) return 0
    return Math.max(1, Math.ceil(this.count / this.perView()))
  }

  private gapPx(): number {
    const n = Number(this.getAttr('gap', '0'))
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  /**
   * 轨道位移：水平 translateX / 垂直 translateY。
   * 每页步进 perView 个 slide 宽（含 gap）；非整除时末页对齐轨道末尾不溢出。
   * deltaPx 为拖拽跟手偏移（px），非拖拽时为 0。
   */
  private trackTransform(deltaPx = 0): string {
    const axis = this.getAttr('direction', 'horizontal') === 'vertical' ? 'Y' : 'X'
    const per = this.perView()
    const offsetSlides = Math.min(this.current() * per, Math.max(0, this.count - per))
    // 常规形态（每屏 1 项、无间距）输出最简形式，SSR 快照体积与旧版一致
    if (per === 1 && this.gapPx() === 0) {
      const base = `-${offsetSlides * 100}%`
      return deltaPx
        ? `translate${axis}(calc(${base} + ${deltaPx}px))`
        : `translate${axis}(${base})`
    }
    const gap = `${this.gapPx()}px`
    const slideW = `((100% - ${per - 1} * ${gap}) / ${per})`
    return `translate${axis}(calc(-1 * ${offsetSlides} * ((${slideW}) + ${gap}) + ${deltaPx}px))`
  }

  protected override update(): void {
    this.count = this.children.length
    const pages = this.pageCount()
    // index 恒反射：缺省归 0 并收敛到有效页范围（children 减少或外部越界设置时）
    if (pages > 0) {
      const raw = this.getAttribute('index')
      const clamped = Math.min(pages - 1, Math.max(0, this.current()))
      if (String(clamped) !== raw) this.setAttribute('index', String(clamped))
    }
    const index = this.current()

    const track = trackOf(this)
    if (track) track.style.transform = this.trackTransform()

    // fade 叠层：激活屏 opacity 1，其余 0（grid 堆叠，in-flow）；slide 模式清理内联态
    const fade = this.getAttr('effect', 'slide') === 'fade'
    Array.from(this.children).forEach((child, i) => {
      const h = child as HTMLElement
      if (fade) {
        h.style.opacity = i === index ? '1' : '0'
        h.style.pointerEvents = i === index ? '' : 'none'
      } else if (h.style.opacity !== '') {
        h.style.opacity = ''
        h.style.pointerEvents = ''
      }
    })

    // 箭头显示形态：always（始终显示）/ hover（悬停显示，默认）/ never（不显示）
    const arrows = this.getAttr('arrows', 'hover')
    this.shadow.querySelector('[part="arrow-prev"]')?.toggleAttribute('hidden', arrows === 'never')
    this.shadow.querySelector('[part="arrow-next"]')?.toggleAttribute('hidden', arrows === 'never')
    // 非循环模式下边界箭头禁用
    const loop = this.getAttr('loop', '') !== 'false'
    this.shadow
      .querySelector('[part="arrow-prev"]')
      ?.toggleAttribute('disabled', !loop && index === 0)
    this.shadow
      .querySelector('[part="arrow-next"]')
      ?.toggleAttribute('disabled', !loop && index === pages - 1)
    // 箭头/指示器内置文案走 locale registry（setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="arrow-prev"]')
      ?.setAttribute('aria-label', this.t('carousel.prev'))
    this.shadow
      .querySelector<HTMLElement>('[part="arrow-next"]')
      ?.setAttribute('aria-label', this.t('carousel.next'))

    // 视口 aria-live 策略：自动播放时 off（读屏不逐屏播报），否则 polite
    this.shadow
      .querySelector('[part="viewport"]')
      ?.setAttribute('aria-live', this.hasAttr('autoplay') ? 'off' : 'polite')

    // 指示器：indicators=false 隐藏；position=outside 流内占位；type=line 线性形态
    const dots = this.shadow.querySelector<HTMLElement>('[part="dots"]')
    if (!dots) return
    const showDots = this.getAttr('indicators', 'true') !== 'false'
    dots.toggleAttribute('hidden', !showDots)
    dots.classList.toggle('outside', this.getAttr('indicator-position', 'inside') === 'outside')
    dots.classList.toggle('line', this.getAttr('indicator-type', 'dot') === 'line')
    dots.innerHTML = ''
    if (!showDots) return
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement('button')
      dot.className = 'dot'
      dot.setAttribute('part', 'dot')
      dot.setAttribute('role', 'tab')
      dot.setAttribute('aria-current', String(i === index))
      dot.setAttribute('aria-label', this.t('carousel.dot', { index: i + 1 }))
      dot.setAttribute('data-index', String(i))
      dots.appendChild(dot)
    }
    this.schedule()
  }

  /** 切换到目标页（循环取模 / 非循环收敛），同页 no-op；切换派发 oas-change（含 prevIndex） */
  private goto(index: number): void {
    const pages = this.pageCount()
    if (pages === 0) return
    const current = this.current()
    let next: number
    if (this.getAttr('loop', '') !== 'false') {
      next = ((index % pages) + pages) % pages
    } else {
      next = Math.min(pages - 1, Math.max(0, index))
    }
    if (next === current) return
    this.setAttribute('index', String(next))
    this.emit('change', { index: next, prevIndex: current })
    // attributeChangedCallback 已同步 update()，此处无需重复调用
  }

  /** 切换到下一屏 */
  next(): void {
    this.goTo(this.current() + 1)
  }

  /** 切换到上一屏 */
  prev(): void {
    this.goTo(this.current() - 1)
  }

  /** 跳转到指定屏（页索引，从 0 起） */
  goTo(index: number): void {
    this.goto(index)
  }

  /** 自动播放是否处于暂停（悬停/聚焦/不可见/拖拽任一命中即暂停） */
  private isPaused(): boolean {
    if (this.dragPaused || this.hiddenPaused) return true
    if (!this.hasAttr('autoplay')) return false
    if (this.getAttr('pause-on-hover', 'true') === 'false') return false
    return this.hoverPaused || this.focusPaused
  }

  private schedule(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (!this.hasAttr('autoplay')) return
    this.timer = setInterval(
      () => {
        if (!this.isPaused()) this.goTo(this.current() + 1)
      },
      Number(this.getAttr('interval', '3000')) || 3000,
    )
  }
}

function trackOf(el: OASCarousel): HTMLElement | null {
  return el.shadowRoot?.querySelector<HTMLElement>('[part="track"]') ?? null
}
