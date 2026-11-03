import { OASElement } from '@oas-ui/core'
import { HeightCache, computeDynamicWindow } from './dynamic-height.js'
import { parseJsonArray } from '../../shared/json-array.js'
// slot 模板双形态克隆（静态 HTML 在 template.content；Vue 等 CSR 直插元素 childNodes）
import { cloneSlotContent } from '../../shared/slot-template.js'

export interface VirtualWindow {
  start: number
  end: number
}

/** scrollToIndex 的对齐方式 */
export type ScrollToIndexAlign = 'start' | 'center' | 'end' | 'auto'

export interface ScrollToIndexOptions {
  /**
   * 对齐方式（默认 'auto'）：
   * - start：目标项顶部对齐视口顶部
   * - center：目标项在视口垂直居中
   * - end：目标项底部对齐视口底部
   * - auto：目标项已完整可见则不滚动，否则按最小距离滚入视口
   */
  align?: ScrollToIndexAlign
  /** 平滑滚动（委托原生 scrollTo behavior: 'smooth'），默认 false 即时跳转 */
  smooth?: boolean
}

/**
 * 虚拟滚动窗口计算 —— 单一事实源，供 oas-virtual-list / table / tree 复用。
 *
 * 定高模型：scrollTop 决定首可见项，视口高度决定可见项数，buffer 做上下越界预渲染。
 */
