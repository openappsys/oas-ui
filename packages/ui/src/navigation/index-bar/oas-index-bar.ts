import { OASElement } from '@oas-ui/core/oas-element'
import { isRtl } from '../../shared/direction.js'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'
import { isSsrRuntime } from '../../shared/ssr-runtime.js'
import { stableHash36 } from '../../shared/stable-id.js'

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
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .item:focus-visible,
  .letter:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
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

/** sections property 通道非法输入告警去重（同值只告警一次） */
const warnedSections = new Set<string>()

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
 *
 * a11y：列表 `role="region"`（i18n `indexBar.listLabel`）、侧栏 `role="navigation"`（`aria-label` 覆盖）；
 * 分节容器 `role="group"` + `aria-labelledby` 指向本节分节头（`role="heading"` + `aria-level="2"`）——
 * 命名必须落在有角色的容器上，无角色的 div 是 generic，名称会被 AT 丢弃。
 */
export class OASIndexBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['sections', 'height', 'sticky', 'aria-label']
  }

  private rootEl: HTMLElement | null = null
  private listEl: HTMLElement | null = null
  private barEl: HTMLElement | null = null

  private sectionsData: NormalizedSection[] = []
  private sectionEls: HTMLElement[] = []
  private letterEls: HTMLButtonElement[] = []

  /**
   * 分节数据 property 通道（读：归一后深拷贝；写：归一后回写 `sections` 属性）。
   *
   * 运行时接受数组或 JSON 字符串——Vue 等框架按「key in el」把静态 `sections` attribute 的
   * JSON 字符串直接写成 property（SPA 跳转后元素已升级），无 setter 的实例字段会被 own string
   * 覆盖且 attribute 未写入 → 数据整体丢失。非法输入按空分节处理 + devWarn 一次（同值去重）。
   */
  get sections(): IndexBarSection[] {
    return this.normalizeSections(this.rawSectionsValue()).map((s) => ({
      key: s.key,
      title: s.title,
      items: s.items.map((item) => ({ ...item })),
    }))
  }

  set sections(v: IndexBarSection[]) {
    const parsed = parseJsonArray<unknown>(v as unknown, () => this.warnInvalidSections(v as unknown))
    this.setAttribute('sections', JSON.stringify(parsed))
    if (this.hasRendered) this.update()
  }

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
  /** 程序化平滑滚动的目标 scrollTop（null = 无进行中程序化滚动；落定判定目标是否可达） */
  private spyTarget: number | null = null

  /** 拖拽态 */
  private dragging = false
  private dragPointerId: number | null = null
  private dragIndex = -1

  /**
   * 稳定实例 id：由身份属性（sections）派生（FNV-1a → base36）。
   * SSR 快照逐字节确定（同一属性输入 → 同一 header id），不再依赖模块级自增计数。
   * header id 只用于分节容器 aria-labelledby（shadow 内解析），同页实例属性相同时各自 shadow 隔离。
   * 结果按属性串缓存：header id 在 rebuild 逐节调用，不做重复哈希。
   */
  private stableIdCacheKey: string | null = null
  private stableIdCache = ''

  private stableId(): string {
    const key = this.getAttr('sections', '')
    if (this.stableIdCacheKey !== key) {
      this.stableIdCacheKey = key
      this.stableIdCache = stableHash36(key)
    }
    return this.stableIdCache
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // 升级/连接时序竞争：连接前被赋过 sections（SSR/onMounted 与模块加载的时序竞争），
    // own 属性遮蔽原型访问器 → parseSections 读 attribute 为空 → 不渲染。
    // 运行时 value 可能是分节数组，也可能是框架把静态 sections attribute 写成 property 的 JSON 字符串。
    if (Object.prototype.hasOwnProperty.call(this, 'sections')) {
      const own = (this as unknown as { sections?: unknown }).sections
      if (Array.isArray(own) || typeof own === 'string') {
        delete (this as unknown as Record<string, unknown>).sections
        // 回收首帧等价于初始渲染：不走 oas-change 派发分支。
        // （首帧 update 已把 initialized 置 true；若不重置，回收触发的第二次 update
        //  会把高亮从 null 迁到首分节并误派发 oas-change。）
        this.initialized = false
        this.sections = own as IndexBarSection[]
      }
    }
  }

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

  /** 缓存节点引用 + 绑定事件（render / hydrate / 重连共用；同 handler 重入去重） */
  private bind(): void {
    this.rootEl = this.shadow.querySelector<HTMLElement>('.root')
    this.listEl = this.shadow.querySelector<HTMLElement>('.list')
    this.barEl = this.shadow.querySelector<HTMLElement>('.bar')
    this.barEl?.addEventListener('keydown', this.onBarKeydown)
    this.barEl?.addEventListener('pointerdown', this.handlePointerDown)
    this.barEl?.addEventListener('pointermove', this.handlePointerMove)
    this.barEl?.addEventListener('pointerup', this.handlePointerUp)
    this.barEl?.addEventListener('pointercancel', this.handlePointerUp)
    // 条目/字母均用父容器委托：水合采纳的快照节点没有内联监听，委托保证交互可恢复且不双绑
    this.listEl?.addEventListener('click', this.handleListItemClick)
    this.barEl?.addEventListener('click', this.handleLetterClick)
    this.onCleanup(() => this.detachSpy())
  }

  private onBarKeydown = (e: Event): void => this.handleKey(e as KeyboardEvent)

  private handleListItemClick = (e: Event): void => {
    const target = e.target as Element | null
    const btn = target?.closest?.('button.item') as HTMLButtonElement | null
    if (!btn) return
    const sectionIndex = Number(btn.dataset.sectionIndex ?? '-1')
    const itemIndex = Number(btn.dataset.itemIndex ?? '-1')
    const section = this.sectionsData[sectionIndex]
    const item = section?.items[itemIndex]
    if (!section || !item) return
    this.emit('item-click', { value: item.value, label: item.label, section: section.key })
  }

  private handleLetterClick = (e: Event): void => {
    // 指针交互（或拖拽）由 pointerdown/move 处理；仅键盘激活（detail=0）走 click
    if ((e as MouseEvent).detail !== 0) return
    const target = e.target as Element | null
    const btn = target?.closest?.('button.letter') as HTMLButtonElement | null
    if (!btn) return
    const index = this.letterEls.indexOf(btn)
    if (index >= 0) this.jumpTo(index, true)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /**
   * 真水合：校验 SSR 快照结构（root + 分节/字母数量与数据一致）后接管，跳过 shadow 重建。
   * 采纳快照节点并恢复 sectionsData/lastSectionsRaw——update 不再 rebuild，header id（稳定 id）
   * 与 aria-labelledby 原样稳定；交互由 bind() 的父容器委托恢复。
   */
  protected override hydrate(): boolean {
    const root = this.shadow.querySelector<HTMLElement>('.root')
    const list = this.shadow.querySelector<HTMLElement>('.list')
    const bar = this.shadow.querySelector<HTMLElement>('.bar')
    if (!root || !list || !bar) return false
    this.parseSections()
    const sections = [...list.querySelectorAll<HTMLElement>('.section')]
    const letters = [...bar.querySelectorAll<HTMLButtonElement>('.letter')]
    if (sections.length !== this.sectionsData.length || letters.length !== this.sectionsData.length) return false
    // 每节条目数必须与数据一致：仅比 section/letter 数量会漏掉「条目缺失」的快照，
    // 接管后点击/跳转按 data-* 索引找条目会落空（静默失效）
    for (let i = 0; i < sections.length; i++) {
      const count = sections[i]!.querySelectorAll('.section-items > .item').length
      if (count !== this.sectionsData[i]!.items.length) return false
    }
    this.bind()
    this.sectionEls = sections
    this.letterEls = letters
    this.lastSectionsRaw = this.getAttr('sections', '[]')
    const focused = letters.findIndex((btn) => btn.tabIndex === 0)
    this.focusIndex = focused >= 0 ? focused : 0
    // 首帧高亮按初始位置收敛且不派发 oas-change（与 SSR render 首帧语义一致）
    this.initialized = false
    return true
  }

  /** 断开重连：滚动联动已被 onCleanup 摘除，update 会据连接态重新 attachSpy */
  protected override onReconnect(): void {
    this.bind()
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
      this.applyActive(this.sectionsData.length > 0 ? 0 : -1, false)
      this.initialized = true
    } else {
      this.applyActive(this.computeCurrent(), true)
    }
  }

  // ---------- 数据解析 ----------

  private parseSections(): void {
    this.sectionsData = this.normalizeSections(this.rawSectionsValue())
  }

  /** 读取 `sections` 属性原文并解析（非法 JSON → null，由归一化层按空分节处理） */
  private rawSectionsValue(): unknown {
    try {
      return JSON.parse(this.getAttr('sections', '[]'))
    } catch {
      return null
    }
  }

  /** 归一化分节数据：过滤非对象 / 缺 key / 重复 key / 非法 item（属性与 property 双通道共用） */
  private normalizeSections(parsed: unknown): NormalizedSection[] {
    if (!Array.isArray(parsed)) return []
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
    return out
  }

  /** 非法 sections property 输入告警（同值 / 同类型一次） */
  private warnInvalidSections(v: unknown): void {
    const key = typeof v === 'string' ? v : typeof v
    if (warnedSections.has(key)) return
    warnedSections.add(key)
    devWarn('[oas-index-bar] sections property 收到非法数据（应为分节数组或其 JSON），已按空分节处理')
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
    this.sectionsData.forEach((section, i) => list.appendChild(this.buildSection(section, i)))
    this.sectionsData.forEach((section, i) => bar.appendChild(this.buildLetter(section, i)))
    if (this.focusIndex >= this.sectionsData.length) this.focusIndex = Math.max(0, this.sectionsData.length - 1)
    this.syncRoving()
    this.renderActive()
  }

  private buildSection(section: NormalizedSection, index: number): HTMLElement {
    const sec = document.createElement('div')
    sec.className = 'section'
    sec.setAttribute('part', 'section')
    // 分节容器用 aria-labelledby 指到自己的分节头（读屏按节朗读）；无角色的 div 是
    // 「generic 禁命名」，命名会被 AT 忽略，故显式 role="group" 承接这个名称
    sec.setAttribute('role', 'group')
    const header = document.createElement('div')
    header.className = 'section-header'
    header.setAttribute('part', 'section-header')
    header.setAttribute('role', 'heading')
    header.setAttribute('aria-level', '2')
    header.id = `oas-index-bar-${this.stableId()}-h-${index}`
    header.textContent = section.title
    sec.setAttribute('aria-labelledby', header.id)
    sec.appendChild(header)
    const wrap = document.createElement('div')
    wrap.className = 'section-items'
    wrap.setAttribute('part', 'section-items')
    section.items.forEach((item, itemIndex) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.textContent = item.label
      btn.dataset.sectionIndex = String(index)
      btn.dataset.itemIndex = String(itemIndex)
      wrap.appendChild(btn)
    })
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
    bar.setAttribute('aria-label', this.getAttribute('aria-label')?.trim() || this.t('indexBar.navAriaLabel'))
    list.setAttribute('aria-label', this.t('indexBar.listLabel'))
    // RTL 标记（kanban 同款：方向判定锚 + 宿主可用的方向信号；有测试锁定，非死代码）
    this.toggleAttribute('data-rtl', isRtl(this))
  }

  private fixedHeight(): number | null {
    const n = Number.parseFloat(this.getAttr('height', ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }

  private renderActive(): void {
    this.letterEls.forEach((btn, i) => {
      const on = this.sectionsData[i]?.key === this.activeKey
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
    // SSR 渲染段不挂 window/滚动监听：扫描联动只属于升级后的客户端校正
    if (isSsrRuntime()) return
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
    this.spyTarget = null
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
    const len = this.sectionsData.length
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
    const key = index >= 0 ? this.sectionsData[index]?.key : null
    if (key == null || key === this.activeKey) return
    this.activeKey = key
    this.renderActive()
    if (emit && this.initialized) this.emit('change', { key })
  }

  private jumpTo(index: number, emit: boolean): void {
    const section = this.sectionsData[index]
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
      this.spyTarget = null
      return
    }
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId)
      this.scrollRafId = 0
    }
    // 动画期间抑制 scrollspy，避免高亮被途经的中间分节抢走；落定后再交回滚动联动
    this.spySuppressed = true
    this.spyTarget = to
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
        const target = this.spyTarget
        this.spyTarget = null
        // 落定判定：目标不可达（短内容 + 固定高度时 scrollTop 写不进去、或列表已滚到底）
        // 时保持用户选中的分节，不得跑 scrollspy——否则会算回第 0 节并二次派发 oas-change
        if (target !== null && Math.abs(this.readScroll(root) - target) > 1) return
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
