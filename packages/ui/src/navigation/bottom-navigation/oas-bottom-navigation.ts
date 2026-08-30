import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface BottomNavItem {
  label: string
  value: string
  icon?: string
  disabled?: boolean
  /** 右上角标（数字/文本，叠在 icon 上）；未设置不渲染 */
  badge?: string
}

export type BottomNavLayout = 'stacked' | 'horizontal'

const VALID_LAYOUTS: readonly BottomNavLayout[] = ['stacked', 'horizontal']
const warnedLayouts = new Set<string>()

/** 非法 layout 归一化：回落 stacked 并在 dev 下 console.warn 一次（同值去重，对齐库内惯例） */
function normalizeLayout(raw: string): BottomNavLayout {
  if ((VALID_LAYOUTS as readonly string[]).includes(raw)) return raw as BottomNavLayout
  if (!warnedLayouts.has(raw)) {
    warnedLayouts.add(raw)
    console.warn(`[oas-bottom-navigation] 非法 layout "${raw}"，已回落 stacked；合法值：stacked/horizontal`)
  }
  return 'stacked'
}

/** label 展示模式：'true'（默认，全部项显示文字）| 'active'（仅选中项显示文字，未选中项只显示 icon） */
export type BottomNavLabelMode = 'true' | 'active'

const VALID_LABEL_MODES: readonly BottomNavLabelMode[] = ['true', 'active']
const warnedLabelModes = new Set<string>()

/** 非法 show-label 归一化：回落 true 并在 dev 下 console.warn 一次（同值去重，对齐库内惯例） */
function normalizeLabelMode(raw: string): BottomNavLabelMode {
  if ((VALID_LABEL_MODES as readonly string[]).includes(raw)) return raw as BottomNavLabelMode
  if (!warnedLabelModes.has(raw)) {
    warnedLabelModes.add(raw)
    console.warn(
      `[oas-bottom-navigation] 非法 show-label "${raw}"，已回落 true；合法值：true/active`,
    )
  }
  return 'true'
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none;
}
:host(.oas-bottom-navigation--fixed) {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-fixed, 1030));
}
.tablist {
  display: flex;
  border-top: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg-elevated);
  padding: 0;
  margin: 0;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: var(--oas-bottom-navigation-height, 56px);
  padding: var(--oas-space-2) 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  transition: color var(--oas-transition-fast) var(--oas-ease-out);
}
.tab:hover {
  color: var(--oas-color-text-primary);
}
.tab[aria-selected='true'] {
  color: var(--oas-bottom-navigation-active-color, var(--oas-color-primary));
  font-weight: 500;
}
.tab[aria-disabled='true'] {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
/* 横排布局：icon 左、文字右（同一行）；icon 与文字 gap 走间距 token */
:host([data-layout='horizontal']) .tab {
  flex-direction: row;
  gap: var(--oas-space-2);
}
.tab:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.icon {
  display: inline-flex;
  font-size: 20px;
  line-height: 1;
}
.icon svg {
  display: block;
}
/* 图标定位容器：作为角标的定位锚点（badge 右上角叠在 icon 上） */
.icon-wrap {
  position: relative;
  display: inline-flex;
  line-height: 0;
}
/* 右上角标：样式走 badge 既有 token（--oas-badge-bg / --oas-badge-on-color，默认 danger） */
.tab-badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-badge-bg, var(--oas-color-danger));
  color: var(--oas-badge-on-color, var(--oas-color-text-on-danger));
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}
.tab-label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* icon-only 紧凑形态：show-label=active 时未选中项只显示 icon（label 视觉隐藏、不进无障碍树），
   选中项保留文字；可访问名由 syncState 的 aria-label 补位（取该项 label 文本，读屏不受影响） */
