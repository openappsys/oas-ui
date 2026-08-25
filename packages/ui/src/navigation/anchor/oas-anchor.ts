import { OASElement } from '@oas-ui/core'

export interface AnchorItem {
  href: string
  title: string
  /** 多级锚点：子项层级缩进展示，与父项同样参与滚动高亮 */
  children?: AnchorItem[]
  /** 锚点项 target（如 `_blank`）：设置后不拦截默认行为，交由浏览器打开 */
  target?: string
  /** 项级点击落点偏移覆盖（px），优先于全局 target-offset */
  targetOffset?: number
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
nav {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
/* 横向模式 */
nav.horizontal {
  flex-direction: row;
  flex-wrap: wrap;
}
/* 锚点栏自身内部滚动（internal-scrollable） */
nav.internal-scrollable {
  max-height: 100%;
  overflow-y: auto;
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  min-width: 0;
}
nav.horizontal .list {
  flex-direction: row;
  flex-wrap: wrap;
}
.anchor-item {
  display: block;
}
/* 横向模式下子级与父级同排继续 */
nav.horizontal .anchor-item,
nav.horizontal .anchor-children {
  display: inline-flex;
}
.anchor-children {
  margin: var(--oas-space-1) 0 0 var(--oas-space-3);
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
nav.horizontal .anchor-children {
  margin: 0;
  flex-direction: row;
}
[part='link'] {
  display: block;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  text-decoration: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  transition: color var(--oas-transition-fast, 0.15s) ease, background var(--oas-transition-fast, 0.15s) ease;
  outline: none;
}
[part='link']:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
[part='link']:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: 2px;
}
[part='link'][aria-current='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
/* 轨道（rail）：default 变体左侧竖线 / 横向模式顶部横线 */
nav::before {
  content: '';
  position: absolute;
  top: var(--oas-space-1);
  bottom: var(--oas-space-1);
  left: 0;
  width: 2px;
  border-radius: 1px;
  background: var(--oas-color-border);
  pointer-events: none;
}
nav.horizontal::before {
  top: 0;
  left: var(--oas-space-1);
  right: var(--oas-space-1);
  bottom: auto;
  width: auto;
  height: 2px;
}
/* 移动墨水条：default 竖条 / underline 底部下划线（JS 定位） */
.ink {
  position: absolute;
  left: 0;
  top: 0;
  width: 2px;
  height: 0;
  border-radius: 1px;
  background: var(--oas-color-primary);
  pointer-events: none;
  transition: top var(--oas-transition-fast, 0.15s) ease, height var(--oas-transition-fast, 0.15s) ease,
    left var(--oas-transition-fast, 0.15s) ease, width var(--oas-transition-fast, 0.15s) ease;
}
/* underline / lineless / block：隐藏轨道 */
nav.variant-underline::before,
nav.variant-lineless::before,
nav.variant-block::before {
  display: none;
}
/* lineless / block：隐藏墨水条 */
nav.variant-lineless .ink,
nav.variant-block .ink {
  display: none;
}
/* lineless：仅颜色/背景区分当前项 */
nav.variant-lineless [part='link'][aria-current='true'] {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary);
}
/* block：当前项块状背景 */
nav.variant-block [part='link'][aria-current='true'] {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary);
}
/* size 档位 */
nav.size-small [part='link'] {
  font-size: var(--oas-font-size-xs);
  padding: calc(var(--oas-space-1) / 2) var(--oas-space-2);
}
nav.size-large [part='link'] {
  font-size: var(--oas-font-size-md);
  padding: var(--oas-space-2) var(--oas-space-3);
}
`

/** 滚动落点对齐方式 */
type ScrollBlock = 'start' | 'center' | 'end' | 'nearest'

export class OASAnchor extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'items',
      'active',
      'offset',
      'scroll-container',
      'target-offset',
      'direction',
      'affix',
      'affix-offset',
      'bounds',
      'block',
      'hash',
      'replace',
      'duration',
      'size',
      'variant',
      'internal-scrollable',
      'animation',
      'get-current-anchor',
    ]
  }

  private _items: AnchorItem[] = []

  /** 子元素通道观察器：light DOM 里 oas-anchor-item 增删或属性/文本变化 → 重渲染 */
  private childObserver: MutationObserver | null = null

  /** Vue/React 会把 items 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get items(): AnchorItem[] {
    return this._items
  }
  set items(value: AnchorItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 滚动容器元素引用（property 通道）；attribute 走 CSS 选择器/id 解析 */
  get scrollContainer(): HTMLElement | string | null {
    return this._containerEl ?? (this.getAttr('scroll-container', '') || null)
  }
  set scrollContainer(value: HTMLElement | string | null) {
    if (value instanceof HTMLElement) {
      this._containerEl = value
      this.update()
    } else if (typeof value === 'string') {
      this._containerEl = null
      this.setAttribute('scroll-container', value)
    } else {
      this._containerEl = null
      this.update()
    }
  }

  /** 自定义高亮策略：接收滚动算出的候选 href，返回实际应高亮 href（ getCurrentAnchor 语义） */
  public getCurrentAnchor: ((activeHref: string) => string) | null = null

  private _containerEl: HTMLElement | null = null
  private itemsFingerprint = ''
  private flatItems: AnchorItem[] = []
  private flatTargets: Array<{ href: string; el: Element }> = []
  private activeHref = ''
  private spyRoot: Window | HTMLElement | null = null
  private scrollRafId = 0
  /** 滚动/尺寸监听的计算 rAF 句柄（每帧最多计算一次） */
  private scrollComputeRafId = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <nav part="nav" class="nav">
        <div part="ink" class="ink" aria-hidden="true"></div>
        <ul part="list" class="list"></ul>
      </nav>
    `
  }

  /** 缓存节点引用 + 注册清理（render 与水合路径共用；滚动监听由 update 重建时绑定） */
  private bind(): void {
    this.onCleanup(() => this.detachSpy())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（nav 存在）后直接接管，跳过 shadow 重建；
   *  预置 items 指纹（含子元素通道的稳定序列化），使 update 跳过列表重建，保留快照中的链接节点（无闪动） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('nav')) return false
    this.itemsFingerprint = this.computeFingerprint()
    this.bind()
    return true
  }

  protected override update(): void {
    const nav = this.shadow.querySelector<HTMLElement>('.nav')
    if (!nav) return
    // 导航 aria-label locale 驱动（setLocale 切换自动重刷）
    nav.setAttribute('aria-label', this.t('anchor.nav'))
    // 子元素通道：items 属性未显式设置时监听 light DOM 子元素变化（重连后重建观察器）
    this.ensureChildObserver()
    // 双通道指纹：items 属性显式设置时取属性原串，否则用子元素解析结果的稳定序列化
    const fingerprint = this.computeFingerprint()
    if (fingerprint !== this.itemsFingerprint) {
      this.itemsFingerprint = fingerprint
      this.parseItems()
      this.rebuildList()
    } else if (this.flatItems.length === 0) {
      // 水合路径：列表节点来自 SSR 快照，不重建 DOM，仅恢复解析数据与点击绑定
      this.parseItems()
      this.bindExistingList()
    }
    this.syncModifiers(nav)
    this.applyActive()
    this.attachSpy()
    this.applyAffix()
  }

  /** 双通道指纹：items 属性显式设置时数据驱动优先；否则子元素通道稳定序列化（避免每次 update 重建） */
  private computeFingerprint(): string {
    return this.hasAttribute('items') ? this.getAttr('items', '[]') : this.childFingerprint()
  }

  private childFingerprint(): string {
    return JSON.stringify(this.parseChildItems())
  }

  private syncModifiers(nav: HTMLElement): void {
    const direction = this.getAttr('direction', 'vertical')
    const variant = this.getAttr('variant', 'default')
    const size = this.getAttr('size', 'medium')
    nav.classList.toggle('horizontal', direction === 'horizontal')
    nav.classList.toggle('variant-underline', variant === 'underline')
    nav.classList.toggle('variant-lineless', variant === 'lineless')
    nav.classList.toggle('variant-block', variant === 'block')
    nav.classList.toggle('size-small', size === 'small')
    nav.classList.toggle('size-large', size === 'large')
    nav.classList.toggle('internal-scrollable', this.hasAttr('internal-scrollable'))
  }

  /** 受控 active（attribute 为唯一事实源）：外部设置/清除立即生效 */
  private applyActive(): void {
    const active = this.getAttr('active', '')
    this.activeHref = active
    this.renderActive()
  }

  private attachSpy(): void {
    this.detachSpy()
    this.collectTargets()
    const { containerEl } = this.resolveContainer()
    const root: Window | HTMLElement = containerEl ?? window
    root.addEventListener('scroll', this.handleScroll, { passive: true })
    // 容器/视口宽度变化 → 高亮与墨水条可能过期（横向 ink 错位），resize 重算（rAF 节流）
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.spyRoot = root
  }

  private detachSpy(): void {
    if (this.spyRoot) {
      this.spyRoot.removeEventListener('scroll', this.handleScroll)
      this.spyRoot = null
    }
    window.removeEventListener('resize', this.handleResize)
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId)
      this.scrollRafId = 0
    }
    if (this.scrollComputeRafId) {
      cancelAnimationFrame(this.scrollComputeRafId)
      this.scrollComputeRafId = 0
    }
  }

  /** 滚动容器解析：property 元素引用 > scroll-container 选择器 > 视口 */
  private resolveContainer(): { containerEl: HTMLElement | null } {
    if (this._containerEl instanceof HTMLElement) return { containerEl: this._containerEl }
    const sel = this.getAttr('scroll-container', '').trim()
    if (!sel) return { containerEl: null }
    let el: HTMLElement | null = null
    try {
      el = document.querySelector(sel)
    } catch {
      el = null
    }
    if (!el) el = document.getElementById(sel.replace(/^#/, ''))
    return { containerEl: el as HTMLElement | null }
  }

  private collectTargets(): void {
    this.flatTargets = []
    for (const item of this.flatItems) {
      if (!item.href.startsWith('#')) continue
      const el = document.querySelector(item.href)
      if (el) this.flatTargets.push({ href: item.href, el })
    }
  }

  /** 滚动监听：rAF 节流——每帧最多计算一次（长文档高频滚动不重复同步计算） */
  private handleScroll = (): void => {
    // 目标可能晚于挂载出现（动态渲染），滚动时补采一次
    if (this.flatTargets.length === 0) this.collectTargets()
    if (this.flatTargets.length === 0) return
    this.scheduleCompute()
  }

  /** 窗口/容器尺寸变化：布局改变后高亮与墨水条可能过期，重算（rAF 节流） */
  private handleResize = (): void => {
    this.scheduleCompute(true)
  }

  /** 统一计算入口：rAF 合并同帧多次触发；forceInk 时当前项不变也重定位墨水条 */
  private scheduleCompute(forceInk = false): void {
    if (this.scrollComputeRafId) return
    this.scrollComputeRafId = requestAnimationFrame(() => {
      this.scrollComputeRafId = 0
      this.computeAndApply(forceInk)
    })
  }

  private computeAndApply(forceInk: boolean): void {
    const next = this.computeCurrent()
    if (next === this.activeHref) {
      if (forceInk) this.positionInk()
      return
    }
    const prev = this.activeHref
    this.activeHref = next
    this.renderActive()
    this.setAttribute('active', next)
    this.notifyChange(next, prev)
  }

  /** 当前高亮判定：最后一个顶越检测线（containerTop + offset + bounds）的章节；
   *  无目标过线时回退首项；get-current-anchor 可自定义策略 */
  private computeCurrent(): string {
    // 无目标（未挂载/目标缺失）时保持当前高亮，供 resize 等路径安全返回
    if (this.flatTargets.length === 0) return this.activeHref
    const offset = Number(this.getAttr('offset', '0')) || 0
    const bounds = Number(this.getAttr('bounds', '5')) || 0
    const { containerEl } = this.resolveContainer()
    const containerTop = containerEl ? containerEl.getBoundingClientRect().top : 0
    const line = containerTop + offset + bounds
    let current = ''
    for (const t of this.flatTargets) {
      if (t.el.getBoundingClientRect().top <= line) current = t.href
    }
    if (!current) current = this.flatTargets[0]!.href
    const custom = this.resolveGetCurrentAnchor()?.(current)
    if (typeof custom === 'string' && custom) current = custom
    return current
  }

  /** get-current-anchor 双通道：property 函数 > attribute 指定的全局函数名（HTML 场景） */
  private resolveGetCurrentAnchor(): ((activeHref: string) => string) | null {
    if (typeof this.getCurrentAnchor === 'function') return this.getCurrentAnchor
    const name = this.getAttr('get-current-anchor', '').trim()
    if (!name) return null
    const fn = (window as unknown as Record<string, unknown>)[name]
    return typeof fn === 'function' ? (fn as (activeHref: string) => string) : null
  }

  private handleLinkClick = (item: AnchorItem, e: MouseEvent): void => {
    // 用户点击事件独立派发（与滚动联动的 oas-change 分离），detail 带完整 item
    this.emit('click', { href: item.href, item })
    // item 级 target（如 _blank）：交给浏览器默认行为（新窗口等），不拦截、不滚动、不发 change
    if (item.target) return
    e.preventDefault()
    const prev = this.activeHref
    this.activeHref = item.href
    this.setAttribute('active', item.href)
    this.renderActive()
    this.notifyChange(item.href, prev)
    if (this.getAttr('hash', 'true') !== 'false') this.updateHash(item.href)
    this.scrollToTarget(item.href, item.targetOffset)
  }

  private notifyChange(href: string, prevHref: string): void {
    this.emit('change', { href, prevHref })
  }

  private updateHash(href: string): void {
    if (!href.startsWith('#')) return
    try {
      const url = new URL(window.location.href)
      url.hash = href.slice(1)
      if (this.hasAttr('replace')) window.history.replaceState(null, '', url.href)
      else window.history.pushState(null, '', url.href)
    } catch {
      // history/URL 不可用（如受限环境）时静默忽略
    }
  }

  /** 点击定位：目标内容顶 - 落点偏移（target-offset，item 级 targetOffset 优先，回退 offset） */
  private scrollToTarget(href: string, itemOffset?: number): void {
    if (!href.startsWith('#')) return
    const target = document.querySelector(href)
    if (!target) return
    const { containerEl } = this.resolveContainer()
    const targetRect = target.getBoundingClientRect()
    const targetHeight = targetRect.height || 0
    const block = this.getAttr('block', 'start') as ScrollBlock
    const explicitOffset = itemOffset ?? null
    const landingOffset =
      explicitOffset !== null
        ? explicitOffset
        : Number(this.getAttr('target-offset', '')) || Number(this.getAttr('offset', '0')) || 0
    // block=nearest：最小滚动量语义——目标已完全可见则不滚动；
    // 目标在上方对齐顶部、在下方对齐底部（不套用落点偏移，偏移只属于 start）
    if (block === 'nearest') {
      if (containerEl) {
        const cRect = containerEl.getBoundingClientRect()
        const clientHeight = containerEl.clientHeight
        const contentTop = targetRect.top - cRect.top + containerEl.scrollTop
        if (contentTop >= 0 && contentTop + targetHeight <= clientHeight) return
        this.smoothScrollTo(
          containerEl,
          contentTop < 0 ? Math.max(0, contentTop) : contentTop - clientHeight + targetHeight,
        )
      } else {
        const clientHeight = window.innerHeight || document.documentElement.clientHeight || 0
        const contentTop = targetRect.top + (window.scrollY || 0)
        if (targetRect.top >= 0 && targetRect.top + targetHeight <= clientHeight) return
        this.smoothScrollTo(
          window,
          targetRect.top < 0 ? Math.max(0, contentTop) : contentTop - clientHeight + targetHeight,
        )
      }
      return
    }
    let y: number
    if (containerEl) {
      const cRect = containerEl.getBoundingClientRect()
      const contentTop = targetRect.top - cRect.top + containerEl.scrollTop
      const clientHeight = containerEl.clientHeight
      if (block === 'center') y = contentTop - (clientHeight - targetHeight) / 2
      else if (block === 'end') y = contentTop - clientHeight + targetHeight
      else y = contentTop - landingOffset
      this.smoothScrollTo(containerEl, y)
    } else {
      const contentTop = targetRect.top + window.scrollY
      if (block === 'center') y = contentTop - (window.innerHeight - targetHeight) / 2
      else if (block === 'end') y = contentTop - window.innerHeight + targetHeight
      else y = contentTop - landingOffset
      this.smoothScrollTo(window, y)
    }
  }

  /**
   * 程序化定位（exposes scrollTo 语义）；滚动触发的高亮联动/事件由 scroll spy 自然接管。
   * 与宿主原生 Element.scrollTo 兼容：字符串按锚点 href 定位，数字/对象透传原生滚动。
   */
  public override scrollTo(x?: string | ScrollToOptions | number, y?: number): void {
    if (typeof x === 'string') this.scrollToTarget(x)
    else if (typeof x === 'number') window.scrollTo(x, y ?? 0)
    else if (x) window.scrollTo(x)
  }

  private smoothScrollTo(root: Window | HTMLElement, y: number): void {
    const duration = Number(this.getAttr('duration', '300'))
    const smooth = this.getAttr('animation', 'true') !== 'false'
    if (!smooth || !(duration > 0)) {
      this.setScrollTop(root, y)
      return
    }
    const startY = this.currentScrollTop(root)
    const distance = y - startY
    if (Math.abs(distance) < 1) return
    // 起点时刻以调用时为准（rAF 回调节点不可作基准：降频/仿真环境下时间戳可能不前进）
    const startTime = performance.now()
    const ease = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const step = (now: number): void => {
      const p = Math.min(1, Math.max(0, (now - startTime) / duration))
      this.setScrollTop(root, Math.round(startY + distance * ease(p)))
      if (p < 1) this.scrollRafId = requestAnimationFrame(step)
    }
    this.scrollRafId = requestAnimationFrame(step)
  }

  private currentScrollTop(root: Window | HTMLElement): number {
    return root === window ? window.scrollY : (root as HTMLElement).scrollTop
  }

  private setScrollTop(root: Window | HTMLElement, y: number): void {
    if (root === window) window.scrollTo(0, y)
    else (root as HTMLElement).scrollTop = y
  }

  /** affix 吸附：sticky 定位 + affix-offset（容器/视口滚动皆适用） */
  private applyAffix(): void {
    if (this.hasAttr('affix')) {
      const offset = Number(this.getAttr('affix-offset', '0')) || 0
      this.style.position = 'sticky'
      this.style.top = `${offset}px`
      this.style.zIndex = 'var(--oas-z-sticky, 1020)'
    } else {
      this.style.position = ''
      this.style.top = ''
      this.style.zIndex = ''
    }
  }

  private renderActive(): void {
    const links = this.shadow.querySelectorAll('[part="link"]')
    for (const link of links) {
      const href = link.getAttribute('href')
      link.setAttribute('aria-current', String(href === this.activeHref))
    }
    this.positionInk()
  }

  /** 墨水条定位：default 竖条贴左（top/height 随动）；underline 与横向模式为底部/顶部横条（left/width 随动） */
  private positionInk(): void {
    const ink = this.shadow.querySelector<HTMLElement>('.ink')
    if (!ink) return
    const variant = this.getAttr('variant', 'default')
    if (variant === 'lineless' || variant === 'block') {
      ink.style.display = 'none'
      return
    }
    let active: HTMLElement | null = null
    for (const link of this.shadow.querySelectorAll<HTMLElement>('[part="link"]')) {
      if (link.getAttribute('href') === this.activeHref) {
        active = link
        break
      }
    }
    if (!active) {
      ink.style.display = 'none'
      return
    }
    ink.style.display = ''
    const horizontal = this.getAttr('direction', 'vertical') === 'horizontal'
    const underline = variant === 'underline'
    if (horizontal || underline) {
      ink.style.left = `${active.offsetLeft}px`
      ink.style.width = `${active.offsetWidth}px`
      ink.style.top = `${active.offsetTop + active.offsetHeight}px`
      ink.style.height = '2px'
    } else {
      ink.style.left = '0'
      ink.style.width = '2px'
      ink.style.top = `${active.offsetTop}px`
      ink.style.height = `${active.offsetHeight}px`
    }
  }

  private parseItems(): void {
    if (this.hasAttribute('items')) {
      try {
        const parsed = JSON.parse(this.getAttr('items', '[]'))
        this._items = Array.isArray(parsed)
          ? parsed.filter((i): i is AnchorItem => this.isValidItem(i))
          : []
      } catch {
        this._items = []
      }
    } else {
      // 子元素通道：items 属性未显式设置时收敛子元素到同一 _items 模型
      this._items = this.parseChildItems()
    }
  }

  // ===== 子元素声明式通道 =====

  /** 子元素通道解析层：把 light DOM 的 `<oas-anchor-item>` 收敛为内部 items 模型（单一渲染路径） */
  private parseChildItems(): AnchorItem[] {
    return this.collectAnchorItems(this)
  }

  /** 递归收集容器内的锚点项载体（宿主 / 项元素通用）：直接子 oas-anchor-item 递归为 children */
  private collectAnchorItems(container: Element): AnchorItem[] {
    const items: AnchorItem[] = []
    for (const child of Array.from(container.children)) {
      if (child.tagName !== 'OAS-ANCHOR-ITEM') continue
      items.push(this.childToItem(child))
    }
    return items
  }

  /** 单个子元素 → 内部 item（默认插槽文本为 title，属性对齐 AnchorItem 字段） */
  private childToItem(el: Element): AnchorItem {
    const item: AnchorItem = {
      href: el.getAttribute('href') ?? '',
      title: this.childTitle(el),
    }
    const target = el.getAttribute('target')
    if (target) item.target = target
    const offset = el.getAttribute('target-offset')
    if (offset) {
      const n = Number.parseFloat(offset)
      if (Number.isFinite(n)) item.targetOffset = n
    }
    const nested = this.collectAnchorItems(el)
    if (nested.length > 0) item.children = nested
    return item
  }

  /** 默认插槽 title 文本：排除嵌套 oas-anchor-item 数据载体 */
  private childTitle(el: Element): string {
    let text = ''
    for (const node of el.childNodes) {
      if (node instanceof Element && node.tagName === 'OAS-ANCHOR-ITEM') continue
      text += node.textContent ?? ''
    }
    return text.trim()
  }

  /** 子元素通道观察器：只监听 light DOM 子元素；宿主自身的 active 等属性变化不在此列（走 attributeChanged 正常链路） */
  private ensureChildObserver(): void {
    if (this.childObserver) return
    const observer = new MutationObserver(() => {
      this.update()
    })
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['href', 'target', 'target-offset', 'slot'],
    })
    this.childObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childObserver = null
    })
  }

  private isValidItem(i: unknown): i is AnchorItem {
    if (!i || typeof i !== 'object') return false
    const o = i as Record<string, unknown>
    if (typeof o.href !== 'string' || typeof o.title !== 'string') return false
    if (o.children !== undefined) {
      if (!Array.isArray(o.children) || !o.children.every((c) => this.isValidItem(c))) return false
    }
    return true
  }

  private rebuildList(): void {
    const list = this.shadow.querySelector<HTMLElement>('.list')
    if (!list) return
    list.innerHTML = ''
    this.flatItems = []
    for (const item of this._items) this.buildItem(list, item, 1)
  }

  private buildItem(container: HTMLElement, item: AnchorItem, level: number): void {
    const li = document.createElement('li')
    li.className = 'anchor-item'
    li.dataset.level = String(level)
    const a = document.createElement('a')
    a.setAttribute('part', 'link')
    a.href = item.href
    a.textContent = item.title
    a.setAttribute('aria-current', 'false')
    if (item.target) {
      a.target = item.target
      a.rel = 'noopener noreferrer'
    }
    // item 元数据落 data-*（水合接管时从快照节点恢复点击绑定与落点偏移）
    if (item.targetOffset !== undefined) a.dataset.targetOffset = String(item.targetOffset)
    a.addEventListener('click', (e: MouseEvent) => this.handleLinkClick(item, e))
    li.appendChild(a)
    this.flatItems.push(item)
    container.appendChild(li)
    if (item.children && item.children.length > 0) {
      const sub = document.createElement('ul')
      sub.className = 'anchor-children'
      li.appendChild(sub)
      for (const child of item.children) this.buildItem(sub, child, level + 1)
    }
  }

  /** 水合接管：遍历 SSR 快照中的既有列表节点，恢复 flatItems 并绑定点击（不重建 DOM） */
  private bindExistingList(): void {
    const list = this.shadow.querySelector<HTMLElement>('.list')
    if (!list) return
    this.flatItems = []
    const walk = (root: HTMLElement): void => {
      for (const li of Array.from(root.children)) {
        const liEl = li as HTMLElement
        const a = Array.from(liEl.children).find((c) => c.getAttribute('part') === 'link') as
          | HTMLAnchorElement
          | undefined
        if (!a) continue
        const item: AnchorItem = {
          href: a.getAttribute('href') ?? '',
          title: a.textContent ?? '',
        }
        const target = a.getAttribute('target')
        if (target) item.target = target
        const to = a.dataset.targetOffset
        if (to !== undefined) item.targetOffset = Number(to)
        a.addEventListener('click', (e: MouseEvent) => this.handleLinkClick(item, e))
        this.flatItems.push(item)
        const sub = Array.from(liEl.children).find((c) =>
          (c as HTMLElement).classList.contains('anchor-children'),
        ) as HTMLElement | undefined
        if (sub) walk(sub)
      }
    }
    walk(list)
  }
}

/** AnchorTarget 目标标记组件：`<oas-anchor-target id="x">` 包裹真实多级标题，
 *  作为锚点项的滚动定位目标（id 同步到内部 part=target 元素） */
const TARGET_STYLE = `
:host {
  display: block;
}
`

export class OASAnchorTarget extends OASElement {
  static override get observedAttributes(): string[] {
    return ['id']
  }

  private template(): string {
    return `<style>${TARGET_STYLE}</style><div part="target" class="target"><slot></slot></div>`
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.syncId()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.target')) return false
    this.syncId()
    return true
  }

  protected override update(): void {
    this.syncId()
  }

  private syncId(): void {
    const target = this.shadow.querySelector<HTMLElement>('.target')
    if (!target) return
    const id = this.getAttribute('id')
    if (id) target.setAttribute('id', id)
    else target.removeAttribute('id')
  }
}