export function computeVirtualWindow(
  scrollTop: number,
  viewport: number,
  itemHeight: number,
  count: number,
  buffer = 4,
): VirtualWindow {
  if (!count || count <= 0) return { start: 0, end: 0 }
  const vh = Math.max(0, Number.isFinite(viewport) ? viewport : 0)
  const ih = Math.max(1, Number.isFinite(itemHeight) ? itemHeight : 0)
  const buf = Math.max(0, Number.isFinite(buffer) ? buffer : 0)
  // 夹取 scrollTop 到有效滚动区间，避免窗口越界（start >= end）
  const rawTop = Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0)
  const top = Math.min(rawTop, Math.max(0, count * ih - vh))
  const start = Math.max(0, Math.floor(top / ih) - buf)
  const end = Math.min(count, Math.ceil((top + vh) / ih) + buf)
  return { start, end }
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
.viewport {
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  /* 虚拟滚动重渲染（padding/items 增删）会触发 Chrome 滚动锚定，把滚轮增量逐帧放大
     成加速循环（滚一下直接到底/越滚越快），必须禁用锚定 */
  overflow-anchor: none;
}
.inner {
  position: relative;
  overflow-anchor: none;
}
.padding {
  width: 100%;
}
.item {
  box-sizing: border-box;
  overflow: hidden;
}
.item:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
`

/**
 * oas-virtual-list —— 视口窗口渲染的通用虚拟列表。
 *
 * 属性（kebab-case）：
 * - `height`：视口高度（px），默认 320
 * - `item-height`：定高项高度（px），默认 36
 * - `buffer`：上下预渲染项数，默认 4
 * - `dynamic-height`：动态行高开关（默认关）。开启后各行高度可不同：
 *   未测行按预估高排布，窗口行由 ResizeObserver 实测回写并逐步修正总高与偏移；
 *   视口上方行高变化自动补偿 scrollTop 保持视觉锚定（向上滚动不跳动）。
 * - `estimated-item-height`：动态行高的预估行高（px，缺省沿用 item-height）。
 *   取接近真实平均行高的值可减小实测修正幅度
 * - `scroll-target`：外部滚动容器 CSS 选择器（可选）。设置后组件不自带滚动条，
 *   改为监听外部容器的 scroll 并按其 scrollTop 计算窗口（组件本身占满全部内容高度）。
 * - `keyboard`：opt-in 键盘行导航（↑/↓/Home/End/PageUp/PageDown，roving tabindex；
 *   视口本身不再 Tab 聚焦，由活动项承载焦点）。
 * - `active-index`：键盘导航的当前活动行（0 基；越界夹取，空数据为 -1）。
 * - `items`：JSON 字符串形式的数据（可选，property `items` 优先）
 *
 * property：
 * - `items: unknown[]` —— 数据数组（推荐通道，优先级高于 items 属性）
 * - `activeIndex: number` —— 当前活动行（等价 active-index 属性）
 *
 * 事件（bubbles + composed）：
 * - `oas-scroll`：`{ scrollTop, start, end }`，rAF 节流
 * - `oas-item`：`{ index, item, element }`，每个可见项渲染后派发，宿主可据此绑定内容
 * - `oas-active-change`：`{ index, item }`，键盘/焦点移动活动行时派发（宿主写 active-index 不回声）
 *
 * slot：
 * - `template[slot="item"]`：可选模板，克隆到每个可见项容器；未提供时默认渲染 String(item)
 *
 * 公共方法：
 * - `scrollToIndex(index, options?)`：滚动到指定项（消费方契约，list/tree 内嵌定位用）。
 *   `options.align` 支持 start/center/end/auto（默认 auto：最小滚动使目标可见）；
 *   `options.smooth` 走原生平滑滚动。scroll-target 模式下写外部容器的 scrollTop。
 *   动态行高模式按高度表定位（未测段按预估高）。
 *
 * 公共 property：
 * - `viewportFocusable: boolean`：视口是否可 Tab 聚焦（默认 true）。内嵌消费方
 *   （如 tree，行自带 roving tabindex）置 false 关闭视口聚焦，不再直查内部 DOM。
 */
export class OASVirtualList extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'height',
      'item-height',
      'buffer',
      'scroll-target',
      'items',
      'dynamic-height',
      'estimated-item-height',
      'keyboard',
      'active-index',
    ]
  }

  private data: unknown[] = []
  private itemsFromProperty = false
  private start = 0
  private end = 0
  private raf = 0
  private viewport: HTMLElement | null = null
  private inner: HTMLElement | null = null
  private paddingTop: HTMLElement | null = null
  private paddingBottom: HTMLElement | null = null
  private itemsEl: HTMLElement | null = null
  private itemRole = ''
  private boundTarget: HTMLElement | null = null
  private viewportFocusableValue = true
  /** 动态行高：高度表 + 前缀和缓存（dynamic-height 开启时生效） */
  private heightCache = new HeightCache()
  /** 动态行高：实测行高的观察器（仅观察窗口行，断开旧行） */
  private resizeObserver: ResizeObserver | null = null
  /** items 属性（attribute JSON 通道）上次解析原文：内容不变则不重置高度缓存 */
  private lastItemsRaw: string | null = null
  /** 数据版本：items 变化即自增，参与窗口渲染签名（跳过冗余重建） */
  private dataVersion = 0
  /** 最近一次定高窗口渲染签名：窗口/数据/行高未变时不重建行 DOM */
  private renderSig = ''

  /**
   * 视口是否可 Tab 聚焦（默认 true）。内嵌消费方（如 tree，行自带 roving tabindex）
   * 置 false 关闭视口聚焦——取代直查 shadow 内部 .viewport 移除 tabindex 的耦合写法。
   */
  get viewportFocusable(): boolean {
    return this.viewportFocusableValue
  }

  set viewportFocusable(value: boolean) {
    this.viewportFocusableValue = value !== false
    this.syncViewportFocusable()
  }

  /** 键盘导航当前活动行（0 基；空数据/越界读取时夹取到有效区间） */
  get activeIndex(): number {
    return this.activeIndexValue()
  }

  set activeIndex(value: number) {
    const next = Number.isFinite(value) ? Math.trunc(value) : 0
    this.setAttribute('active-index', String(next))
  }

  get items(): unknown[] {
    return this.data.slice()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // 升级前被赋过 items（SSR/onMounted 与模块加载的时序竞争），自有属性遮蔽原型
    // setter → parseItems 读 attribute 为空 → 不渲染。回收到 setter 通道。
    // 运行时 value 可能是数组，也可能是框架把静态 items attribute 写成 property 的 JSON 字符串。
    if (Object.prototype.hasOwnProperty.call(this, 'items')) {
      const own = (this as unknown as { items?: unknown }).items
      if (Array.isArray(own) || typeof own === 'string') {
        delete (this as unknown as Record<string, unknown>).items
        this.items = own as unknown[]
      }
    }
  }

  set items(value: unknown[]) {
    // 运行时容忍 JSON 字符串（框架把静态 items attribute 写成 property）；公开类型保持数组。
    // 非法 JSON / 非数组回落空数组（同 gantt/resource 的 setter 口径），不抛异常。
    this.data = parseJsonArray<unknown>(value as unknown).slice()
    this.itemsFromProperty = true
    this.dataVersion++
    this.heightCache.configure(this.data.length, this.estimatedHeight())
    if (this.isConnected) this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const innerHtml = `
      <div class="inner" part="inner">
        <div class="padding padding-top" part="padding-top"></div>
        <div class="items" part="items"></div>
        <div class="padding padding-bottom" part="padding-bottom"></div>
      </div>
    `
    // scroll-target 模式：不自建滚动视口，由外部容器滚动整段内容
    return this.scrollTargetSelector()
      ? `<style>${STYLE}</style>${innerHtml}`
      : `<style>${STYLE}</style>
         <div class="viewport" part="viewport" tabindex="0">${innerHtml}</div>`
  }

  /** 缓存节点引用 + 注册清理（render 与水合路径共用；滚动监听由 update 的 syncTarget 幂等绑定） */
  private bind(): void {
    this.viewport = this.shadow.querySelector('.viewport')
    this.inner = this.shadow.querySelector('.inner')
    this.paddingTop = this.shadow.querySelector('.padding-top')
    this.paddingBottom = this.shadow.querySelector('.padding-bottom')
    this.itemsEl = this.shadow.querySelector('.items')
    this.viewport?.addEventListener('keydown', this.handleKeyboardEvt)
    // scroll-target 模式没有内部 viewport，键盘事件改由 items 容器承接（冒泡同样到达）
    this.itemsEl?.addEventListener('keydown', this.handleKeyboardEvt)
    // 动态行高：行高实测观察器（SSR/无 ResizeObserver 环境安全跳过，退回预估值）
    if (typeof ResizeObserver !== 'undefined' && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => this.handleItemResize(entries))
    }
    this.onCleanup(() => {
      if (this.boundTarget) this.boundTarget.removeEventListener('scroll', this.handleScrollEvt)
      this.boundTarget = null
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（items 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.items')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseItems()
    this.syncTarget()
    this.syncRoles()
    this.syncViewportFocusable()
    // height 属性必须落成视口的实际 CSS 高度（此前只用于窗口计算，视口 height:100%
    // 会被撑高容器拉到全内容高度，页面跟着变 16 万 px）
    if (this.viewport) this.viewport.style.height = `${this.listHeight()}px`
    this.renderWindow()
    // keyboard：宿主写 active-index / 数据收缩后，活动行可能落在窗口外；滚入视口以便 roving 焦点可达
    if (this.keyboardEnabled()) this.ensureActiveInWindow()
  }

  /** 活动行不在当前窗口内时滚入（不抢焦点；宿主写 active-index 仍保持原焦点） */
  private ensureActiveInWindow(): void {
    const active = this.activeIndexValue()
    if (active < 0 || (active >= this.start && active < this.end)) return
    this.scrollToIndex(active, { align: 'auto' })
  }

  /** items-role 透传到 .items 容器、item-role 透传到每个 item（opt-in，供 tree 等虚拟化 ARIA 层级用） */
  private syncRoles(): void {
    const role = this.getAttribute('items-role')
    const itemsEl = this.itemsEl
    if (itemsEl) {
      if (role) itemsEl.setAttribute('role', role)
      else itemsEl.removeAttribute('role')
    }
    this.itemRole = this.getAttribute('item-role') ?? (this.keyboardEnabled() ? 'option' : '')
    // keyboard：列表容器给 listbox 语义，活动行给 option 语义；宿主 aria-label 转发给容器
    if (this.keyboardEnabled()) {
      const container = this.viewport ?? itemsEl
      if (container) {
        container.setAttribute('role', 'listbox')
        const label = this.getAttribute('aria-label')
        if (label) container.setAttribute('aria-label', label)
        else container.removeAttribute('aria-label')
      }
    } else if (this.viewport) {
      this.viewport.removeAttribute('role')
      this.viewport.removeAttribute('aria-label')
    }
  }

  /** 按 viewportFocusable 同步视口 tabindex（update 每次幂等执行，消费方任意时序设置均收敛） */
  private syncViewportFocusable(): void {
    if (!this.viewport) return
    // keyboard 模式：焦点由活动行承载（roving tabindex），视口本身不再进 Tab 序；
    // 空数据时保留视口可聚焦，避免列表完全不可达。
    if (this.keyboardEnabled()) {
      this.viewport.setAttribute('tabindex', this.data.length > 0 ? '-1' : '0')
      return
    }
    if (this.viewportFocusableValue) this.viewport.setAttribute('tabindex', '0')
    else this.viewport.removeAttribute('tabindex')
  }

  private keyboardEnabled(): boolean {
    return this.hasAttr('keyboard')
  }

  /** 当前活动行：空数据 -1；越界按最近边界夹取（不回写宿主 attribute） */
  private activeIndexValue(): number {
    const count = this.data.length
    if (count === 0) return -1
    const raw = Number(this.getAttr('active-index', '0'))
    const n = Number.isFinite(raw) ? Math.trunc(raw) : 0
    return Math.min(count - 1, Math.max(0, n))
  }

  /** 键盘导航：roving tabindex + ↑↓/Home/End/PageUp/PageDown；活动项滚入视口并聚焦 */
  private handleKeyboardEvt = (e: KeyboardEvent): void => {
    if (!this.keyboardEnabled() || this.data.length === 0) return
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
    // 模板内的输入/可编辑控件保留原生光标与选项导航；composedPath 可穿过嵌套 shadow 找到真实控件
    const fromEditable = e
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement &&
          node.matches(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="searchbox"]',
          ),
      )
    if (fromEditable) return
    const current = this.activeIndexValue()
    const page = Math.max(1, Math.floor(this.listHeight() / this.itemHeightPx()) - 1)
    let next = current
    if (e.key === 'ArrowDown') next = current + 1
    else if (e.key === 'ArrowUp') next = current - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = this.data.length - 1
    else if (e.key === 'PageDown') next = current + page
    else if (e.key === 'PageUp') next = current - page
    else return
    e.preventDefault()
    next = Math.min(this.data.length - 1, Math.max(0, next))
    if (next === current) return
    this.setAttribute('active-index', String(next))
    this.scrollToIndex(next, { align: 'auto' })
    this.focusActive()
    this.emit('active-change', { index: next, item: this.data[next] })
  }

  /** happy-dom 在无焦点节点时读取 shadow.activeElement 会抛错；浏览器不受影响 */
  private shadowActiveElement(): Element | null {
    try {
      return this.shadow.activeElement
    } catch {
      return null
    }
  }

  /** 活动项 focus（不触发滚动，滚动已由 scrollToIndex 完成） */
  private focusActive(): void {
    const active = this.activeIndexValue()
    const items = this.itemsEl?.querySelectorAll<HTMLElement>('.item')
    if (!items) return
    for (const el of items) el.tabIndex = Number(el.dataset.index) === active ? 0 : -1
    if (active < 0) return
    this.itemsEl?.querySelector<HTMLElement>(`.item[data-index="${active}"]`)?.focus({ preventScroll: true })
  }

  /** 项获得焦点（点击/程序聚焦）：同步活动行并派发；键盘 move 已先写 attr，不会重复派发 */
  private syncActiveFromFocus(index: number): void {
    if (!this.keyboardEnabled() || index === this.activeIndexValue()) return
    this.setAttribute('active-index', String(index))
    this.emit('active-change', { index, item: this.data[index] })
  }

  /**
   * 滚动到指定索引项（公共契约，供 list/tree 等内嵌消费方定位，无需直查内部 DOM）。
   *
   * - 索引夹取到 [0, count-1]，非有限数值忽略；空数据为空操作
   * - `align` 默认 'auto'：目标项已完整可见则不滚动，否则最小距离滚入视口
   * - `smooth` 委托原生 scrollTo(behavior: 'smooth')，由 scroll 事件驱动重渲染；
   *   即时模式同步设置 scrollTop 并立即重建窗口（调用后目标项 DOM 已存在）
   * - scroll-target 模式写外部容器的 scrollTop（沿用「外部容器内容顶即第 0 项」的既有假设）
   */
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void {
    const count = this.data.length
    if (!count || !Number.isFinite(index)) return
    const idx = Math.min(Math.max(0, Math.trunc(index)), count - 1)
    const dynamic = this.isDynamic()
    if (dynamic) this.heightCache.configure(count, this.estimatedHeight())
    const ih = dynamic ? this.heightCache.heightAt(idx) : this.itemHeightPx()
    const vh = this.listHeight()
    const total = dynamic ? this.heightCache.total() : count * ih
    const maxTop = Math.max(0, total - vh)
    const itemTop = dynamic ? this.heightCache.offsetOf(idx) : idx * ih
    const target = this.boundTarget ?? this.viewport
    if (!target) return
    let top: number
    switch (options?.align ?? 'auto') {
      case 'start':
        top = itemTop
        break
      case 'center':
        top = itemTop - (vh - ih) / 2
        break
      case 'end':
        top = itemTop + ih - vh
        break
      default: {
        // auto：已完整可见则不滚动，上方越界滚到项顶、下方越界滚到项底
        const cur = target.scrollTop
        if (itemTop < cur) top = itemTop
        else if (itemTop + ih > cur + vh) top = itemTop + ih - vh
        else top = cur
      }
    }
    top = Math.min(Math.max(0, top), maxTop)
    if (options?.smooth && typeof target.scrollTo === 'function') {
      target.scrollTo({ top, behavior: 'smooth' })
      return
    }
    target.scrollTop = top
    this.renderWindow()
  }

  private listHeight(): number {
    return Number(this.getAttr('height', '320')) || 320
  }

  /** 定高项高度（方法名避开 item-height 属性的 camelCase itemHeight，防 property 赋值
   *  el.itemHeight=20 遮蔽原型方法，对齐 gantt/table 的 xxxPx 惯例） */
  private itemHeightPx(): number {
    return Number(this.getAttr('item-height', '36')) || 36
  }

  // 命名注意：不得叫 buffer——公开 attribute buffer 会被 React/Vue 走 property 通道同名赋值
  // （el.buffer = 4）在实例上挂自有属性遮蔽原型方法，此后 this.buffer() 直接 TypeError
  private bufferSize(): number {
    return Number(this.getAttr('buffer', '4')) || 4
  }

  private scrollTargetSelector(): string {
    return this.getAttr('scroll-target', '')
  }

  private parseItems(): void {
    if (this.itemsFromProperty) return
    const raw = this.getAttribute('items')
    if (raw == null || raw === this.lastItemsRaw) return
    this.lastItemsRaw = raw
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.data = parsed
        this.dataVersion++
        this.heightCache.configure(this.data.length, this.estimatedHeight())
      }
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** 动态行高开关（默认关，保持向后兼容） */
  private isDynamic(): boolean {
    return this.hasAttr('dynamic-height')
  }

  /** 动态行高预估行高：estimated-item-height 缺省沿用 item-height */
  private estimatedHeight(): number {
    const raw = this.getAttr('estimated-item-height', '')
    if (raw !== '' && Number(raw) > 0) return Number(raw)
    return this.itemHeightPx()
  }

  /** 解析滚动目标并绑定 scroll 监听（可切换：外部容器 → 自身视口） */
  private syncTarget(): void {
    const selector = this.scrollTargetSelector()
    let target: HTMLElement | null = null
    if (selector) {
      const root = this.getRootNode() as Document | ShadowRoot
      target = (root.querySelector(selector) as HTMLElement | null) ?? null
    }
    target ??= this.viewport
    if (!target || target === this.boundTarget) return
    if (this.boundTarget) this.boundTarget.removeEventListener('scroll', this.handleScrollEvt)
    target.addEventListener('scroll', this.handleScrollEvt, { passive: true })
    this.boundTarget = target
  }

  private renderWindow(): void {
    const itemsEl = this.itemsEl
    if (!itemsEl) return
    const count = this.data.length
    const vh = this.listHeight()
    const target = this.boundTarget ?? this.viewport
    if (this.isDynamic()) {
      // 动态行高：高度表驱动窗口/总高/padding；scrollTop 夹取到有效区间
      this.heightCache.configure(count, this.estimatedHeight())
      const total = this.heightCache.total()
      const scrollTop = Math.min(Math.max(0, target ? target.scrollTop : 0), Math.max(0, total - vh))
      const win = computeDynamicWindow(this.heightCache.offsets(), count, scrollTop, vh, this.bufferSize())
      this.start = win.start
      this.end = win.end
      if (this.inner) this.inner.style.height = `${total}px`
      if (this.paddingTop) this.paddingTop.style.height = `${this.heightCache.offsetOf(win.start)}px`
      if (this.paddingBottom) {
        this.paddingBottom.style.height = `${total - this.heightCache.offsetOf(win.end)}px`
      }
      // 动态行高窗口随实测高度持续修正：退出跳过逻辑，下一次定高渲染必须重建
      this.renderSig = ''
      this.renderItems()
      return
    }
    const ih = this.itemHeightPx()
    // 数据收缩时夹取 scrollTop，避免窗口越界
    const scrollTop = Math.min(Math.max(0, target ? target.scrollTop : 0), Math.max(0, count * ih - vh))
    const win = computeVirtualWindow(scrollTop, vh, ih, count, this.bufferSize())
    this.start = win.start
    this.end = win.end
    if (this.inner) this.inner.style.height = `${count * ih}px`
    if (this.paddingTop) this.paddingTop.style.height = `${win.start * ih}px`
    if (this.paddingBottom) this.paddingBottom.style.height = `${(count - win.end) * ih}px`
    // 定高模式：窗口签名未变时不重建行 DOM（同窗口内滚动、程序化 scrollTop 后的尾随 scroll 事件）。
    // 重建会销毁宿主放在行内的当前焦点——如 oas-tree 键盘跨窗口定位刚聚焦的行会被尾随帧清掉，
    // 表现为「End 滚到末行但焦点丢失」。内容变化由 dataVersion（items/属性通道）驱动重建。
    const sig = `${this.dataVersion}:${win.start}:${win.end}:${ih}:${this.itemRole}`
    if (sig === this.renderSig && itemsEl.firstChild) return
    this.renderSig = sig
    this.renderItems()
  }

  private renderItems(): void {
    const itemsEl = this.itemsEl
    if (!itemsEl) return
    // keyboard：重建窗口会销毁当前聚焦项；若焦点本来就在列表内，重建后把焦点还给活动行
    const activeElement = this.shadowActiveElement()
    const hadFocus =
      this.keyboardEnabled() &&
      !!activeElement &&
      (activeElement === this.viewport || !!itemsEl.contains(activeElement))
    // 动态行高：重建前解除旧行观察（节点 detach 后 RO 仍持引用，滚动即泄漏）
    if (this.isDynamic() && this.resizeObserver) {
      for (const child of Array.from(itemsEl.children)) this.resizeObserver.unobserve(child)
    }
    itemsEl.innerHTML = ''
    const tpl = this.itemTemplate()
    const dynamic = this.isDynamic()
    const ih = this.itemHeightPx()
    for (let i = this.start; i < this.end; i++) {
      const item = this.data[i]
      const el = document.createElement('div')
      el.className = 'item'
      el.setAttribute('part', 'item')
      el.setAttribute('data-index', String(i))
      if (this.itemRole) el.setAttribute('role', this.itemRole)
      if (this.keyboardEnabled()) {
        el.tabIndex = i === this.activeIndexValue() ? 0 : -1
        el.addEventListener('focus', () => this.syncActiveFromFocus(i))
      }
      // 动态行高不锁高：内容由 ResizeObserver 实测回写；定高模式沿用固定行高
      if (dynamic) {
        this.resizeObserver?.observe(el)
      } else {
        el.style.height = `${ih}px`
      }
      if (tpl) {
        el.appendChild(cloneSlotContent(tpl))
        this.emit('item', { index: i, item, element: el })
      } else {
        // 先派发 oas-item 让宿主（如 oas-tree）填充内容；宿主没填才回退 String(item)，
        // 且仅用于原始值行——对象行 String() 只会得到 "[object Object]"
        this.emit('item', { index: i, item, element: el })
        if (!el.hasChildNodes() && (item == null || typeof item !== 'object')) el.textContent = String(item ?? '')
      }
      itemsEl.appendChild(el)
    }
    if (hadFocus) this.focusActive()
  }

  /**
   * 动态行高实测回写：行高与缓存差异 ≥0.5px 才更新；视口上方行变高/变矮会平移
   * 可视内容，按总位移补偿 scrollTop 保持视觉锚定（向上滚动不跳动）；随后重建窗口。
   */
  private handleItemResize(entries: ResizeObserverEntry[]): void {
    if (!this.isDynamic()) return
    const target = this.boundTarget ?? this.viewport
    const scrollTop = target ? target.scrollTop : 0
    let deltaAbove = 0
    let changed = false
    for (const entry of entries) {
      const el = entry.target as HTMLElement
      const idx = Number(el.getAttribute('data-index'))
      if (!Number.isFinite(idx)) continue
      const newH = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
      const oldH = this.heightCache.heightAt(idx)
      if (!this.heightCache.measure(idx, newH)) continue
      changed = true
      // 行顶在当前滚动位置上方 → 其高度差会平移可视区，累计补偿量
      if (this.heightCache.offsetOf(idx) < scrollTop) deltaAbove += newH - oldH
    }
    if (!changed) return
    if (deltaAbove !== 0 && target) target.scrollTop = scrollTop + deltaAbove
    this.renderWindow()
  }

  private itemTemplate(): HTMLTemplateElement | null {
    const tpl = this.querySelector('template[slot="item"]')
    return tpl instanceof HTMLTemplateElement ? tpl : null
  }

  private handleScrollEvt = (): void => {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      const target = this.boundTarget ?? this.viewport
      const scrollTop = target ? target.scrollTop : 0
      this.renderWindow()
      this.emit('scroll', { scrollTop, start: this.start, end: this.end })
    })
  }
}