:host([data-show-label='active']) .tab:not([aria-selected='true']) .tab-label {
  display: none;
}
/* safe-area：仅 fixed 模式加底部安全区内边距（刘海屏 home 指示条避让），非 fixed 无效果 */
:host(.oas-bottom-navigation--fixed.oas-bottom-navigation--safe-area) .tablist {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
/* hide-on-scroll：滚动滑动收起只动 transform（不碰 layout），transition 走 token */
:host(.oas-bottom-navigation--fixed) {
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
/* 滚动隐藏态：向下滚动滑出（translateY(100%) 移出视口底部），向上滚动滑回恢复 */
:host(.oas-bottom-navigation--fixed.oas-bottom-navigation--hidden) {
  transform: translateY(100%);
}
/* 减少动效偏好：滑动收起/恢复过渡停用（对齐可访问性） */
@media (prefers-reduced-motion: reduce) {
  :host(.oas-bottom-navigation--fixed) {
    transition: none;
  }
}
`

/**
 * oas-bottom-navigation —— 移动端底部导航。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, icon?, disabled?, badge? }]`，icon 取 @oas-ui/icons 的 iconRegistry
 * - `value`：激活项 value；未设置默认激活第一个可用项
 * - `fixed`：布尔，置顶 fixed 底部（默认静态，demo 用 static + 说明）
 * - `hide-on-scroll`：布尔，需配合 `fixed`——向下滚动时导航条 `translateY(100%)` 滑出隐藏、
 *   向上滚动滑回显示（滚动差 >4px 判方向，transition 只动 transform）；纯视觉收起，
 *   不加 `aria-hidden`（tab 语义与键盘焦点保持可达），滚回即恢复；非 fixed 无效果
 * - `layout`：`stacked`（默认，icon 上文字下）/ `horizontal`（icon 左文字右，同一行）；
 *   非法值回落 stacked 并告警（同值去重）
 * - `show-label`：label 展示模式——`true`（默认，全部项显示文字）/ `active`（icon-only 紧凑形态：
 *   仅选中项显示文字，未选中项只显示 icon；label 视觉隐藏后每项 aria-label 自动写入该项 label 文本，
 *   读屏不受 CSS 隐藏影响）；非法值回落 true 并告警（同值去重）
 *
 * 事件：`oas-change` detail `{ value }`
 *
 * 语义：`role="tablist"` + 每项 `role="tab"` + `aria-selected`；
 * 键盘左右/上下移动焦点（roving tabindex，跳过 disabled），Enter/Space 选中；
 * Home/End 首尾。顶部细分隔线，激活项主色 + 图标。
 */
export class OASBottomNavigation extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value', 'fixed', 'hide-on-scroll', 'safe-area', 'layout', 'show-label']
  }

  private itemsList: BottomNavItem[] = []
  private buttons: HTMLButtonElement[] = []
  private tablist: HTMLElement | null = null
  private lastItemsRaw = ''
  private lastValueRaw: string | null = null
  private focusIndex = 0
  /** label 展示模式（CSS 钩子 data-show-label + aria-label 补位判定；update 时随属性归一化） */
  private labelMode: BottomNavLabelMode = 'true'
  /** hide-on-scroll 方向判定的滚动基线（null = 未登记，启用时以当前滚动位置为新基线） */
  private lastScrollY: number | null = null
  /** window scroll 监听是否已绑定（连接期间只绑一次，断开清理置 false，重连自动重绑） */
  private scrollBound = false
  /** 子元素通道观察器：light DOM 里 oas-bottom-navigation-item 增删或属性/文本变化 → 重解析渲染 */
  private childObserver: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist"></div>
    `
  }

  /** 缓存节点引用 + 绑定键盘导航（render 与水合路径共用） */
  private bind(): void {
    this.tablist = this.shadow.querySelector('.tablist')
    this.tablist?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（tablist 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tablist')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.classList.toggle('oas-bottom-navigation--fixed', this.hasAttr('fixed'))
    this.classList.toggle('oas-bottom-navigation--safe-area', this.hasAttr('safe-area'))
    this.syncHideOnScroll()
    // 横排布局标记（CSS 钩子）：非法值回落 stacked + dev 告警（同值去重）
    this.dataset.layout = normalizeLayout(this.getAttr('layout', 'stacked'))
    // label 展示模式标记（CSS 钩子）：非法值回落 true + dev 告警（同值去重）；
    // labelMode 供 syncState 做 aria-label 补位判定
    this.labelMode = normalizeLabelMode(this.getAttr('show-label', 'true'))
    this.dataset.showLabel = this.labelMode
    // 子元素通道观察器（重连后重建；items 属性显式时子元素被忽略，观察器空转无副作用）
    this.ensureChildObserver()
    const itemsRaw = this.getAttribute('items') ?? ''
    const itemsChanged = itemsRaw !== this.lastItemsRaw
    this.lastItemsRaw = itemsRaw
    const valueRaw = this.getAttr('value')
    const valueChanged = valueRaw !== this.lastValueRaw
    this.lastValueRaw = valueRaw
    // 双通道：items 属性显式设置时数据驱动优先；否则解析子元素收敛到同一 items 模型渲染。
    // 子元素通道下 itemsRaw 恒为 ''（itemsChanged 恒 false），须每次 update 都重渲染；
    // items 通道仍走增量（raw 变化才重建，保持按钮引用供 roving 焦点）
    if (this.hasAttribute('items')) this.parseItems()
    else this.parseChildItems()
    if (itemsChanged || !this.hasAttribute('items')) {
      this.renderItems()
    } else {
      if (valueChanged) {
        // 外部改 value：roving 焦点跟随激活项
        this.focusIndex = this.resolveInitialFocus(valueRaw)
      }
      this.syncState()
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter(
            (o): o is BottomNavItem =>
              !!o &&
              typeof o === 'object' &&
              typeof (o as BottomNavItem).value === 'string' &&
              typeof (o as BottomNavItem).label === 'string',
          )
        : []
    } catch {
      this.itemsList = []
    }
  }

  // ===== 子元素声明式通道 =====

  /**
   * 子元素通道解析层：把 light DOM 的 `<oas-bottom-navigation-item>` 收敛为内部
   * itemsList 模型（与 parseItems 单一渲染路径，renderItems/syncState 无感）。
   */
  private parseChildItems(): void {
    this.itemsList = this.parseChildLevel(this.children)
  }

  /** 解析一层子元素为 BottomNavItem[]（仅识别数据载体元素，其余 light DOM 内容忽略） */
  private parseChildLevel(elements: HTMLCollection | Element[]): BottomNavItem[] {
    const items: BottomNavItem[] = []
    for (const child of Array.from(elements)) {
      if (child.tagName === 'OAS-BOTTOM-NAVIGATION-ITEM') {
        items.push(this.childToItem(child))
      }
    }
    return items
  }

  /** 单个 <oas-bottom-navigation-item> → BottomNavItem（默认插槽文本为 label，属性对齐 items 字段） */
  private childToItem(el: Element): BottomNavItem {
    const item: BottomNavItem = {
      label: (el.textContent ?? '').trim(),
      value: el.getAttribute('value') ?? '',
    }
    const icon = el.getAttribute('icon')
    if (icon) item.icon = icon
    const badge = el.getAttribute('badge')
    if (badge) item.badge = badge
    if (el.hasAttribute('disabled')) item.disabled = true
    return item
  }

  /**
   * 子元素通道观察器：只监听 light DOM 子元素（数据载体增删/属性/文本变化 → 重解析）。
   * 组件自身动作不写 light DOM，无需自引用守卫；items 属性显式时以数据驱动为准，跳过重渲染。
   * 子元素通道下 update() 每次都会重渲染（见 update 内双通道分支），回调直接走 update()。
   */
  private ensureChildObserver(): void {
    if (this.childObserver) return
    const observer = new MutationObserver(() => {
      if (this.hasAttribute('items')) return
      this.update()
    })
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['value', 'icon', 'disabled', 'badge'],
    })
    this.childObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childObserver = null
    })
  }

  private renderItems(): void {
    const tablist = this.tablist
    if (!tablist) return
    tablist.innerHTML = ''
    this.buttons = []
    this.focusIndex = this.resolveInitialFocus(this.getAttr('value'))
    for (const item of this.itemsList) {
      const btn = document.createElement('button')
      btn.className = 'tab'
      btn.setAttribute('part', 'tab')
      btn.type = 'button'
      btn.addEventListener('click', () => this.select(item))
      if (item.icon || item.badge) {
        const wrap = document.createElement('span')
        wrap.className = 'icon-wrap'
        if (item.icon) {
          const ic = this.createIcon(item.icon)
          if (ic) wrap.appendChild(ic)
        }
        if (item.badge) {
          const badge = document.createElement('span')
          badge.className = 'tab-badge'
          badge.setAttribute('part', 'badge')
          badge.textContent = item.badge
          wrap.appendChild(badge)
        }
        btn.appendChild(wrap)
      }
      const label = document.createElement('span')
      label.className = 'tab-label'
      label.textContent = item.label
      btn.appendChild(label)
      this.buttons.push(btn)
      tablist.appendChild(btn)
    }
    this.syncState()
  }

  private syncState(): void {
    const tablist = this.tablist
    if (!tablist) return
    tablist.setAttribute('role', 'tablist')
    tablist.setAttribute('aria-label', this.t('bottomNavigation.nav'))
    const activeIdx = this.activeIndex()
    this.buttons.forEach((btn, i) => {
      const item = this.itemsList[i]
      if (!item) return
      const isSelected = i === activeIdx && !item.disabled
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(isSelected))
      btn.setAttribute('aria-disabled', String(item.disabled ?? false))
      // icon-only 形态 a11y 补位：active 模式未选中项 label 被 CSS display:none 隐藏
      // （不进无障碍树），每项可访问名改由 aria-label 承载（取该项 label 文本）
      if (this.labelMode === 'active' && item.label) {
        btn.setAttribute('aria-label', item.label)
      } else {
        btn.removeAttribute('aria-label')
      }
      if (item.disabled) btn.tabIndex = -1
      else btn.tabIndex = i === this.focusIndex ? 0 : -1
    })
  }

  private activeIndex(): number {
    const selected = this.getAttr('value')
    if (selected) {
      const idx = this.itemsList.findIndex((it) => it.value === selected && !it.disabled)
      if (idx >= 0) return idx
    }
    const first = this.itemsList.findIndex((it) => !it.disabled)
    return first >= 0 ? first : 0
  }

  // ===== hide-on-scroll 滚动隐藏（仅 fixed 模式） =====

  /**
   * hide-on-scroll 状态同步：仅 fixed + hide-on-scroll 同时存在时生效。
   * 关闭时移除 hidden 类并复位滚动基线；启用时绑定 window scroll 监听并登记新基线
   * （重连/属性增删后基线重设，避免方向误判）。
   *
   * aria 语义：隐藏是**纯视觉收起**（translateY 滑出视口），不加 aria-hidden——
   * tab 语义与键盘焦点保持可达，滚回即恢复，对齐「视觉隐藏而非语义移除」。
   */
  private syncHideOnScroll(): void {
    const enabled = this.hasAttr('fixed') && this.hasAttr('hide-on-scroll')
    if (!enabled) {
      this.classList.remove('oas-bottom-navigation--hidden')
      this.lastScrollY = null
      return
    }
    this.ensureScrollListener()
    if (this.lastScrollY === null) this.lastScrollY = window.scrollY
  }

  /** window scroll 监听（passive）：连接期间只绑一次，断开经 onCleanup 移除，重连自动重绑 */
  private ensureScrollListener(): void {
    if (this.scrollBound) return
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.scrollBound = true
    this.onCleanup(() => {
      window.removeEventListener('scroll', this.handleScroll)
      this.scrollBound = false
    })
  }

  /** 滚动方向判定：滚动差 >4px 才判方向（防轻微抖动误触发）；向下滑出、向上滑回 */
  private handleScroll = (): void => {
    if (!this.hasAttr('fixed') || !this.hasAttr('hide-on-scroll')) return
    const y = window.scrollY
    if (this.lastScrollY === null) {
      this.lastScrollY = y
      return
    }
    const delta = y - this.lastScrollY
    this.lastScrollY = y
    if (Math.abs(delta) <= 4) return
    this.classList.toggle('oas-bottom-navigation--hidden', delta > 0)
  }

  private resolveInitialFocus(selected: string): number {
    const idx = this.itemsList.findIndex((it) => it.value === selected && !it.disabled)
    if (idx >= 0) return idx
    const first = this.itemsList.findIndex((it) => !it.disabled)
    return first >= 0 ? first : 0
  }

  private select(item: BottomNavItem): void {
    if (item.disabled) return
    if (this.getAttr('value') === item.value) return
    this.setAttribute('value', item.value)
    this.emit('change', { value: item.value })
    // update() 里 value 变化会令 roving 焦点跟随激活项，无需按引用反查下标
    this.update()
  }

  private handleKey(e: KeyboardEvent): void {
    const items = this.itemsList
    if (items.length === 0) return
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.move(1, enabled)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.move(-1, enabled)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const item = items[this.focusIndex]
      if (item) this.select(item)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.focusAt(enabled[0] ?? 0)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.focusAt(enabled[enabled.length - 1] ?? 0)
    }
  }

  private move(dir: 1 | -1, enabled: number[]): void {
    const cur = enabled.indexOf(this.focusIndex)
    const next = enabled[(cur + dir + enabled.length) % enabled.length]
    if (next === undefined) return
    this.focusAt(next)
  }

  private focusAt(index: number): void {
    this.focusIndex = index
    this.syncState()
    this.buttons[index]?.focus()
  }

  /** 用 iconRegistry 渲染图标（内联 SVG，跟随 currentColor） */
  private createIcon(icon: string): HTMLElement | null {
    const content = iconRegistry[icon as IconName]
    if (!content) return null
    const span = document.createElement('span')
    span.className = 'icon'
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML = content
    span.appendChild(svg)
    return span
  }
}
