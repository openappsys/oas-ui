import { OASElement } from '@oas-ui/core'
import { iconRegistry } from '@oas-ui/icons'

const STYLE = `
:host {
  display: flex;
  height: 100%;
  width: 100%;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
:host([vertical]) {
  flex-direction: column;
}
.pane {
  flex: 1 1 0%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.splitter {
  flex-shrink: 0;
  width: 6px;
  cursor: col-resize;
  background: var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
:host([vertical]) .splitter {
  width: 100%;
  height: 6px;
  cursor: row-resize;
  flex-direction: column;
}
.splitter:hover,
.splitter.is-active {
  background: var(--oas-color-primary);
}
:host([dragging]) {
  user-select: none;
}
.splitter:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
.grip {
  width: 2px;
  height: 16px;
  border-radius: 1px;
  background: var(--oas-color-bg);
  opacity: 0.85;
}
:host([vertical]) .grip {
  width: 16px;
  height: 2px;
}
/* collapsible 时收起默认 grip，让位折叠按钮 */
.splitter.is-collapsible .grip {
  display: none;
}
.collapse-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 10px;
  z-index: 1;
  transition:
    color var(--oas-transition-base) var(--oas-ease-out),
    border-color var(--oas-transition-base) var(--oas-ease-out),
    background var(--oas-transition-base) var(--oas-ease-out);
}
.collapse-btn:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.collapse-btn svg {
  display: block;
}
`

type SplitterMode = 'legacy' | 'multi'

export class OASSplitter extends OASElement {
  static override get observedAttributes(): string[] {
    return ['percent', 'min', 'max', 'vertical', 'collapsible', 'collapsed', 'lazy', 'sizes']
  }

  /** 布局模式：legacy（slot=left/right 两面板）/ multi（直接子元素即面板） */
  private mode: SplitterMode = 'legacy'

  /** 面板包装节点与分隔条（legacy 固定 2+1；multi 按子元素数动态维护） */
  private panes: HTMLElement[] = []
  private splitters: HTMLElement[] = []
  private observer: MutationObserver | null = null

  /** 拖拽状态 */
  private dragging = false
  private dragIndex = 0
  private startPos = 0
  private startPercent = 0
  private dragPercent = 0

