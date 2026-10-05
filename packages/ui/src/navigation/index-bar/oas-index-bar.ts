import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** 索引栏条目数据 */
export interface IndexBarItem {
  label: string
  value?: string
}

/** 索引栏分节数据 */
export interface IndexBarSection {
  key: string
  title?: string
  items: IndexBarItem[]
}

/** 归一化后的条目（value 已回退 label） */
interface NormalizedItem {
  label: string
  value: string
}

/** 归一化后的分节（title 已回退 key） */
interface NormalizedSection {
  key: string
  title: string
  items: NormalizedItem[]
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
}
:host([hidden]) {
  display: none;
}
.root {
  position: relative;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  /* 面板化：边框+圆角+实底（bg-elevated）——无框实底灰块在暗色下是悬浮色板观感（实抓）；
     实底同时保证 axe 对比度可评分（shadow 内透明底不可评分） */
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
  background: var(--oas-color-bg-elevated);
}
.list {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
}
.list.scrollable {
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.section {
  box-sizing: border-box;
}
.section-header {
  padding: var(--oas-space-1) var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  font-weight: 600;
  color: var(--oas-color-text-secondary);
  background: var(--oas-index-bar-header-bg, var(--oas-color-bg-hover));
}
.list.sticky .section-header {
  position: sticky;
  top: 0;
  z-index: var(--oas-z-sticky, 10);
}
.section-items {
  display: flex;
  flex-direction: column;
}
.item {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: var(--oas-space-2) var(--oas-space-3);
  border: none;
  border-block-end: 1px solid var(--oas-color-border);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.item:hover {
  background: var(--oas-color-bg-hover);
}
.item:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: -2px;
}
.bar {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  padding: 0 var(--oas-space-1);
  border-inline-start: 1px solid var(--oas-color-border);
  user-select: none;
  touch-action: none;
  /* 26+ 字母超高时侧栏自滚（justify-center 会把首尾字母裁掉） */
  overflow-y: auto;
}
.letter {
  display: block;
  min-width: 1.75em;
  padding: 1px var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-xs);
  background: transparent;
  color: var(--oas-index-bar-letter-color, var(--oas-color-text-secondary));
  font: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.6;
  text-align: center;
  cursor: pointer;
  transition: color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
.letter:hover {
  color: var(--oas-index-bar-letter-active-color, var(--oas-color-primary));
}
.letter:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: 1px;
}
.letter.active {
  color: var(--oas-index-bar-letter-active-color, var(--oas-color-primary));
  background: var(--oas-index-bar-letter-active-bg, var(--oas-color-bg-hover));
  font-weight: 600;
}
@media (prefers-reduced-motion: reduce) {
  .letter {
    transition: none;
  }
}
`

/** prefers-reduced-motion 探测（happy-dom 等环境可能缺失 matchMedia） */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

let uid = 0

/**
 * oas-index-bar —— 索引栏（navigation 族，移动原生形态批）。
 *
 * 数据驱动的分节列表 + 右侧字母索引导航：点按 / 拖拽字母跳转分节，滚动反向联动当前字母高亮。
 *
 * 属性（kebab-case）：
 * - `sections`：JSON `[{ key, title?, items: [{ label, value? }] }]`——分节列表数据；
 *   字母侧栏从 sections 自动派生（key 唯一，重复保留首个）；`title` 缺省回退 `key`，
 *   条目 `value` 缺省回退 `label`
 * - `height`：数字（px）——列表区固定高度内滚动；缺省自适应内容高
 * - `sticky`：分节头吸顶（默认 true）；显式 `sticky="false"` 关闭
 *
 * 事件（bubbles + composed）：
 * - `oas-item-click`：`detail { value, label, section }`（section 为分节 key）
 * - `oas-change`：当前高亮字母变化，`detail { key }`——仅滚动联动 / 跳转导致变化时派发，初始不派发
 *
 * 交互：点按 / 拖拽（pointer capture）字母跳转（`prefers-reduced-motion` 下瞬跳）；
 * 列表/视口滚动 scrollspy 高亮最近一个越顶分节；键盘 ↑/↓ 移动字母焦点、Home/End 首尾、Enter/Space 跳转；
 * 条目为原生 button（Enter/Space 点击）。
 */
export class OASIndexBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['sections', 'height', 'sticky']
  }

  private rootEl: HTMLElement | null = null
  private listEl: HTMLElement | null = null
  private barEl: HTMLElement | null = null

  private sections: NormalizedSection[] = []
  private sectionEls: HTMLElement[] = []
  private letterEls: HTMLButtonElement[] = []

  /** 上次解析的 sections 原串：同值不重建 DOM */
  private lastSectionsRaw: string | null = null
  /** 当前高亮字母 key（scrollspy / 跳转共同维护） */
  private activeKey: string | null = null
  /** roving 焦点字母下标 */
  private focusIndex = 0
  /** 是否完成首帧（首帧高亮不派发 oas-change） */
  private initialized = false

  /** 滚动/尺寸监听的目标（列表元素或 window） */
  private spyRootEl: HTMLElement | Window | null = null
  private scrollRafId = 0
  /** 程序化平滑滚动进行中：抑制 scrollspy 改写高亮（避免动画途中被中间分节抢走） */
  private spySuppressed = false

  /** 拖拽态 */
  private dragging = false
  private dragPointerId: number | null = null
  private dragIndex = -1

  private readonly uid = ++uid

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="list" part="list" role="region"></div>
        <nav class="bar" part="bar" role="navigation"></nav>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.rootEl = this.shadow.querySelector<HTMLElement>('.root')
    this.listEl = this.shadow.querySelector<HTMLElement>('.list')
    this.barEl = this.shadow.querySelector<HTMLElement>('.bar')
    this.barEl?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.barEl?.addEventListener('pointerdown', this.handlePointerDown)
    this.barEl?.addEventListener('pointermove', this.handlePointerMove)
    this.barEl?.addEventListener('pointerup', this.handlePointerUp)
    this.barEl?.addEventListener('pointercancel', this.handlePointerUp)
    this.onCleanup(() => this.detachSpy())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（root 存在）后接管，跳过 shadow 重建；内容由 update 增量重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.root')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.rootEl) return
    const raw = this.getAttr('sections', '[]')
    if (raw !== this.lastSectionsRaw) {
      this.lastSectionsRaw = raw
      this.parseSections()
      this.rebuild()
    }
    this.syncModifiers()
    this.attachSpy()
    if (!this.initialized) {
      // 首帧：列表起始在顶部，高亮首分节且不派发 oas-change（滚动联动负责后续）
      this.applyActive(this.sections.length > 0 ? 0 : -1, false)
      this.initialized = true
    } else {
      this.applyActive(this.computeCurrent(), true)
    }
  }

  // ---------- 数据解析 ----------

  private parseSections(): void {
    let parsed: unknown = null
    try {
      parsed = JSON.parse(this.getAttr('sections', '[]'))
    } catch {
      parsed = null
    }
    if (!Array.isArray(parsed)) {
      this.sections = []
      return
    }
    const out: NormalizedSection[] = []
    const seen = new Set<string>()
    for (const raw of parsed) {
      if (!raw || typeof raw !== 'object') continue
      const obj = raw as Record<string, unknown>
      const key = typeof obj.key === 'string' ? obj.key.trim() : ''
      if (key === '' || seen.has(key)) continue
      seen.add(key)
      const title = typeof obj.title === 'string' && obj.title.trim() !== '' ? obj.title : key
      const rawItems = Array.isArray(obj.items) ? obj.items : []
      const items: NormalizedItem[] = []
      for (const it of rawItems) {
        if (!it || typeof it !== 'object') continue
        const item = it as Record<string, unknown>
        if (typeof item.label !== 'string') continue
        items.push({ label: item.label, value: typeof item.value === 'string' ? item.value : item.label })
      }
      out.push({ key, title, items })
    }
    this.sections = out
  }

  // ---------- 渲染 ----------

  private rebuild(): void {
    const list = this.listEl
    const bar = this.barEl
    if (!list || !bar) return
    list.innerHTML = ''
    bar.innerHTML = ''
    this.sectionEls = []
    this.letterEls = []
    this.sections.forEach((section, i) => list.appendChild(this.buildSection(section, i)))
    this.sections.forEach((section, i) => bar.appendChild(this.buildLetter(section, i)))
    if (this.focusIndex >= this.sections.length) this.focusIndex = Math.max(0, this.sections.length - 1)
    this.syncRoving()
    this.renderActive()
  }

  private buildSection(section: NormalizedSection, index: number): HTMLElement {
    const sec = document.createElement('div')
    sec.className = 'section'
    sec.setAttribute('part', 'section')
    const header = document.createElement('div')
    header.className = 'section-header'
    header.setAttribute('part', 'section-header')
    header.setAttribute('role', 'heading')
    header.setAttribute('aria-level', '2')
    header.id = `oas-index-bar-${this.uid}-h-${index}`
    header.textContent = section.title
    sec.setAttribute('aria-labelledby', header.id)
    sec.appendChild(header)
    const wrap = document.createElement('div')
    wrap.className = 'section-items'
    wrap.setAttribute('part', 'section-items')
    for (const item of section.items) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.textContent = item.label
      btn.addEventListener('click', () =>
        this.emit('item-click', { value: item.value, label: item.label, section: section.key }),
      )
      wrap.appendChild(btn)
    }
    sec.appendChild(wrap)
    this.sectionEls.push(sec)
    return sec
  }

  private buildLetter(section: NormalizedSection, index: number): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'letter'
    btn.setAttribute('part', 'letter')
    btn.textContent = section.title
    btn.dataset.key = section.key
    btn.setAttribute('aria-current', 'false')
    btn.tabIndex = index === this.focusIndex ? 0 : -1
    btn.addEventListener('click', (e) => {
      // 指针交互（或拖拽）由 pointerdown/move 处理；仅键盘激活（detail=0）走 click
      if ((e as MouseEvent).detail === 0) this.jumpTo(index, true)
    })
    this.letterEls.push(btn)
    return btn
  }

  private syncModifiers(): void {
    const list = this.listEl
    const bar = this.barEl
    if (!list || !bar) return
    const height = this.fixedHeight()
    if (height !== null) {
      list.style.height = `${height}px`
      list.classList.add('scrollable')
    } else {
      list.style.height = ''
      list.classList.remove('scrollable')
    }
    const sticky = this.getAttr('sticky', 'true') !== 'false'
    list.classList.toggle('sticky', sticky)
    bar.setAttribute('aria-label', this.t('indexBar.navAriaLabel'))
    list.setAttribute('aria-label', this.t('indexBar.listLabel'))
    this.toggleAttribute('data-rtl', isRtl(this))
  }

  private fixedHeight(): number | null {
    const n = Number.parseFloat(this.getAttr('height', ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }

  private renderActive(): void {
    this.letterEls.forEach((btn, i) => {
      const on = this.sections[i]?.key === this.activeKey
      btn.classList.toggle('active', on)
      btn.setAttribute('aria-current', on ? 'true' : 'false')
    })
  }

  private syncRoving(): void {
    this.letterEls.forEach((btn, i) => {
      btn.tabIndex = i === this.focusIndex ? 0 : -1
    })
  }

  // ---------- 滚动联动 / 定位 ----------

  /** 生效滚动容器：固定高度时列表自身滚动，否则监听视口 */
  private spyRoot(): HTMLElement | Window {
    return this.fixedHeight() !== null && this.listEl ? this.listEl : window
  }

  private attachSpy(): void {
    const root = this.spyRoot()
    if (this.spyRootEl === root) return
    this.detachSpy()
    root.addEventListener('scroll', this.handleScroll, { passive: true })
    this.spyRootEl = root
  }

  private detachSpy(): void {
    if (this.spyRootEl) {
      this.spyRootEl.removeEventListener('scroll', this.handleScroll)
      this.spyRootEl = null
    }
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId)
      this.scrollRafId = 0
    }
    this.spySuppressed = false
    this.dragging = false
    this.dragPointerId = null
    this.dragIndex = -1
  }

  /** 滚动联动：高亮最近一个「顶部越过分节头检测线」的分节；key 变化时派发 oas-change */
  private handleScroll = (): void => {
    if (this.spySuppressed) return
    const idx = this.computeCurrent()
    this.applyActive(idx, true)
  }

  private computeCurrent(): number {
    const len = this.sections.length
    if (len === 0) return -1
    const root = this.spyRoot()
    const threshold = root === window ? 1 : (this.listEl?.getBoundingClientRect().top ?? 0) + 1
    const tops: number[] = []
    for (let i = 0; i < len; i++) tops.push(this.sectionEls[i]!.getBoundingClientRect().top)
    // 未布局 / 全部重合（无高度信息）：回退首分节，避免误判为最后一个
    if (len > 1 && tops[len - 1]! <= tops[0]! + 1) return 0
    let idx = 0
    for (let i = 0; i < len; i++) {
      if (tops[i]! <= threshold) idx = i
      else break
    }
    return idx
  }

  private applyActive(index: number, emit: boolean): void {
    const key = index >= 0 ? this.sections[index]?.key : null
    if (key == null || key === this.activeKey) return
    this.activeKey = key
    this.renderActive()
    if (emit && this.initialized) this.emit('change', { key })
  }

  private jumpTo(index: number, emit: boolean): void {
    const section = this.sections[index]
    if (!section) return
    const root = this.spyRoot()
    const target = root === window ? this.docTop(index) : this.contentTop(index)
    this.smoothScrollTo(root, target)
    this.focusIndex = index
    this.syncRoving()
    this.applyActive(index, emit)
  }

  /** 分节相对列表内容的顶部偏移（列表滚动坐标系） */
  private contentTop(index: number): number {
    const list = this.listEl
    if (!list) return 0
    const listRect = list.getBoundingClientRect()
    const secRect = this.sectionEls[index]!.getBoundingClientRect()
    return secRect.top - listRect.top + list.scrollTop
  }

  /** 分节相对文档的顶部偏移（视口滚动坐标系） */
  private docTop(index: number): number {
    return this.sectionEls[index]!.getBoundingClientRect().top + (window.scrollY || 0)
  }

  private readScroll(root: HTMLElement | Window): number {
    return root === window ? window.scrollY || 0 : (root as HTMLElement).scrollTop
  }

  private writeScroll(root: HTMLElement | Window, y: number): void {
    const target = Math.max(0, y)
    if (root === window) window.scrollTo?.(0, target)
    else (root as HTMLElement).scrollTop = target
  }

  /** 平滑滚动到 y（prefers-reduced-motion 下瞬跳）；取消上一次未完成动画，避免多条 rAF 互抢 */
  private smoothScrollTo(root: HTMLElement | Window, y: number): void {
    const from = this.readScroll(root)
    const to = Math.max(0, y)
    if (prefersReducedMotion() || Math.abs(to - from) < 1) {
      this.writeScroll(root, to)
      return
    }
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId)
      this.scrollRafId = 0
    }
    // 动画期间抑制 scrollspy，避免高亮被途经的中间分节抢走；落定后再交回滚动联动
    this.spySuppressed = true
    const duration = 300
    const start = performance.now()
    const ease = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const step = (now: number): void => {
      const p = Math.min(1, Math.max(0, (now - start) / duration))
      this.writeScroll(root, Math.round(from + (to - from) * ease(p)))
      if (p < 1) {
        this.scrollRafId = requestAnimationFrame(step)
      } else {
        this.scrollRafId = 0
        this.spySuppressed = false
        this.handleScroll()
      }
    }
    this.scrollRafId = requestAnimationFrame(step)
  }

  // ---------- 侧栏拖拽 ----------

  private letterIndexFromPoint(clientY: number): number {
    if (this.letterEls.length === 0) return -1
    let idx = 0
    for (let i = 0; i < this.letterEls.length; i++) {
      if (clientY >= this.letterEls[i]!.getBoundingClientRect().top) idx = i
      else break
    }
    return idx
  }

  private handlePointerDown = (e: PointerEvent): void => {
    const target = (e.target as Element | null)?.closest('.letter') as HTMLButtonElement | null
    if (!target) return
    const index = this.letterEls.indexOf(target)
    if (index < 0) return
    this.dragging = true
    this.dragPointerId = e.pointerId ?? null
    this.dragIndex = index
    try {
      this.barEl?.setPointerCapture?.(e.pointerId)
    } catch {
      /* 指针不可捕获（测试/受限环境）时静默降级为无 capture 拖拽 */
    }
    this.jumpTo(index, true)
  }

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    if (this.dragPointerId !== null && e.pointerId !== undefined && e.pointerId !== this.dragPointerId) return
    const index = this.letterIndexFromPoint(e.clientY)
    if (index < 0 || index === this.dragIndex) return
    this.dragIndex = index
    this.jumpTo(index, true)
  }

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.dragging) return
    this.dragging = false
    try {
      this.barEl?.releasePointerCapture?.(e.pointerId)
    } catch {
      /* 未捕获时释放报错，忽略 */
    }
    this.dragPointerId = null
    this.dragIndex = -1
  }

  // ---------- 键盘 ----------

  private handleKey(e: KeyboardEvent): void {
    const len = this.letterEls.length
    if (len === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.focusAt(Math.min(this.focusIndex + 1, len - 1), true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.focusAt(Math.max(this.focusIndex - 1, 0), true)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.focusAt(0, true)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.focusAt(len - 1, true)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.jumpTo(this.focusIndex, true)
    }
  }

  private focusAt(index: number, focusIt: boolean): void {
    this.focusIndex = index
    this.syncRoving()
    if (focusIt) this.letterEls[index]?.focus()
  }
}