  /** 布局状态 */
  private sizes: number[] = []
  private sizesInitialized = false
  private initialPercent = 50
  private initialSizes: number[] = []
  /** 折叠到 0 的面板索引集合（受控语义：写回 collapsed 属性） */
  private collapsedPanels = new Set<number>()
  /** 折叠前尺寸（展开还原用） */
  private collapsedPrev = new Map<number, number>()
  /** 最近一次变更的属性（受控折叠同步的 gate：仅首渲染/直接改 collapsed 时响应） */
  private lastAttr = ''
  private renderedOnce = false

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    this.lastAttr = name
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    if (this.detectMode() === 'multi') return `<style>${STYLE}</style>`
    return `
      <style>${STYLE}</style>
      <div class="pane" part="pane-left"><slot name="left"><slot></slot></slot></div>
      <div class="splitter" part="splitter" tabindex="0" role="separator" aria-orientation="vertical">
        <slot name="handle"><span class="grip"></span></slot>
      </div>
      <div class="pane" part="pane-right"><slot name="right"></slot></div>
    `
  }

  /** 旧两面板模式判定：存在 slot=left/right 子元素走 legacy */
  private hasLegacySlots(): boolean {
    return this.querySelector('[slot="left"], [slot="right"]') !== null
  }

  /**
   * 模式检测：
   * - 有 slot=left/right 子元素 → legacy（旧用法完全不变）；
   * - ≥2 个直接子元素（面板）→ multi（子元素即面板，分隔条自动插在相邻面板间）；
   * - 0/1 个子元素回落 legacy（空态/单面板保持分隔条骨架，aria 与既有测试契约不变）。
   */
  private detectMode(): SplitterMode {
    if (this.hasLegacySlots()) return 'legacy'
    return this.panelChildren().length >= 2 ? 'multi' : 'legacy'
  }

  /** multi 面板集合：直接子元素（排除 slot=left/right/handle 与 style/script/template；
   *  组件托管的 slot=pane-N 视为面板） */
  private panelChildren(): HTMLElement[] {
    return Array.from(this.children).filter((el) => {
      const slot = el.getAttribute('slot')
      if (slot === 'left' || slot === 'right' || slot === 'handle') return false
      return el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT' && el.tagName !== 'TEMPLATE'
    }) as HTMLElement[]
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.mode = this.detectMode()
    this.initialPercent = Number(this.getAttr('percent', '50')) || 50
    if (this.mode === 'legacy') {
      this.panes = Array.from(this.shadow.querySelectorAll<HTMLElement>('.pane'))
      this.splitters = Array.from(this.shadow.querySelectorAll<HTMLElement>('[part="splitter"]'))
    }
    // 事件委托：分隔条/折叠按钮动态增删时无需重绑（light DOM 事件不穿透 shadow 监听，面板内按键不影响）
    this.shadow.addEventListener('pointerdown', (e) => this.onPointerDown(e as PointerEvent))
    this.shadow.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.shadow.addEventListener('dblclick', (e) => this.handleDblClick(e as MouseEvent))
    this.shadow.addEventListener('click', (e) => this.onClick(e as MouseEvent))
    // 拖拽期间监听在 document 上，保证指针移出分隔条仍能跟随
    this.onCleanup(() => {
      document.removeEventListener('pointermove', this.onDrag)
      document.removeEventListener('pointerup', this.endDrag)
      this.observer?.disconnect()
      this.observer = null
    })
    if (this.mode === 'multi') {
      // 子元素增删 → 同步面板/分隔条骨架（slot 赋值走属性，不会触发 childList 回环）
      this.observer = new MutationObserver(() => this.syncPanels())
      this.observer.observe(this, { childList: true })
    }
  }

  /** 真水合：校验 SSR 快照结构（splitter 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.splitter')) return false
    this.bind()
    return true
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    if (this.mode === 'multi') this.syncPanels()
    // 受控折叠同步：仅首渲染（render 内 update）或外部直接改 collapsed 属性时响应；
    // 内部折叠写回触发的 update（lastAttr=sizes 等中间态）不重复展开/收起
    const isInitial = !this.renderedOnce
    this.renderedOnce = true
    if (isInitial || this.lastAttr === 'collapsed') this.syncCollapsedFromAttr()
    this.syncCollapseButtons()
    this.syncAria()
    this.applyPercent()
  }

  // ---------- 多面板结构同步 ----------

  private syncPanels(): void {
    const children = this.panelChildren()
    const n = children.length
    // 每个子元素按索引分配到专属 slot（多面板模式下组件托管 slot 属性）
    children.forEach((child, i) => {
      if (child.getAttribute('slot') !== `pane-${i}`) child.setAttribute('slot', `pane-${i}`)
    })
    if (this.panes.length !== n) {
      this.rebuildStructure(n)
      this.pruneCollapsed(n)
    }
    this.ensureSizes(n)
  }

  /** 按面板数重建 pane/splitter 骨架（不动 style，不重建 shadow 整棵） */
  private rebuildStructure(n: number): void {
    for (const el of this.panes) el.remove()
    for (const el of this.splitters) el.remove()
    this.panes = []
    this.splitters = []
    if (n < 1) return
    const frag = this.ownerDocument.createDocumentFragment()
    for (let i = 0; i < n; i++) {
      const pane = this.ownerDocument.createElement('div')
      pane.className = 'pane'
      pane.setAttribute('part', 'pane')
      pane.innerHTML = `<slot name="pane-${i}"></slot>`
      frag.appendChild(pane)
      this.panes.push(pane)
      if (i < n - 1) frag.appendChild(this.makeSplitter())
    }
    this.shadow.appendChild(frag)
  }

  private makeSplitter(): HTMLElement {
    const s = this.ownerDocument.createElement('div')
    s.className = 'splitter'
    s.setAttribute('part', 'splitter')
    s.setAttribute('tabindex', '0')
    s.setAttribute('role', 'separator')
    s.setAttribute('aria-orientation', 'vertical')
    s.innerHTML = `<slot name="handle"><span class="grip"></span></slot>`
    this.splitters.push(s)
    return s
  }

  /** 面板被移除时清掉越界折叠态 */
  private pruneCollapsed(n: number): void {
    for (const i of [...this.collapsedPanels]) {
      if (i >= n) {
        this.collapsedPanels.delete(i)
        this.collapsedPrev.delete(i)
      }
    }
    if (this.collapsedPanels.size === 0) this.removeAttribute('collapsed')
  }

  /** sizes 属性（逗号分隔百分比）→ 归一化数组；数量不匹配/非法回落均分 */
  private parseSizes(raw: string): number[] | null {
    if (!raw || raw.trim() === '') return null
    const parts = raw.split(',').map((s) => parseFloat(s.trim()))
    if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null
    const sum = parts.reduce((a, b) => a + b, 0)
    if (sum <= 0) return null
    return parts.map((p) => (p / sum) * 100)
  }

  private equalSizes(n: number): number[] {
    return Array.from({ length: n }, () => 100 / n)
  }

  private ensureSizes(n: number): void {
    if (n <= 0) {
      this.sizes = []
      return
    }
    const parsed = this.parseSizes(this.getAttr('sizes', ''))
    if (parsed && parsed.length === n) {
      this.sizes = parsed
    } else if (parsed || this.sizes.length !== n) {
      // sizes 属性存在但数量不匹配（或面板数变化）→ 回落均分
      this.sizes = this.equalSizes(n)
    }
    if (!this.sizesInitialized) {
      this.initialSizes = [...this.sizes]
      this.sizesInitialized = true
    }
  }

  private writeBackSizes(): void {
    this.setAttribute('sizes', this.sizes.map((s) => Math.round(s * 100) / 100).join(','))
  }

  // ---------- 事件（委托） ----------

  private onPointerDown(e: PointerEvent): void {
    const splitter = (e.target as HTMLElement).closest('[part="splitter"]')
    if (!splitter || !this.shadow.contains(splitter)) return
    if ((e.target as HTMLElement).closest('.collapse-btn')) return
    const index = this.splitters.indexOf(splitter as HTMLElement)
    if (index < 0) return
    this.startDrag(e, index)
  }

  private handleKey(e: KeyboardEvent): void {
    const splitter = (e.target as HTMLElement).closest('[part="splitter"]')
    if (!splitter || !this.shadow.contains(splitter)) return
    if ((e.target as HTMLElement).closest('.collapse-btn')) return
    const index = this.splitters.indexOf(splitter as HTMLElement)
    if (index < 0) return
    let delta = 0
    if (this.hasAttr('vertical')) {
      // 垂直：ArrowUp 缩小上一面板（前侧），ArrowDown 放大
      if (e.key === 'ArrowUp') delta = -1
      else if (e.key === 'ArrowDown') delta = 1
    } else {
      // 水平：ArrowLeft 缩小上一面板；RTL 镜像翻转（逻辑方向）
      if (e.key === 'ArrowLeft') delta = this.isRTL ? 1 : -1
      else if (e.key === 'ArrowRight') delta = this.isRTL ? -1 : 1
    }
    if (delta === 0) return
    e.preventDefault()
    this.adjust(delta, index)
  }

  private onClick(e: MouseEvent): void {
    const btn = (e.target as HTMLElement).closest('.collapse-btn')
    if (!btn) return
    const splitter = btn.closest('[part="splitter"]') as HTMLElement | null
    if (!splitter) return
    const index = this.splitters.indexOf(splitter)
    if (index < 0) return
    this.setCollapsed(index, !this.collapsedPanels.has(index))
  }

  private handleDblClick(e: MouseEvent): void {
    const splitter = (e.target as HTMLElement).closest('[part="splitter"]')
    if (!splitter || !this.shadow.contains(splitter)) return
    if ((e.target as HTMLElement).closest('.collapse-btn')) return
    const index = this.splitters.indexOf(splitter as HTMLElement)
    if (index < 0) return
    this.resetPair(index)
  }

  // ---------- 拖拽 ----------

  private startDrag(e: PointerEvent, index: number): void {
    if (e.button !== 0 && e.pointerType !== 'touch') return
    e.preventDefault()
    this.dragging = true
    this.dragIndex = index
    this.startPos = this.hasAttr('vertical') ? e.clientY : e.clientX
    this.startPercent =
      this.mode === 'legacy'
        ? Number(this.getAttr('percent', '50')) || 50
        : (this.sizes[index] ?? 50)
    this.dragPercent = this.startPercent
    this.setAttribute('dragging', '')
    this.splitters[index]?.classList.add('is-active')
    // 拖拽会把折叠面板重新打开（手动调整尺寸后折叠态失效）
    if (this.collapsedPanels.has(index)) this.setCollapsed(index, false)
    document.addEventListener('pointermove', this.onDrag)
    document.addEventListener('pointerup', this.endDrag)
  }

  private onDrag = (e: PointerEvent): void => {
    if (!this.dragging) return
    const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
    if (!size) return
    const raw = this.hasAttr('vertical')
      ? e.clientY - this.startPos
      : (e.clientX - this.startPos) * (this.isRTL ? -1 : 1)
    const p = this.startPercent + (raw / size) * 100
    // 统一按 min/max（multi 含配对和约束）夹取，ghost 与最终落盘一致
    const pairSum =
      this.mode === 'multi'
        ? (this.sizes[this.dragIndex] ?? 0) + (this.sizes[this.dragIndex + 1] ?? 0)
        : null
    this.dragPercent = this.clampPercent(p, pairSum)
    if (this.hasAttr('lazy')) {
      // lazy：拖拽中只动分隔条视觉位置，不写 percent/重渲面板
      this.moveGhost(this.dragPercent)
    } else if (this.mode === 'legacy') {
      this.setPercent(this.dragPercent)
    } else {
      this.setSizes(this.dragIndex, this.dragPercent)
    }
  }

  /** lazy 幽灵分隔条：仅视觉位移（transform），松手才落盘 */
  private moveGhost(p: number): void {
    const splitter = this.splitters[this.dragIndex]
    if (!splitter) return
    const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
    const px = size ? ((p - this.startPercent) / 100) * size : 0
    splitter.style.transform = this.hasAttr('vertical')
      ? `translate(0, ${px}px)`
      : `translate(${px * (this.isRTL ? -1 : 1)}px, 0)`
  }

  private endDrag = (): void => {
    if (!this.dragging) return
    this.dragging = false
    const splitter = this.splitters[this.dragIndex]
    if (splitter) {
      splitter.classList.remove('is-active')
      splitter.style.transform = ''
    }
    // lazy：松手才写 percent/sizes + 派发一次 resize（纯点击无位移不派发）
    if (this.hasAttr('lazy') && this.dragPercent !== this.startPercent) {
      if (this.mode === 'legacy') this.setPercent(this.dragPercent)
      else this.setSizes(this.dragIndex, this.dragPercent)
    }
    this.removeAttribute('dragging')
    document.removeEventListener('pointermove', this.onDrag)
    document.removeEventListener('pointerup', this.endDrag)
  }

  // ---------- 调整落盘 ----------

  private adjust(delta: number, index: number): void {
    if (this.mode === 'legacy') {
      const p = Number(this.getAttr('percent', '50')) || 50
      this.setPercent(p + delta)
    } else {
      const p = (this.sizes[index] ?? 50) + delta
      this.setSizes(index, p)
    }
  }

  /** legacy：写 percent 属性 + 派发 oas-resize（契约不变：detail { percent }） */
  private setPercent(p: number): void {
    const clamped = this.clampPercent(p, null)
    this.setAttribute('percent', String(clamped))
    this.emit('resize', { percent: clamped })
    this.applyPercent()
  }

  /** multi：相邻两面板此消彼长（配对和守恒），写回 sizes 属性 */
  private setSizes(index: number, p: number): void {
    const pairSum = (this.sizes[index] ?? 0) + (this.sizes[index + 1] ?? 0)
    const clamped = this.clampPercent(p, pairSum)
    this.sizes[index] = clamped
    this.sizes[index + 1] = Math.max(0, pairSum - clamped)
    this.writeBackSizes()
    this.emit('resize', { percent: clamped, index, sizes: [...this.sizes] })
    this.applyPercent()
  }

  /** 双击复位：回初始 percent / 初始相邻两面板比例（折叠态一并展开） */
  private resetPair(index: number): void {
    if (this.collapsedPanels.has(index)) this.setCollapsed(index, false)
    if (this.mode === 'legacy') {
      this.setPercent(this.initialPercent)
      return
    }
    const a = this.initialSizes[index] ?? 50
    const b = this.initialSizes[index + 1] ?? 50
    const total = a + b
    if (total <= 0) return
    const pairSum = (this.sizes[index] ?? 0) + (this.sizes[index + 1] ?? 0)
    this.sizes[index] = (a / total) * pairSum
    this.sizes[index + 1] = pairSum - this.sizes[index]
    this.writeBackSizes()
    this.emit('resize', { percent: this.sizes[index], index, sizes: [...this.sizes] })
    this.applyPercent()
  }

  /** min/max 夹取：pairSum 非空时保证相邻另一面板不小于 min */
  private clampPercent(p: number, pairSum: number | null): number {
    const lo = this.boundPercent(this.getAttr('min', '10'), 10)
    let hi = this.boundPercent(this.getAttr('max', '90'), 90)
    if (pairSum != null) {
      hi = Math.min(hi, pairSum - lo)
      if (lo <= hi) return Math.min(hi, Math.max(lo, p))
      return Math.max(0, Math.min(pairSum, p))
    }
    return Math.min(hi, Math.max(lo, p))
  }

  /**
   * 边界值解析：`200px` 后缀按像素夹取（换算成容器宽高占比），
   * 纯数字按百分比；非法（非数字/空串/0）回落 fallback（与既有语义一致）。
   */
  private boundPercent(raw: string, fallback: number): number {
    const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)px$/)
    if (m) {
      const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
      return size > 0 ? (parseFloat(m[1]!) / size) * 100 : 0
    }
    if (raw.trim() === '') return fallback
    const n = Number(raw)
    return Number.isFinite(n) && n !== 0 ? n : fallback
  }

  // ---------- 布局应用 ----------

  private applyPercent(): void {
    if (this.mode === 'multi') this.applyMulti()
    else this.applyLegacy()
  }

  private applyLegacy(): void {
    const left = this.panes[0]
    const right = this.panes[1]
    if (!left || !right) return
    if (this.collapsedPanels.has(0)) {
      left.style.flex = '0 0 0%'
      right.style.flex = '1 1 100%'
      return
    }
    const percent = Number(this.getAttr('percent', '50')) || 50
    left.style.flex = `0 0 ${percent}%`
    right.style.flex = '1 1 0%'
  }

  private applyMulti(): void {
    const n = this.panes.length
    if (!n) return
    this.panes.forEach((pane, i) => {
      if (this.collapsedPanels.has(i)) {
        pane.style.flex = '0 0 0%'
      } else if (i === n - 1) {
        // 末面板吸收剩余空间（sizes 归一化 sum≈100，余量即末面板尺寸）
        pane.style.flex = '1 1 0%'
      } else {
        pane.style.flex = `0 0 ${this.sizes[i] ?? 100 / n}%`
      }
    })
  }

  // ---------- 折叠 ----------

  /**
   * 折叠/展开面板 index（分隔条前一侧）。受控语义：
   * - 折叠状态写回 `collapsed` 属性（宿主可见/可外部控制）；
   * - 派发 `oas-collapse`，detail: { collapsed, side: 'left' }（side=left 指分隔条前一侧）。
   */
  private setCollapsed(index: number, collapsed: boolean): void {
    if (collapsed === this.collapsedPanels.has(index)) return
    const sizeBefore = this.panelSize(index)
    if (collapsed) {
      // 收起：尺寸并给右邻面板（此消彼长）
      if (this.mode === 'multi') {
        this.sizes[index + 1] = (this.sizes[index + 1] ?? 0) + sizeBefore
        this.sizes[index] = 0
      }
      this.collapsedPanels.add(index)
      this.collapsedPrev.set(index, sizeBefore)
    } else {
      // 展开：把折叠前尺寸从右邻面板挪回
      const prev = this.collapsedPrev.get(index) ?? sizeBefore
      if (this.mode === 'multi') {
        const give = Math.min(prev, this.sizes[index + 1] ?? prev)
        this.sizes[index] = give
        this.sizes[index + 1] = Math.max(0, (this.sizes[index + 1] ?? 0) - give)
      }
      this.collapsedPanels.delete(index)
      this.collapsedPrev.delete(index)
    }
    // 先写回 sizes 再同步 collapsed 属性：属性变更会触发 update() → ensureSizes 重新采纳 sizes，
    // 顺序颠倒会把内部刚改的尺寸被陈旧属性值覆盖
    if (this.mode === 'multi') this.writeBackSizes()
    if (this.collapsedPanels.size > 0) this.setAttribute('collapsed', '')
    else this.removeAttribute('collapsed')
    this.emit('collapse', { collapsed, side: 'left' })
    this.applyPercent()
    this.syncCollapseButtons()
    this.syncAria()
  }

  /** 外部 `collapsed` 属性同步：属性存在→折叠首条分隔条面板；移除→全部展开 */
  private syncCollapsedFromAttr(): void {
    const hostCollapsed = this.hasAttr('collapsed')
    if (hostCollapsed && this.collapsedPanels.size === 0) {
      if (this.splitters.length > 0) this.setCollapsed(0, true)
    } else if (!hostCollapsed && this.collapsedPanels.size > 0) {
      for (const i of [...this.collapsedPanels]) this.setCollapsed(i, false)
    }
  }

  /** 分隔条内折叠按钮（collapsible 时）：aria-label 走 locale，箭头随折叠态翻转 */
  private syncCollapseButtons(): void {
    const collapsible = this.hasAttr('collapsible')
    this.splitters.forEach((splitter, i) => {
      splitter.classList.toggle('is-collapsible', collapsible)
      let btn = splitter.querySelector<HTMLButtonElement>('.collapse-btn')
      if (!collapsible) {
        btn?.remove()
        return
      }
      if (!btn) {
        btn = this.ownerDocument.createElement('button')
        btn.className = 'collapse-btn'
        btn.type = 'button'
        splitter.appendChild(btn)
      }
      const collapsed = this.collapsedPanels.has(i)
      btn.setAttribute(
        'aria-label',
        collapsed ? this.t('splitter.expand') : this.t('splitter.collapse'),
      )
      btn.innerHTML = `<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false">${this.collapseIcon(collapsed)}</svg>`
    })
  }

  private collapseIcon(collapsed: boolean): string {
    if (this.hasAttr('vertical')) {
      return iconRegistry[collapsed ? 'chevron-down' : 'chevron-up'] ?? ''
    }
    return (
      iconRegistry[
        collapsed
          ? this.isRTL
            ? 'chevron-left'
            : 'chevron-right'
          : this.isRTL
            ? 'chevron-right'
            : 'chevron-left'
      ] ?? ''
    )
  }

  private panelSize(index: number): number {
    if (this.mode === 'legacy') return Number(this.getAttr('percent', '50')) || 50
    return this.sizes[index] ?? (this.sizes.length ? 100 / this.sizes.length : 50)
  }

  // ---------- aria ----------

  private syncAria(): void {
    // separator 的 aria-orientation 指分隔条自身方向：水平条（vertical 布局）为 horizontal
    const orientation = this.hasAttr('vertical') ? 'horizontal' : 'vertical'
    const min = this.boundPercent(this.getAttr('min', '10'), 10)
    const max = this.boundPercent(this.getAttr('max', '90'), 90)
    this.splitters.forEach((splitter, i) => {
      splitter.setAttribute('aria-orientation', orientation)
      splitter.setAttribute('aria-label', this.t('splitter.adjust'))
      const p =
        this.mode === 'legacy' ? Number(this.getAttr('percent', '50')) || 50 : (this.sizes[i] ?? 50)
      splitter.setAttribute('aria-valuenow', String(Math.round(p * 100) / 100))
      splitter.setAttribute('aria-valuemin', String(min))
      splitter.setAttribute('aria-valuemax', String(max))
    })
  }

  /** RTL 检测：就近取 dir 属性（宿主自身或最近祖先），逻辑方向自动镜像 */
  private get isRTL(): boolean {
    let node: HTMLElement | null = this
    while (node) {
      const dir = node.getAttribute('dir')
      if (dir === 'rtl') return true
      if (dir === 'ltr') return false
      node = node.parentElement
    }
    return false
  }
}
