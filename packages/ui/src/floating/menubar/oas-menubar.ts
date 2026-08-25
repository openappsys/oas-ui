import { OASElement } from '@oas-ui/core'
import type { MenuItem } from '../menu/index.js'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface MenubarItem extends MenuItem {
  /** Alt 访问键（可选，单字符）；缺省时取 label 首个 ASCII 字母 */
  accessKey?: string
  /** 快捷键提示（如 "Ctrl+N"）；自动绑定 document 级 keydown，命中即触发该项 select */
  shortcut?: string
  /** checkbox 半选态（仅 kind="checkbox" 项生效）：渲染 aria-checked="mixed" + 减号视觉；由宿主计算父子联动后随 items JSON 传入 */
  indeterminate?: boolean
}

function firstAscii(label?: string): string | undefined {
  const m = label?.match(/[a-zA-Z0-9]/)
  return m?.[0]
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.top-wrap {
  position: relative;
}
.top-item {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  white-space: nowrap;
}
.top-item:hover,
.top-item.active,
.top-item[aria-expanded='true'] {
  background: var(--oas-color-bg-hover);
}
.top-item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.top-item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.top-item .icon {
  margin-right: var(--oas-space-1);
}
/* ===== 竖排 menubar：bar 纵向排布，顶级项整行可点 ===== */
:host([orientation='vertical']) .bar {
  flex-direction: column;
  align-items: stretch;
}
:host([orientation='vertical']) .top-item {
  justify-content: flex-start;
  width: 100%;
}
:host([orientation='vertical']) .bar-items {
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}
:host([orientation='vertical']) .top-wrap {
  width: 100%;
}
/* ===== start/end 具名插槽（logo/头像装饰位）：有内容才显示，键盘 roving 天然跳过（非 top-item） ===== */
.bar-start,
.bar-end {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex-shrink: 0;
}
.bar-start[hidden],
.bar-end[hidden] {
  display: none;
}
.bar-start {
  margin-right: var(--oas-space-1);
}
.bar-end {
  margin-left: var(--oas-space-1);
}
/* 顶级项容器：独立 flex 行（与 start/end 插槽并存），水平溢出收纳测量以此为宽 */
.bar-items {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: 1 1 auto;
  min-width: 0;
}
/* ===== 水平溢出收纳：超宽顶级项收进「···」收纳弹层（仅水平模式） ===== */
.top-wrap[data-collapsed] {
  display: none;
}
.more-item {
  flex-shrink: 0;
}
/* 选中项被收纳时「···」高亮：与条上选中项同风格 */
.more-item.child-selected {
  color: var(--oas-color-primary);
  font-weight: 500;
}
/* 收纳弹层右对齐其右缘（在条末尾，向左开会超出容器右缘被裁掉）；
   与一级下拉的 side/align 类互斥——syncSubmenuPositions 对该弹层跳过几何类注入 */
.submenu.more-popup {
  left: auto;
  right: 0;
  transform-origin: top right;
}
/* ===== 整栏 disabled：降饱和 + 禁指针（键盘拦截走 JS） ===== */
:host([disabled]) .bar,
:host([disabled]) .hamburger-wrap {
  opacity: 0.5;
  pointer-events: none;
}
.submenu {
  display: none;
  list-style: none;
  margin: 0;
  padding: var(--oas-space-1);
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: var(--oas-z-dropdown, 1000);
}
.submenu.open {
  display: block;
}
/* 级联子菜单：向右浮出 */
.submenu .submenu {
  top: calc(-1 * var(--oas-space-1));
  left: 100%;
}
/* 视口边界翻转（JS 检测后切类）：级联子菜单右侧不足向左展开；一级下拉右缘不足右对齐；底部不足向上 */
.submenu .submenu.flip-left {
  left: auto;
  right: 100%;
}
.submenu.flip-right {
  left: auto;
  right: 0;
}
.submenu.flip-up {
  top: auto;
  bottom: 100%;
}
.submenu .submenu.flip-up {
  top: auto;
  bottom: calc(-1 * var(--oas-space-1));
}
/* ===== 一级下拉：side/align/offset 定位（--popup-offset 由 JS 内联注入） ===== */
.submenu.popup-first.side-top {
  top: auto;
  bottom: calc(100% + var(--popup-offset, 4px));
}
.submenu.popup-first.side-bottom {
  top: calc(100% + var(--popup-offset, 4px));
  bottom: auto;
}
.submenu.popup-first.side-right {
  left: calc(100% + var(--popup-offset, 4px));
  top: 0;
  right: auto;
}
.submenu.popup-first.side-left {
  left: auto;
  right: calc(100% + var(--popup-offset, 4px));
  top: 0;
}
/* align：仅对水平弹出的下拉生效（side top/bottom） */
.submenu.popup-first.side-top.align-start,
.submenu.popup-first.side-bottom.align-start {
  left: 0;
  right: auto;
}
.submenu.popup-first.side-top.align-center,
.submenu.popup-first.side-bottom.align-center {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}
.submenu.popup-first.side-top.align-end,
.submenu.popup-first.side-bottom.align-end {
  left: auto;
  right: 0;
}
/* align：竖弹（side left/right）沿垂直轴对齐 */
.submenu.popup-first.side-left.align-center,
.submenu.popup-first.side-right.align-center {
  top: 50%;
  transform: translateY(-50%);
}
.submenu.popup-first.side-left.align-end,
.submenu.popup-first.side-right.align-end {
  top: auto;
  bottom: 0;
}
/* 一级下拉视口翻转（offset 感知；align-center 翻转时清除 translate 防偏移） */
.submenu.popup-first.side-bottom.flip-right,
.submenu.popup-first.side-top.flip-right {
  left: auto;
  right: 0;
}
.submenu.popup-first.side-right.flip-left {
  left: auto;
  right: calc(100% + var(--popup-offset, 4px));
}
.submenu.popup-first.side-left.flip-right {
  right: auto;
  left: calc(100% + var(--popup-offset, 4px));
}
.submenu.popup-first.flip-up {
  top: auto;
  bottom: calc(100% + var(--popup-offset, 4px));
}
.submenu.popup-first.flip-down {
  bottom: auto;
  top: calc(100% + var(--popup-offset, 4px));
}
/* ===== 方向感知动画：开口方向（transform-origin 由 JS 注入）+ 缩放淡入 ===== */
.submenu.open {
  animation: oas-menubar-pop var(--oas-transition-base) var(--oas-ease-out);
}
@keyframes oas-menubar-pop {
  from {
    opacity: 0;
    scale: 0.96;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .submenu.open {
    animation: none;
  }
}
/* ===== show-arrow：一级下拉弹出层指向触发器的视觉箭头 ===== */
:host([show-arrow]) .submenu.popup-first::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--oas-color-bg);
  z-index: -1;
}
:host([show-arrow]) .submenu.popup-first.side-bottom::before {
  top: -6px;
  border-left: 1px solid var(--oas-color-border);
  border-top: 1px solid var(--oas-color-border);
  transform: rotate(45deg);
}
:host([show-arrow]) .submenu.popup-first.side-bottom.align-start::before {
  left: 12px;
}
:host([show-arrow]) .submenu.popup-first.side-bottom.align-center::before {
  left: 50%;
  margin-left: -5px;
}
:host([show-arrow]) .submenu.popup-first.side-bottom.align-end::before {
  left: auto;
  right: 12px;
}
:host([show-arrow]) .submenu.popup-first.side-top::before {
  bottom: -6px;
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
  transform: rotate(45deg);
}
/* side-top 的 align 定位（与 side-bottom 对称）：缺省无 left/right 时 position:absolute
   落在面板内容起始位（左缘附近），右对齐触发器时箭头会偏左不指触发器 */
:host([show-arrow]) .submenu.popup-first.side-top.align-start::before {
  left: 12px;
}
:host([show-arrow]) .submenu.popup-first.side-top.align-center::before {
  left: 50%;
  margin-left: -5px;
}
:host([show-arrow]) .submenu.popup-first.side-top.align-end::before {
  left: auto;
  right: 12px;
}
:host([show-arrow]) .submenu.popup-first.side-right::before {
  left: -6px;
  top: 50%;
  margin-top: -5px;
  border-top: 1px solid var(--oas-color-border);
  border-right: 1px solid var(--oas-color-border);
  transform: rotate(45deg);
}
:host([show-arrow]) .submenu.popup-first.side-left::before {
  right: -6px;
  top: 50%;
  margin-top: -5px;
  border-bottom: 1px solid var(--oas-color-border);
  border-left: 1px solid var(--oas-color-border);
  transform: rotate(45deg);
}
.subitem {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  white-space: nowrap;
}
.subitem .label {
  flex: 1;
  min-width: 0;
  text-align: left;
}
.subitem:hover,
.subitem.active {
  background: var(--oas-color-bg-hover);
}
.subitem[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.subitem[aria-checked='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
/* danger 破坏性项：红色语义（文字+图标同色系） */
.subitem.danger {
  color: var(--oas-color-danger);
}
.subitem.danger:hover,
.subitem.danger.active {
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
  color: var(--oas-color-danger);
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  color: inherit;
}
.subitem .icon {
  margin-right: var(--oas-space-2);
}
.icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.check {
  opacity: 0;
}
.subitem[aria-checked='true'] .check {
  opacity: 1;
}
/* checkbox 勾选框：方块边框（未勾空框、勾选主色填充+✓），与 radio 的 ✓ 区分 */
.check--box {
  width: 14px;
  height: 14px;
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 1;
}
.subitem[role='menuitemcheckbox'][aria-checked='true'] .check--box {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.subitem[role='menuitemcheckbox'][aria-checked='true'] .check--box::after {
  content: '✓';
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xs);
  line-height: 1;
}
/* checkbox 半选态（indeterminate）：aria-checked="mixed" → 主色方块 + 居中横线减号（原创 CSS，token 取色） */
.subitem[role='menuitemcheckbox'][aria-checked='mixed'] .check--box {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.subitem[role='menuitemcheckbox'][aria-checked='mixed'] .check--box::before {
  content: '';
  width: 8px;
  height: 2px;
  background: var(--oas-color-text-on-primary);
  border-radius: 1px;
}
.shortcut {
  margin-left: var(--oas-space-3);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  font-family: var(--oas-font-family-mono, monospace);
  color: var(--oas-color-text-secondary);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-xs);
  background: var(--oas-color-bg-hover);
  line-height: 1.6;
  flex-shrink: 0;
}
.arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  flex-shrink: 0;
}
.arrow svg {
  display: block;
  width: 1em;
  height: 1em;
}
.group {
  list-style: none;
  margin-top: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-3);
  cursor: default;
}
.group:first-child {
  margin-top: 0;
}
.group-label {
  display: block;
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
.divider {
  list-style: none;
  height: 1px;
  margin: var(--oas-space-1) 0;
  background: var(--oas-color-border);
  cursor: default;
}
/* ===== 移动端汉堡收纳（breakpoint 生效时 bar 隐藏、汉堡按钮+弹出面板接管） ===== */
.hamburger-wrap {
  position: relative;
  display: none;
}
:host(.oas-menubar--mobile) .bar {
  display: none;
}
:host(.oas-menubar--mobile) .hamburger-wrap {
  display: inline-block;
}
.hamburger {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.hamburger:hover {
  background: var(--oas-color-bg-hover);
}
.hamburger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.hamburger .icon {
  width: 1.25em;
  height: 1.25em;
  margin: 0;
}
.hamburger-panel {
  min-width: 180px;
}
`

export class OASMenubar extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'items',
      'value',
      'open',
      'trigger',
      'loop',
      'disabled',
      'side',
      'align',
      'offset',
      'show-arrow',
      'close-on-select',
      'orientation',
      'breakpoint',
    ]
  }

  private itemsList: MenubarItem[] = []
  private barEl: HTMLElement | null = null
  private hamburgerBtn: HTMLButtonElement | null = null
  private hamburgerPanel: HTMLElement | null = null
  /** 上次解析的 items 属性原文，未变化时跳过全量重建（value 变化只增量同步勾选） */
  private lastItemsAttr: string | null = null
  /** 键盘导航当前层级的祖先 value 链（空 = 顶级菜单行） */
  private activeStack: string[] = []
  private activeIndex = 0
  private expanded = new Set<string>()
  private keyboardMode = false
  /** 移动端汉堡面板打开态（独立于 expanded——expanded 只表达级联展开路径） */
  private hamburgerOpen = false
  /** 移动端模式（breakpoint 命中）：bar 隐藏、汉堡接管 */
  private mobileMode = false
  private mobileMq: MediaQueryList | null = null
  private mobileMqQuery = ''
  /** 上一次顶级打开值（null = 未初始化，首帧不派发 oas-open-change，同 tooltip/popover/dropdown） */
  private prevOpenValue: string | null = null
  /** typeahead 字符缓冲（连续输入定位匹配项）+ 超时定时器 */
  private typeaheadBuffer = ''
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null
  /** 水平溢出收纳：被收纳顶级项的 value 列表（弹层镜像 + 键盘导航用） */
  private collapsedValues: string[] = []
  /** 水平溢出收纳项「···」的容器引用（渲染时捕获，syncOverflowCollapse 更新显隐与弹层内容） */
  private moreItemEl: HTMLElement | null = null
  /** 水平溢出收纳的 ResizeObserver（容器宽度变化时重算收纳） */
  private overflowObserver: ResizeObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="menubar">
        <div class="bar-start" part="bar-start" role="presentation" hidden><slot name="start"></slot></div>
        <div class="bar-items" part="bar-items"></div>
        <div class="bar-end" part="bar-end" role="presentation" hidden><slot name="end"></slot></div>
      </div>
      <div class="hamburger-wrap">
        <button type="button" class="hamburger" part="hamburger" aria-haspopup="menu" aria-expanded="false"></button>
        <ul class="submenu hamburger-panel" part="submenu" role="menu"></ul>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.barEl = this.shadow.querySelector('.bar')
    this.hamburgerBtn = this.shadow.querySelector<HTMLButtonElement>('.hamburger')
    this.hamburgerPanel = this.shadow.querySelector('.hamburger-panel')
    // 汉堡按钮图标（iconRegistry 的 menu 图标，原创 SVG 路径）
    if (this.hamburgerBtn) {
      const ic = this.createIcon('menu')
      if (ic) this.hamburgerBtn.appendChild(ic)
      this.hamburgerBtn.setAttribute('aria-label', this.t('menubar.menu'))
    }
    this.barEl?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.hamburgerPanel?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 鼠标移出整个菜单栏时收起所有浮层
    this.barEl?.addEventListener('mouseleave', () => {
      if (this.expanded.size === 0 && this.activeStack.length === 0) return
      this.activeStack = []
      this.expanded.clear()
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
    })
    // 移动端：鼠标移出汉堡面板收起级联（保留面板本身）
    this.hamburgerPanel?.addEventListener('mouseleave', () => {
      if (!this.hamburgerOpen) return
      this.expanded.clear()
      this.activeStack = []
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
    })
    this.hamburgerBtn?.addEventListener('click', () => {
      this.keyboardMode = false
      if (this.isBarDisabled()) return
      this.toggleHamburger()
    })
    this.hamburgerBtn?.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent
      if (ev.key !== 'ArrowDown' && ev.key !== 'Enter' && ev.key !== ' ') return
      ev.preventDefault()
      if (this.isBarDisabled()) return
      this.keyboardMode = true
      this.toggleHamburger(true)
      this.activeIndex = 0
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
    })
    // 移动端外部点击关闭汉堡面板
    document.addEventListener('pointerdown', this.handleDocumentPointerDown)
    this.onCleanup(() =>
      document.removeEventListener('pointerdown', this.handleDocumentPointerDown),
    )
    document.addEventListener('keydown', this.handleDocumentKey)
    this.onCleanup(() => document.removeEventListener('keydown', this.handleDocumentKey))
    // typeahead 缓冲定时器：断开连接时清理，避免残留
    this.onCleanup(() => {
      if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer)
      this.typeaheadTimer = null
    })
    // 水平溢出收纳：仅水平模式容器宽度变化时重算（竖排/移动端汉堡不收纳）
    if (typeof ResizeObserver !== 'undefined') {
      this.overflowObserver = new ResizeObserver(() => this.syncOverflowCollapse())
      this.overflowObserver.observe(this)
      this.onCleanup(() => this.overflowObserver?.disconnect())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（bar 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.bar')) return false
    this.bind()
    // 快照可能烤有零宽环境的误判收纳态（或宿主宽度与快照期不同）——
    // 水合后等真实布局重算一次（update 的 rAF 重算不覆盖 hydrate 路径）
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (this.isConnected) this.syncOverflowCollapse()
      })
    }
    return true
  }

  protected override update(): void {
    // items 变化才全量重建；value 等属性变化走下方增量同步（勾选/展开/激活/roving）
    const itemsAttr = this.getAttr('items', '[]')
    if (itemsAttr !== this.lastItemsAttr) {
      this.lastItemsAttr = itemsAttr
      this.parseItems()
      this.pruneState()
      this.renderMenubar()
    }
    this.barEl?.setAttribute('aria-label', this.t('menubar.label'))
    this.barEl?.setAttribute('aria-disabled', String(this.isBarDisabled()))
    this.syncOrientation()
    this.syncBarSlots()
    this.syncOpenFromAttr()
    // 顶级打开值迁移 → oas-open-change（受控 setAttribute 与 click/hover/键盘触发都会走到这里）
    const openValue = this.openTopValue()
    if (this.prevOpenValue !== null && this.prevOpenValue !== openValue) {
      this.emit('open-change', { value: openValue, open: openValue !== '' })
    }
    this.prevOpenValue = openValue
    this.syncSelection()
    this.syncMobileMode()
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
    // 渲染后检测水平溢出收纳（仅水平模式）；requestAnimationFrame 等 flex 布局完成
    // （update 在 render 后但布局可能未完成，此时 clientWidth/offsetWidth 不可靠）
    if (this.getAttr('orientation') !== 'vertical' && !this.mobileMode) {
      requestAnimationFrame(() => this.syncOverflowCollapse())
    }
  }

  /** start/end 具名插槽容器：有内容才显示（logo/头像位；键盘 roving 天然跳过——非 [part="top-item"]） */
  private syncBarSlots(): void {
    if (!this.shadow) return
    for (const name of ['start', 'end']) {
      const wrap = this.shadow.querySelector<HTMLElement>(`[part="bar-${name}"]`)
      if (!wrap) continue
      wrap.hidden = this.querySelectorAll(`[slot="${name}"]`).length === 0
    }
  }

  /** 竖排形态类（供 CSS 与测试定位） */
  private syncOrientation(): void {
    this.barEl?.classList.toggle('vertical', this.getAttr('orientation') === 'vertical')
  }

  /** open 属性受控：驱动内部展开状态。顶级未变时保留级联展开；值变化才整体切换 */
  private syncOpenFromAttr(): void {
    const raw = this.getAttr('open', '')
    const currentTop = this.openTopValue()
    if (raw === '') {
      if (currentTop !== '') {
        this.expanded.clear()
        this.activeStack = []
      }
      return
    }
    if (currentTop === raw) return
    const chain = this.chainOf(raw)
    if (chain.length === 0) return // 无效值忽略
    this.expanded = new Set(chain)
    this.activeStack = chain.slice(0, -1)
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is MenubarItem => {
            if (!i || typeof i !== 'object') return false
            if (i.type === 'divider') return true
            if (i.type === 'group') return Array.isArray(i.children)
            return typeof i.value === 'string'
          })
        : []
    } catch {
      this.itemsList = []
    }
  }

  /** 数据变化后清理失效的展开/导航状态 */
  private pruneState(): void {
    const valid = new Set<string>()
    const collect = (items: MenuItem[]): void => {
      for (const i of items) {
        if (i.value != null) valid.add(i.value)
        if (i.children) collect(i.children)
      }
    }
    collect(this.itemsList)
    for (const v of [...this.expanded]) {
      if (!valid.has(v)) this.expanded.delete(v)
    }
    this.activeStack = this.activeStack.filter((v) => valid.has(v))
    const n = this.topItems().length
    if (n === 0) {
      this.activeIndex = 0
      return
    }
    if (this.activeIndex >= n) this.activeIndex = 0
  }

  /** 顶级菜单项（当前解析后的数据） */
  private topItems(): MenubarItem[] {
    return this.itemsList
  }

  /** 整栏 disabled（组件语义）：顶级/子项/键盘/shortcut/accessKey 全部拦截 */
  private isBarDisabled(): boolean {
    return this.hasAttr('disabled')
  }

  /** loop 循环导航开关：缺省 true（保持既有循环行为），仅显式 "false" 关闭 */
  private loopEnabled(): boolean {
    return this.getAttr('loop', '') !== 'false'
  }

  /** 弹出侧：显式 side 属性优先；缺省水平=bottom、竖排=right */
  private popupSide(): string {
    const s = this.getAttr('side', '')
    if (s) return s
    return this.getAttr('orientation') === 'vertical' ? 'right' : 'bottom'
  }

  /** 弹出对齐：缺省 start */
  private popupAlign(): string {
    const a = this.getAttr('align', '')
    return a || 'start'
  }

  /** 弹出偏移（px）：缺省 4 */
  private popupOffset(): number {
    const raw = this.getAttr('offset', '')
    if (raw === '') return 4
    const n = Number(raw)
    return Number.isFinite(n) ? n : 4
  }

  /** 当前键盘导航层级的可导航项（group 内联展开，divider/组标题跳过）；
      水平模式顶级追加「···」收纳项（overflow 收纳的顶级项在弹层内展开） */
  private currentItems(): MenuItem[] {
    let items: MenuItem[] = this.itemsList
    for (const v of this.activeStack) {
      if (v === '__more__') {
        // 收纳弹层层级：返回被收纳的顶级项（镜像数据，与 DOM 弹层镜像一一对应）
        return this.flattenLevel(
          this.itemsList.filter((i) => i.value != null && this.collapsedValues.includes(i.value)),
        )
      }
      const parent = items.find((i) => i.value === v)
      if (!parent || !parent.children) return []
      items = parent.children
    }
    const flat = this.flattenLevel(items)
    const more = this.morePseudoItem()
    if (more) flat.push(more as MenuItem)
    return flat
  }

  /** 收纳项「···」的伪数据项：仅水平模式且有被收项时存在（children = 被收顶级项） */
  private morePseudoItem(): MenubarItem | null {
    if (this.mobileMode) return null
    if (this.getAttr('orientation') === 'vertical') return null
    if (this.collapsedValues.length === 0) return null
    return {
      label: '···',
      value: '__more__',
      children: this.itemsList.filter(
        (i) => i.value != null && this.collapsedValues.includes(i.value),
      ),
    }
  }

  /** 收纳弹层 DOM 元素（键盘导航在弹层内时的查询作用域） */
  private moreSubmenu(): HTMLElement | null {
    return (
      this.shadow?.querySelector<HTMLElement>('[part="submenu"][data-parent="__more__"]') ?? null
    )
  }

  private flattenLevel(items: MenuItem[]): MenuItem[] {
    const flat: MenuItem[] = []
    const walk = (list: MenuItem[]): void => {
      for (const i of list) {
        if (i.type === 'divider') continue
        if (i.type === 'group') {
          if (i.children) walk(i.children)
          continue
        }
        flat.push(i)
      }
    }
    walk(items)
    return flat
  }

  private chainOf(value: string): string[] {
    const chain: string[] = []
    const walk = (items: MenuItem[], trail: string[]): boolean => {
      for (const item of items) {
        if (item.value === value) {
          chain.push(...trail, value)
          return true
        }
        if (item.children) {
          const nextTrail = item.value != null ? [...trail, item.value] : trail
          if (walk(item.children, nextTrail)) return true
        }
      }
      return false
    }
    walk(this.itemsList, [])
    return chain
  }

  private findItem(value: string): MenuItem | undefined {
    let found: MenuItem | undefined
    const walk = (items: MenuItem[]): void => {
      for (const item of items) {
        if (item.value === value) found = item
        else if (item.children) walk(item.children)
      }
    }
    walk(this.itemsList)
    return found
  }

  /** 当前打开/激活路径的顶级菜单 value（activeStack 首位，缺省取 expanded 首值） */
  private openTopValue(): string {
    if (this.activeStack.length > 0) return this.activeStack[0]!
    const first = [...this.expanded][0]
    return first ?? ''
  }

  /** 当前激活子菜单所在顶级项的索引（键盘上下文）；收纳弹层内指向「···」收纳项 */
  private parentTopIndex(): number {
    const first = this.activeStack[0]
    if (first == null) return -1
    if (first === '__more__') return this.topLevelItems().length - 1
    return this.topItems().findIndex((i) => i.value === first)
  }

  /** 顶级导航项（含收纳项「···」，若存在）——键盘/焦点索引统一以此为准 */
  private topLevelItems(): MenuItem[] {
    const flat = this.flattenLevel(this.itemsList)
    const more = this.morePseudoItem()
    if (more) flat.push(more as MenuItem)
    return flat
  }

  /** 全量渲染一次（含所有子菜单与汉堡面板），显隐由 .open class 控制，不随 hover 重建 */
  private renderMenubar(): void {
    const barEl = this.barEl
    if (!barEl) return
    const itemsEl = barEl.querySelector<HTMLElement>('.bar-items')
    const container = itemsEl ?? barEl
    container.innerHTML = ''
    this.itemsList.forEach((item, idx) => {
      const wrap = document.createElement('div')
      wrap.className = 'top-wrap'
      // wrap 带 data-value 供水平溢出收纳测量/镜像定位（键盘按钮 data-value 只供 roving 定位）
      if (item.value != null) wrap.dataset.value = item.value
      const hasChildren = !!item.children?.length
      // 叶子项带 href 渲染为 <a>（真链接：SEO/中键新开/右键新窗口天然可用），保留 oas-select 派发
      const btn = document.createElement(hasChildren || !item.href ? 'button' : 'a')
      btn.className = 'top-item'
      btn.setAttribute('part', 'top-item')
      if (!hasChildren && item.href) {
        btn.setAttribute('href', item.href)
        if (item.target) btn.setAttribute('target', item.target)
        if (item.target === '_blank') {
          if (!item.rel) btn.setAttribute('rel', 'noopener')
          else if (!/\bnoopener\b/i.test(item.rel)) btn.setAttribute('rel', `${item.rel} noopener`)
        }
      }
      btn.setAttribute('type', 'button')
      btn.setAttribute('role', 'menuitem')
      btn.setAttribute('aria-haspopup', 'menu')
      btn.setAttribute('aria-expanded', 'false')
      btn.setAttribute('tabindex', '-1')
      btn.setAttribute('aria-disabled', String((item.disabled ?? false) || this.isBarDisabled()))
      if (item.value != null) btn.dataset.value = item.value
      if (item.label) btn.setAttribute('aria-label', item.label)
      if (item.icon) {
        const ic = this.createIcon(item.icon)
        if (ic) btn.appendChild(ic)
      }
      if (item.label) btn.append(document.createTextNode(item.label))
      btn.addEventListener('focus', () => {
        this.activeIndex = idx
        this.syncActive()
      })
      btn.addEventListener('click', () => {
        this.keyboardMode = false
        if (item.disabled || this.isBarDisabled()) return
        if (item.children?.length) this.toggleExpand(item.value ?? '')
        else this.select(item)
      })
      btn.addEventListener('mouseenter', () => {
        this.keyboardMode = false
        if (item.disabled || this.isBarDisabled()) return
        // click 首开语义：无开态时 hover 不展开（需点击首开）；一旦有菜单打开，hover 顶级项切换
        if (this.getAttr('trigger') === 'hover' || this.expanded.size > 0) {
          this.hoverExpand(item.value ?? '')
        }
      })
      wrap.appendChild(btn)
      if (item.children?.length) {
        const ul = document.createElement('ul')
        ul.className = 'submenu popup-first'
        ul.setAttribute('part', 'submenu')
        ul.setAttribute('role', 'menu')
        ul.dataset.parent = item.value ?? ''
        this.renderSubLevel(ul, item.children, '')
        wrap.appendChild(ul)
      }
      container.appendChild(wrap)
    })
    // 水平溢出收纳「···」：仅水平模式渲染（竖排/移动端汉堡不收纳）；默认隐藏，溢出时 syncOverflowCollapse 显示
    if (!this.mobileMode && this.getAttr('orientation') !== 'vertical') {
      const moreWrap = document.createElement('div')
      moreWrap.className = 'top-wrap'
      moreWrap.dataset.value = '__more__'
      const moreBtn = document.createElement('button')
      moreBtn.className = 'top-item more-item'
      moreBtn.setAttribute('part', 'top-item')
      moreBtn.setAttribute('type', 'button')
      moreBtn.setAttribute('role', 'menuitem')
      moreBtn.setAttribute('aria-haspopup', 'menu')
      moreBtn.setAttribute('aria-expanded', 'false')
      moreBtn.setAttribute('tabindex', '-1')
      moreBtn.dataset.value = '__more__'
      moreBtn.setAttribute('aria-label', this.t('menubar.more'))
      moreBtn.textContent = '···'
      moreBtn.hidden = true
      moreBtn.addEventListener('click', () => {
        this.keyboardMode = false
        if (this.isBarDisabled()) return
        this.toggleExpand('__more__')
      })
      moreBtn.addEventListener('mouseenter', () => {
        this.keyboardMode = false
        if (this.isBarDisabled()) return
        if (this.getAttr('trigger') === 'hover' || this.expanded.size > 0) {
          this.hoverExpand('__more__')
        }
      })
      const moreSub = document.createElement('ul')
      moreSub.className = 'submenu popup-first more-popup'
      moreSub.setAttribute('part', 'submenu')
      moreSub.setAttribute('role', 'menu')
      moreSub.dataset.parent = '__more__'
      moreWrap.appendChild(moreBtn)
      moreWrap.appendChild(moreSub)
      container.appendChild(moreWrap)
      // 初始态整体隐藏（壳 + 按钮都藏）：溢出时由 syncOverflowCollapse 显示。
      // 若只藏按钮，SSR 序列化时壳仍占位（rAF 未来得及跑），快照宽度含空壳、
      // 升级后重算隐藏 → 水合前后布局漂移
      moreWrap.hidden = true
      this.moreItemEl = moreWrap
    }
    // 汉堡面板内容（与 bar 同一份 items 数据，顶级项渲染为 subitem）
    if (this.hamburgerPanel) {
      this.hamburgerPanel.innerHTML = ''
      this.renderSubLevel(this.hamburgerPanel, this.itemsList, '')
    }
  }

  /**
   * 递归渲染一层子菜单。scope = 当前叶子归属的 radio 组 id（最近 `type:"group"` 祖先的
   * `value` 字段；无组为 ''）；group 递归时把组 id 传下去。checkbox 项不参与 radio 组。
   */
  private renderSubLevel(container: HTMLElement, items: MenuItem[], scope: string): void {
    for (const item of items) {
      if (item.type === 'divider') {
        const li = document.createElement('li')
        li.className = 'divider'
        li.setAttribute('part', 'divider')
        li.setAttribute('role', 'separator')
        // aria-hidden 与 role=separator 语义互斥（同设会让 role 对 AT 失效），只保留 role
        container.appendChild(li)
        continue
      }
      if (item.type === 'group') {
        const li = document.createElement('li')
        li.className = 'group'
        li.setAttribute('role', 'none')
        const label = document.createElement('span')
        label.className = 'group-label'
        label.textContent = item.label ?? ''
        li.appendChild(label)
        container.appendChild(li)
        // 组 id = 该 group 的 value；未声明 value 的 group 不改变作用域（沿用外层）
        const nextScope = item.value != null ? item.value : scope
        if (item.children) this.renderSubLevel(container, item.children, nextScope)
        continue
      }
      const hasChildren = !!item.children && item.children.length > 0
      const action = !hasChildren && item.kind === 'action'
      const checkbox = !hasChildren && item.kind === 'checkbox'
      // 叶子项带 href 渲染为 <a>（真链接语义），有子菜单的父项仍是 li
      const li = document.createElement(!hasChildren && item.href ? 'a' : 'li') as HTMLElement
      li.className = 'subitem'
      li.setAttribute('part', 'item')
      li.setAttribute(
        'role',
        hasChildren
          ? 'menuitem'
          : action
            ? 'menuitem'
            : checkbox
              ? 'menuitemcheckbox'
              : 'menuitemradio',
      )
      li.setAttribute('tabindex', '-1')
      if (!hasChildren && item.href) {
        li.setAttribute('href', item.href)
        if (item.target) li.setAttribute('target', item.target)
        if (item.target === '_blank') {
          if (!item.rel) li.setAttribute('rel', 'noopener')
          else if (!/\bnoopener\b/i.test(item.rel)) li.setAttribute('rel', `${item.rel} noopener`)
        }
      }
      if (item.value != null) li.dataset.value = item.value
      li.setAttribute('aria-disabled', String((item.disabled ?? false) || this.isBarDisabled()))
      if (item.label) li.setAttribute('aria-label', item.label)
      // 组作用域标记：radio 叶子带所在组 id（无组为 ''），checkbox/action 不参与 radio 组
      if (!hasChildren && !action && !checkbox) li.dataset.scope = scope
      if (item.danger) li.classList.add('danger')
      if (item.icon) {
        const ic = this.createIcon(item.icon)
        if (ic) li.appendChild(ic)
      }
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = item.label ?? ''
      if (hasChildren) {
        li.setAttribute('aria-haspopup', 'menu')
        li.setAttribute('aria-expanded', 'false')
        li.appendChild(label)
        li.append(this.createChevron())
        li.addEventListener('click', () => {
          this.keyboardMode = false
          if (item.disabled || this.isBarDisabled()) return
          this.toggleExpand(item.value ?? '')
        })
        li.addEventListener('mouseenter', () => {
          this.keyboardMode = false
          if (item.disabled || this.isBarDisabled()) return
          this.hoverExpand(item.value ?? '')
        })
        const sub = document.createElement('ul')
        sub.className = 'submenu'
        sub.setAttribute('part', 'submenu')
        sub.setAttribute('role', 'menu')
        sub.dataset.parent = item.value ?? ''
        this.renderSubLevel(sub, item.children!, '')
        li.appendChild(sub)
      } else if (!action) {
        if (checkbox) {
          const mixed = (item as MenubarItem).indeterminate === true
          // 半选态由宿主数据驱动（aria-checked=mixed），DOM 标记供 syncSelection 增量同步时沿用
          if (mixed) li.dataset.mixed = 'true'
          li.setAttribute('aria-checked', mixed ? 'mixed' : String(this.isChecked(item.value)))
        } else {
          li.setAttribute('aria-checked', String(item.value === this.selectedValueOf(scope)))
        }
        const check = document.createElement('span')
        check.className = checkbox ? 'check check--box' : 'check'
        if (!checkbox) check.textContent = '✓'
        li.appendChild(check)
        li.appendChild(label)
        if ((item as MenubarItem).shortcut) {
          const kbd = document.createElement('kbd')
          kbd.className = 'shortcut'
          kbd.textContent = (item as MenubarItem).shortcut!
          li.appendChild(kbd)
        }
        li.addEventListener('click', () => {
          this.keyboardMode = false
          if (item.disabled || this.isBarDisabled()) return
          this.select(item, scope)
        })
        li.addEventListener('mouseenter', () => {
          this.keyboardMode = false
          if (item.disabled || this.isBarDisabled()) return
          this.hoverExpand(item.value ?? '')
        })
      } else {
        li.appendChild(label)
        if ((item as MenubarItem).shortcut) {
          const kbd = document.createElement('kbd')
          kbd.className = 'shortcut'
          kbd.textContent = (item as MenubarItem).shortcut!
          li.appendChild(kbd)
        }
        li.addEventListener('click', () => {
          this.keyboardMode = false
          if (item.disabled || this.isBarDisabled()) return
          this.select(item, scope)
        })
        li.addEventListener('mouseenter', () => {
          this.keyboardMode = false
          if (item.disabled || this.isBarDisabled()) return
          this.hoverExpand(item.value ?? '')
        })
      }
      container.appendChild(li)
    }
  }

  /** 用 iconRegistry 渲染图标（内联 SVG，跟随 currentColor） */
  private createIcon(icon: string, className = 'icon'): HTMLElement | null {
    const content = iconRegistry[icon as IconName]
    if (!content) return null
    const span = document.createElement('span')
    span.className = className
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

  private createChevron(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'arrow'
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML =
      '<path d="M6 4 L10 8 L6 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    span.appendChild(svg)
    return span
  }

  /**
   * value 属性解析为组作用域映射：纯字符串 → { '': value }（根作用域，兼容现有全局命中）；
   * JSON 对象（如 {"mode":"preview"}）→ 原样作为组 id → 选中值映射
   */
  private valueMap(): Record<string, string> {
    const raw = this.getAttr('value', '')
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {}
    return { '': raw }
  }

  /** 指定组作用域的选中值（无命中返回 undefined） */
  private selectedValueOf(scope: string): string | undefined {
    return this.valueMap()[scope]
  }

  /** 写回 value：仅根作用域 → 纯字符串（兼容现有）；含命名组 → JSON 对象 */
  private writeValue(map: Record<string, string>): void {
    const keys = Object.keys(map)
    if (keys.length === 1 && keys[0] === '') this.setAttribute('value', map[''] ?? '')
    else this.setAttribute('value', JSON.stringify(map))
  }

  /** checkbox 勾选集（value 为 JSON 数组时解析，否则空集） */
  private checkedSet(): Set<string> {
    const raw = this.getAttr('value', '')
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((v): v is string => typeof v === 'string'))
      }
    } catch {
      // 非数组：空勾选集
    }
    return new Set()
  }

  /** checkbox 项是否勾选（在勾选集内） */
  private isChecked(value: string | undefined): boolean {
    return value != null && this.checkedSet().has(value)
  }

  /** 键盘路径的叶子作用域：从 DOM li 的 data-scope 读取（无组为 ''） */
  private scopeOf(value: string): string {
    const li = this.shadow?.querySelector<HTMLElement>(`[part="item"][data-value="${value}"]`)
    return li?.dataset.scope ?? ''
  }

  /** value 变化 → 轻量同步叶子项勾选态（aria-checked，不重建 DOM）；action 项无勾选态 */
  private syncSelection(): void {
    if (!this.shadow) return
    const map = this.valueMap()
    const checked = this.checkedSet()
    for (const li of this.shadow.querySelectorAll<HTMLElement>('[part="item"]')) {
      // 带子菜单的项是父节点，无勾选态
      if (li.getAttribute('aria-haspopup') === 'menu') continue
      // action 项（role=menuitem 且无 data-scope）不参与勾选，不设 aria-checked
      if (li.getAttribute('role') === 'menuitem' && !li.hasAttribute('data-scope')) {
        li.removeAttribute('aria-checked')
        continue
      }
      if (li.getAttribute('role') === 'menuitemcheckbox') {
        // indeterminate（宿主数据传入，DOM 标记 dataset.mixed）→ aria-checked=mixed，不随勾选集改写
        li.setAttribute(
          'aria-checked',
          li.dataset.mixed === 'true' ? 'mixed' : String(checked.has(li.dataset.value ?? '')),
        )
        continue
      }
      const scope = li.dataset.scope ?? ''
      li.setAttribute('aria-checked', String(li.dataset.value === map[scope]))
    }
  }

  /** 展开状态 → .open class + aria-expanded（不重建 DOM）；同时写回 open 属性（非受控通道）。
      桌面模式只同步 bar 内的子菜单，移动模式只同步汉堡面板内的子菜单（另一侧 display:none 不参与，
      避免隐藏树残留 .open 干扰 openSubmenus 计数与 Tab 陷阱范围）。 */
  private syncOpen(): void {
    if (!this.shadow) return
    for (const btn of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      const open = this.expanded.has(btn.dataset.value ?? '')
      btn.setAttribute('aria-expanded', String(open))
    }
    const scope = this.mobileMode ? this.hamburgerPanel : this.barEl
    if (scope) {
      for (const ul of scope.querySelectorAll<HTMLElement>('[part="submenu"]')) {
        ul.classList.toggle('open', this.expanded.has(ul.dataset.parent ?? ''))
      }
    }
    if (this.hamburgerPanel) {
      this.hamburgerPanel.classList.toggle('open', this.hamburgerOpen)
    }
    if (this.hamburgerBtn) {
      this.hamburgerBtn.setAttribute('aria-expanded', String(this.hamburgerOpen))
    }
    // 内部展开态写回 open 属性（受控/非受控双模式：宿主可监听 oas-open-change 接管）
    const value = this.openTopValue()
    if (this.getAttr('open', '') !== value) this.setAttribute('open', value)
    this.syncSubmenuPositions()
  }

  /**
   * 子菜单视口边界翻转 + 一级下拉定位几何。翻转由样式表类表达，本方法只做测量与切类；
   * 多级嵌套逐级检测（DOM 序外层先于内层，内层 rect 反映外层翻转后的真实布局）。
   * 测量抗污染：宽度/高度一律用 offsetWidth/offsetHeight（transform 免疫）——
   * 进场动画 scale 0.96→1 会污染 getBoundingClientRect 的宽高（同帧测量取到动画起点），
   * 位置仍用 getBoundingClientRect（父项不受动画影响；子项原点即自身左上角，scale 不位移）。
   */
  private syncSubmenuPositions(): void {
    if (!this.shadow) return
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    const barRight = this.barEl?.getBoundingClientRect().right ?? vw
    for (const sub of this.shadow.querySelectorAll<HTMLElement>('[part="submenu"].open')) {
      // 级联子菜单的父项是 li；一级下拉的容器是 div（wrap），closest('li') 为 null 时回退直接父元素
      const parentItem = (sub.closest('li') ?? sub.parentElement) as HTMLElement | null
      if (!parentItem) continue
      const parentLeft = parentItem.getBoundingClientRect().left
      const itemWidth = parentItem.offsetWidth
      const subWidth = sub.offsetWidth
      const subHeight = sub.offsetHeight
      const isNested = !!parentItem.parentElement?.closest('[part="submenu"]')
      if (isNested) {
        // 级联：右侧不足向左展开、底部不足向上
        sub.classList.toggle('flip-left', parentLeft + itemWidth + subWidth > vw - margin)
        sub.classList.remove('flip-right')
        const subTop = sub.getBoundingClientRect().top
        sub.classList.toggle('flip-up', subTop + subHeight > vh - margin)
        sub.classList.remove('flip-down')
      } else {
        const side = this.popupSide()
        // 一级下拉右边界：视口与 bar 右缘取小（bar 在窄容器内被 max-width 约束时，越过 bar 会被裁）
        const rightBound = Math.min(vw, barRight) - margin
        if (side === 'right') {
          sub.classList.toggle('flip-left', parentLeft + itemWidth + subWidth > vw - margin)
          sub.classList.remove('flip-right')
        } else if (side === 'left') {
          sub.classList.toggle('flip-right', parentLeft - subWidth < margin)
          sub.classList.remove('flip-left')
        } else {
          sub.classList.toggle('flip-right', parentLeft + subWidth > rightBound)
          sub.classList.remove('flip-left')
        }
        const subTop = sub.getBoundingClientRect().top
        if (side === 'top') {
          sub.classList.toggle('flip-down', subTop < margin)
          sub.classList.remove('flip-up')
        } else {
          sub.classList.toggle('flip-up', subTop + subHeight > vh - margin)
          sub.classList.remove('flip-down')
        }
        // 翻转后清除 align-center 的 translate，避免双重位移
        if (
          sub.classList.contains('flip-up') ||
          sub.classList.contains('flip-down') ||
          sub.classList.contains('flip-left') ||
          sub.classList.contains('flip-right')
        ) {
          sub.style.transform = 'none'
        }
      }
    }
    // 一级下拉几何类（side/align/offset）+ 方向感知动画开口；收纳弹层跳过（固定右对齐 .more-popup）
    for (const sub of this.shadow.querySelectorAll<HTMLElement>('.popup-first')) {
      if (sub.dataset.parent === '__more__') continue
      const side = this.popupSide()
      const align = this.popupAlign()
      sub.classList.remove('side-top', 'side-bottom', 'side-left', 'side-right')
      sub.classList.add(`side-${side}`)
      sub.classList.remove('align-start', 'align-center', 'align-end')
      sub.classList.add(`align-${align}`)
      sub.style.setProperty('--popup-offset', `${this.popupOffset()}px`)
      sub.style.transformOrigin = this.popupOrigin(sub)
    }
    for (const sub of this.shadow.querySelectorAll<HTMLElement>('[part="submenu"].open')) {
      sub.style.transformOrigin = this.popupOrigin(sub)
    }
  }

  /** 弹出动画开口方向：一级按 side/align，级联向右（flip-left 向左）；翻转后开口反向；收纳弹层固定右上 */
  private popupOrigin(sub: HTMLElement): string {
    if (sub.dataset.parent === '__more__') {
      return sub.classList.contains('flip-up') ? 'bottom right' : 'top right'
    }
    const isNested = !!sub.parentElement?.closest('[part="submenu"]')
    if (isNested) return sub.classList.contains('flip-left') ? 'right top' : 'left top'
    const side = this.popupSide()
    const ax = this.popupAlignX()
    const flippedUp = sub.classList.contains('flip-up')
    const flippedDown = sub.classList.contains('flip-down')
    if (side === 'bottom') return flippedUp ? `bottom ${ax}` : `top ${ax}`
    if (side === 'top') return flippedDown ? `top ${ax}` : `bottom ${ax}`
    if (side === 'right') return 'left center'
    return 'right center'
  }

  private popupAlignX(): string {
    const a = this.popupAlign()
    if (a === 'center') return 'center'
    if (a === 'end') return 'right'
    return 'left'
  }

  /**
   * 水平溢出收纳：水平模式容器宽度不足时，超宽顶级项收进末尾「···」收纳弹层。
   * 仅水平模式；竖排/移动端汉堡不收纳（各自形态不需要）。
   * 测量用 offsetWidth/clientWidth（transform 免疫）；先复位再测量——collapsed 项 display:none
   * 宽为 0，直接量会把「已收纳状态」误判成「无溢出」（RO 再次触发时全部弹回）。
   */
  private syncOverflowCollapse(): void {
    const barEl = this.barEl
    if (!barEl) return
    if (this.getAttr('orientation') === 'vertical' || this.mobileMode) {
      this.collapsedValues = []
      return
    }
    const itemsEl = barEl.querySelector<HTMLElement>('.bar-items') ?? barEl
    const moreWrap = this.moreItemEl
    const topEls = [...itemsEl.querySelectorAll<HTMLElement>(':scope > .top-wrap')]
    const dataEls = topEls.filter((w) => w.dataset.value !== '__more__')
    if (dataEls.length === 0) return
    // 零宽守卫：SSR shim / 未布局环境 clientWidth=0 而项宽可读，会误判全溢出——
    // 把全部项收进「···」烤进快照，升级后无真实容器约束永远恢复不了。
    // 零宽时不判定（保持全部可见 + 收纳项隐藏），等真实布局（rAF/ResizeObserver）再算。
    if (itemsEl.clientWidth <= 0) {
      dataEls.forEach((w) => w.removeAttribute('data-collapsed'))
      this.collapsedValues = []
      if (moreWrap) {
        moreWrap.hidden = true
        const moreBtn = moreWrap.querySelector<HTMLElement>('.more-item')
        if (moreBtn) moreBtn.hidden = true
      }
      return
    }
    // 复位再测量
    dataEls.forEach((w) => w.removeAttribute('data-collapsed'))
    if (moreWrap) moreWrap.hidden = true
    // 显示收纳项量出其宽度（有溢出时它要占位，可用宽度须扣除；无溢出最后会再隐藏）
    let moreWidth = 0
    if (moreWrap) {
      moreWrap.hidden = false
      moreWidth = moreWrap.offsetWidth
      moreWrap.hidden = true
    }
    const avail = itemsEl.clientWidth
    let acc = 0
    let firstOverflow = -1
    dataEls.forEach((w, i) => {
      acc += w.offsetWidth
      if (firstOverflow === -1 && acc > avail) firstOverflow = i
    })
    let hasOverflow = firstOverflow !== -1
    if (hasOverflow && moreWidth > 0) {
      // 有溢出：收纳项自身占 moreWidth，重算首个溢出项（可用宽度 - 收纳项宽）
      const avail2 = avail - moreWidth
      acc = 0
      firstOverflow = -1
      dataEls.forEach((w, i) => {
        acc += w.offsetWidth
        if (firstOverflow === -1 && acc > avail2) firstOverflow = i
      })
      if (firstOverflow === -1) firstOverflow = dataEls.length - 1 // 兜底：至少收一项腾位
    }
    dataEls.forEach((w, i) => {
      w.toggleAttribute('data-collapsed', hasOverflow && i >= firstOverflow)
    })
    this.collapsedValues = hasOverflow
      ? dataEls
          .filter((w, i) => i >= firstOverflow)
          .map((w) => w.dataset.value ?? '')
          .filter(Boolean)
      : []
    // 收纳项「···」显隐 + 弹层内容（被收项镜像，点击选中对应 value）
    if (!moreWrap) return
    moreWrap.hidden = !hasOverflow
    const moreBtn = moreWrap.querySelector<HTMLElement>('.more-item')
    if (moreBtn) moreBtn.hidden = !hasOverflow
    const moreSub = moreWrap.querySelector<HTMLElement>('[part="submenu"]')
    if (moreSub && hasOverflow) {
      moreSub.innerHTML = ''
      for (const v of this.collapsedValues) {
        const item = this.findItem(v)
        if (item) moreSub.appendChild(this.buildMoreMirror(item))
      }
    }
    // 「···」高亮：选中项（radio 根值 / checkbox 勾选集）被收纳时，收纳项显示选中态
    // （选中项在溢出弹层里条上看不到 ✓，由收纳指示器本身高亮表达"选中项在其中"）+ aria-current 供读屏
    const checked = this.checkedSet()
    const rootValue = this.selectedValueOf('')
    const selectedInside =
      hasOverflow && this.collapsedValues.some((v) => v === rootValue || checked.has(v))
    moreBtn?.classList.toggle('child-selected', selectedInside)
    if (selectedInside) moreBtn?.setAttribute('aria-current', 'true')
    else moreBtn?.removeAttribute('aria-current')
  }

  /**
   * 收纳弹层镜像项：被收顶级项按叶子项渲染（保留 kind 语义与 href 链接）。
   * 限制记录：被收纳的含子菜单顶级项在弹层内不展开级联子菜单，按叶子项点选
   * （弹层内展开子菜单需嵌套浮层 + 焦点链翻倍，本期只支持叶子语义，与 menu 收纳行为一致）。
   */
  private buildMoreMirror(item: MenuItem): HTMLElement {
    const checkbox = item.kind === 'checkbox'
    const action = item.kind === 'action'
    const mixed = checkbox && (item as MenubarItem).indeterminate === true
    const li = document.createElement(item.href ? 'a' : 'li') as HTMLElement
    li.className = 'subitem more-mirror'
    li.setAttribute('part', 'item')
    li.setAttribute('role', action ? 'menuitem' : checkbox ? 'menuitemcheckbox' : 'menuitemradio')
    li.setAttribute('tabindex', '-1')
    if (item.href) {
      li.setAttribute('href', item.href)
      if (item.target) li.setAttribute('target', item.target)
      if (item.target === '_blank') {
        if (!item.rel) li.setAttribute('rel', 'noopener')
        else if (!/\bnoopener\b/i.test(item.rel)) li.setAttribute('rel', `${item.rel} noopener`)
      }
    }
    if (item.value != null) li.dataset.value = item.value
    if (mixed) li.dataset.mixed = 'true'
    li.setAttribute('aria-disabled', String((item.disabled ?? false) || this.isBarDisabled()))
    if (item.label) li.setAttribute('aria-label', item.label)
    if (item.danger) li.classList.add('danger')
    if (item.icon) {
      const ic = this.createIcon(item.icon)
      if (ic) li.appendChild(ic)
    }
    if (!action) {
      li.setAttribute(
        'aria-checked',
        mixed
          ? 'mixed'
          : String(checkbox ? this.isChecked(item.value) : item.value === this.selectedValueOf('')),
      )
      const check = document.createElement('span')
      check.className = checkbox ? 'check check--box' : 'check'
      if (!checkbox) check.textContent = '✓'
      li.appendChild(check)
    }
    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = item.label ?? ''
    li.appendChild(label)
    li.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      this.keyboardMode = false
      if (item.disabled || this.isBarDisabled()) return
      this.select(item, '')
    })
    li.addEventListener('mouseenter', () => {
      this.keyboardMode = false
      if (item.disabled || this.isBarDisabled()) return
      this.hoverExpand(item.value ?? '')
    })
    return li
  }

  /** 键盘激活态 → .active class（不重建 DOM）；移动端在汉堡面板内作用 */
  private syncActive(): void {
    const root = this.navRoot()
    for (const el of root.querySelectorAll('.active')) el.classList.remove('active')
    const item = this.currentItems()[this.activeIndex]
    if (!item || item.value == null) return
    const selector =
      this.mobileMode || this.activeStack.length > 0 ? '[part="item"]' : '[part="top-item"]'
    root
      .querySelector<HTMLElement>(`${selector}[data-value="${item.value}"]`)
      ?.classList.add('active')
  }

  /** roving tabindex：仅当前顶级项可 Tab 到达；整栏 disabled 时全部 -1 */
  private syncRoving(): void {
    const root = this.navRoot()
    for (const btn of root.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      btn.setAttribute('tabindex', '-1')
    }
    for (const li of root.querySelectorAll<HTMLElement>('[part="item"]')) {
      li.setAttribute('tabindex', '-1')
    }
    if (this.isBarDisabled()) return
    const topIdx = this.activeStack.length === 0 ? this.activeIndex : this.parentTopIndex()
    // 顶级序列含收纳项「···」（topLevelItems 而非 topItems）
    const top = this.topLevelItems()[topIdx]
    if (top?.value != null) {
      const sel = this.mobileMode ? '[part="item"]' : '[part="top-item"]'
      root
        .querySelector<HTMLElement>(`${sel}[data-value="${top.value}"]`)
        ?.setAttribute('tabindex', '0')
    }
  }

  /** 当前导航作用域：移动端 = 汉堡面板（bar 隐藏）；收纳弹层打开时 = 弹层本身（避免命中条上隐藏项）；桌面 = shadow 全量 */
  private navRoot(): ShadowRoot | HTMLElement {
    if (this.mobileMode && this.hamburgerPanel) return this.hamburgerPanel
    if (this.activeStack[0] === '__more__') return this.moreSubmenu() ?? this.shadow
    return this.shadow
  }

  /** 把焦点移到当前层级激活项（仅键盘模式；hover/点击不移动焦点） */
  private focusCurrent(): void {
    if (!this.keyboardMode) return
    const root = this.navRoot()
    if (this.mobileMode && this.activeStack.length === 0 && !this.hamburgerOpen) {
      this.hamburgerBtn?.focus()
      return
    }
    if (this.activeStack.length === 0) {
      // 顶级序列含收纳项「···」（topLevelItems 而非 topItems）
      const top = this.topLevelItems()[this.activeIndex]
      if (top?.value == null) return
      const sel = this.mobileMode ? '[part="item"]' : '[part="top-item"]'
      root.querySelector<HTMLElement>(`${sel}[data-value="${top.value}"]`)?.focus()
      return
    }
    const item = this.currentItems()[this.activeIndex]
    if (!item || item.value == null) return
    root.querySelector<HTMLElement>(`[part="item"][data-value="${item.value}"]`)?.focus()
  }

  /** hover：级联展开到该项所在路径（同级互斥），同步导航上下文但不移动焦点 */
  private hoverExpand(value: string): void {
    if (!value) return
    // 收纳项「···」：非数据项，直接切到其展开态（弹层 = 被收项镜像）
    if (value === '__more__') {
      const next = new Set(['__more__'])
      if (next.size === this.expanded.size && [...next].every((v) => this.expanded.has(v))) return
      this.expanded = next
      this.activeStack = ['__more__']
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
      return
    }
    const chain = this.chainOf(value)
    if (chain.length === 0) return
    const item = this.findItem(value)
    const open = item?.children?.length ? chain : chain.slice(0, -1)
    const next = new Set(open)
    if (next.size === this.expanded.size && [...next].every((v) => this.expanded.has(v))) return
    this.expanded = next
    this.activeStack = chain.slice(0, -1)
    const levelItems = this.currentItems()
    const idx = levelItems.findIndex((i) => i.value === value)
    if (idx >= 0) this.activeIndex = idx
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
  }

  /** 点击：展开/收起子菜单 */
  private toggleExpand(value: string): void {
    // 收纳项「···」：非数据项，直接切换其展开态（不走 chainOf——不在 items 树里）
    if (value === '__more__') {
      const next = new Set(this.expanded)
      if (next.has('__more__')) next.delete('__more__')
      else next.add('__more__')
      this.expanded = next
      this.activeStack = [...next]
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
      return
    }
    if (this.expanded.has(value)) {
      this.expanded = new Set(this.chainOf(value).slice(0, -1))
      this.activeStack = [...this.expanded]
    } else {
      const chain = this.chainOf(value)
      this.expanded = new Set(chain)
      this.activeStack = chain.slice(0, -1)
      const levelItems = this.currentItems()
      const idx = levelItems.findIndex((i) => i.value === value)
      if (idx >= 0) this.activeIndex = idx
    }
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
  }

  private select(item: MenuItem, scope = ''): void {
    // action 项：动作语义，不参与 value 选中态（不写回、不打勾），只通知宿主
    if (item.kind === 'action') {
      this.emit('select', { value: item.value, kind: 'action' })
    } else if (item.kind === 'checkbox') {
      // checkbox 项：多选勾选集，value 为 JSON 数组；点击切换存留
      const checked = this.checkedSet()
      const v = item.value ?? ''
      if (checked.has(v)) checked.delete(v)
      else checked.add(v)
      this.setAttribute('value', JSON.stringify([...checked]))
      this.emit('select', { value: item.value, checked: checked.has(v) })
    } else {
      // radio 项：按组作用域写回（非受控通道）。组内更新该组选中值，其余组保留；
      // 无组（scope=''）保持纯字符串 value 兼容现有
      const map = this.valueMap()
      map[scope] = item.value ?? ''
      this.writeValue(map)
      this.emit('select', { value: item.value })
    }
    // 收起策略：checkbox 勾选切换永不收起（连续勾选场景）；其余按 close-on-select（缺省收）
    if (item.kind !== 'checkbox' && this.closeOnSelect()) {
      this.collapseAndFocusTop()
    } else {
      this.syncSelection()
    }
  }

  /** close-on-select：缺省 true（桌面菜单栏选中即收），显式 "false" 保持展开 */
  private closeOnSelect(): boolean {
    return this.getAttr('close-on-select', '') !== 'false'
  }

  /** 收起全部浮层并聚焦回打开子菜单的顶级项（菜单栏行为） */
  private collapseAndFocusTop(): void {
    const parentIdx = this.parentTopIndex()
    this.activeStack = []
    this.expanded.clear()
    if (this.mobileMode) this.hamburgerOpen = false
    if (parentIdx >= 0) this.activeIndex = parentIdx
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
    this.focusCurrent()
  }

  /** 键盘进入子菜单：展开并聚焦第一个/最后一个可用子项 */
  private enterSubmenu(item: MenuItem, focusLast = false): void {
    if (!item.children?.length) return
    this.activeStack.push(item.value ?? '')
    this.expanded = new Set(this.activeStack)
    const children = this.currentItems()
    const enabled = children.map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0)
    this.activeIndex =
      enabled.length > 0 ? (focusLast ? enabled[enabled.length - 1]! : enabled[0]!) : 0
  }

  /** 键盘返回父级：收起子菜单并聚焦父级项 */
  private leaveSubmenu(): void {
    const value = this.activeStack.pop()
    this.expanded = new Set(this.activeStack)
    const parentLevel = this.currentItems()
    this.activeIndex = parentLevel.findIndex((i) => i.value === value)
    if (this.activeIndex < 0) this.activeIndex = 0
  }

  /** 一级子菜单返回顶级：关闭并聚焦回父级顶级项（ARIA menubar） */
  private leaveOrCloseSubmenu(): void {
    if (this.activeStack.length > 1) {
      this.leaveSubmenu()
    } else {
      this.collapseAndFocusTop()
    }
  }

  private collapseToTop(): void {
    this.activeStack = []
    this.expanded.clear()
  }

  private moveActive(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
    if (len === 0) return
    if (this.activeIndex < 0) {
      this.activeIndex = dir === 1 ? enabled[0]! : enabled[len - 1]!
      return
    }
    const cur = enabled.indexOf(this.activeIndex)
    if (!this.loopEnabled()) {
      const next = cur + dir
      if (next >= 0 && next < len) this.activeIndex = enabled[next]!
      return
    }
    this.activeIndex = enabled[(cur + dir + len) % len]!
  }

  private moveTopTo(total: number, target: number): void {
    if (total === 0) return
    if (this.loopEnabled()) this.activeIndex = ((target % total) + total) % total
    else this.activeIndex = Math.min(Math.max(target, 0), total - 1)
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.isBarDisabled()) return
    const atTop = this.activeStack.length === 0
    const vert = this.getAttr('orientation') === 'vertical' || this.mobileMode
    const items = this.currentItems()
    const enabled = items.map((i, idx) => (i.disabled ? -1 : idx)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    this.keyboardMode = true
    const active = items[this.activeIndex]
    const openOrSelect = (): void => {
      if (!active || active.disabled) return
      if (active.children?.length) this.enterSubmenu(active)
      else this.select(active, this.scopeOf(active.value ?? ''))
    }
    const moveTop = (dir: 1 | -1): void => {
      this.collapseToTop()
      this.moveActive(enabled, dir)
    }
    if (atTop && !vert) {
      // 水平顶级：左右移动、下/上开子菜单
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveTop(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveTop(1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (active && !active.disabled && active.children?.length) this.enterSubmenu(active)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (active && !active.disabled && active.children?.length) this.enterSubmenu(active, true)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openOrSelect()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.collapseAndFocusTop()
      } else if (e.key === 'Home') {
        e.preventDefault()
        this.activeIndex = enabled[0]!
      } else if (e.key === 'End') {
        e.preventDefault()
        this.activeIndex = enabled[enabled.length - 1]!
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        this.typeahead(e.key)
      } else {
        return
      }
    } else if (atTop && vert) {
      // 竖排/移动端汉堡顶级：上下移动、右/Enter 开子菜单
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveTop(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveTop(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (active && !active.disabled && active.children?.length) this.enterSubmenu(active)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openOrSelect()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.collapseAndFocusTop()
      } else if (e.key === 'Home') {
        e.preventDefault()
        this.activeIndex = enabled[0]!
      } else if (e.key === 'End') {
        e.preventDefault()
        this.activeIndex = enabled[enabled.length - 1]!
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        this.typeahead(e.key)
      } else {
        return
      }
    } else {
      // 子菜单层：上下移动、左右进入/返回、Enter 选中、Esc 收起
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.leaveOrCloseSubmenu()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (active && !active.disabled && active.children?.length) {
          this.enterSubmenu(active)
        } else {
          // 叶子项：关闭子菜单并移到下一个顶级项（ARIA menubar）
          const parentIdx = this.parentTopIndex()
          this.collapseToTop()
          this.moveTopTo(this.topItems().length, parentIdx + 1)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.moveActive(enabled, 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.moveActive(enabled, -1)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openOrSelect()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.collapseAndFocusTop()
      } else if (e.key === 'Home') {
        e.preventDefault()
        this.activeIndex = enabled[0]!
      } else if (e.key === 'End') {
        e.preventDefault()
        this.activeIndex = enabled[enabled.length - 1]!
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        this.typeahead(e.key)
      } else {
        return
      }
    }
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
    this.focusCurrent()
  }

  /** typeahead：缓冲字符序列，跳转当前层 label 匹配的项（startsWith 优先，includes 兜底），超时 500ms 重置 */
  private typeahead(char: string): void {
    this.typeaheadBuffer += char.toLowerCase()
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer)
    this.typeaheadTimer = setTimeout(() => {
      this.typeaheadBuffer = ''
    }, 500)
    const items = this.currentItems()
    const buf = this.typeaheadBuffer
    // 匹配：label startsWith 优先，无则 includes
    const match = (pred: (s: string) => boolean) =>
      items.findIndex((i) => !i.disabled && i.label && pred(i.label.toLowerCase()))
    let idx = match((s) => s.startsWith(buf))
    if (idx === -1) idx = match((s) => s.includes(buf))
    if (idx === -1) return
    this.activeIndex = idx
    const item = items[idx]
    if (item) {
      const root = this.navRoot()
      const sel =
        this.mobileMode || this.activeStack.length > 0 ? '[part="item"]' : '[part="top-item"]'
      const el = root.querySelector<HTMLElement>(`${sel}[data-value="${item.value}"]`)
      el?.focus({ preventScroll: true })
    }
  }

  /** 文档级键盘：shortcut 快捷键 + Alt 访问键 + Alt 聚焦 + 子菜单 Tab 焦点陷阱 */
  private handleDocumentKey = (e: KeyboardEvent): void => {
    if (this.isBarDisabled()) return
    // 快捷键（shortcut 字段）：命中即触发对应项 select（Ctrl+N / Ctrl+Shift+S 等）
    const shortcutItem = this.matchShortcut(e)
    if (shortcutItem) {
      e.preventDefault()
      if (shortcutItem.disabled) return
      this.keyboardMode = true
      this.select(shortcutItem, this.scopeOf(shortcutItem.value ?? ''))
      return
    }
    // Alt 单独按下：聚焦菜单栏第一个可用顶级项（移动端聚焦汉堡按钮）
    if (e.key === 'Alt' && !e.ctrlKey && !e.metaKey) {
      if (this.mobileMode) {
        e.preventDefault()
        this.keyboardMode = true
        this.hamburgerBtn?.focus()
        return
      }
      const first = this.topItems().findIndex((i) => !i.disabled)
      if (first < 0) return
      e.preventDefault()
      this.keyboardMode = true
      this.collapseToTop()
      this.activeIndex = first
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
      return
    }
    // Alt + 访问键：打开对应顶级菜单并聚焦首子项（移动端：开汉堡面板后进入该菜单）
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
      const idx = this.topItems().findIndex((it) => {
        if (it.disabled) return false
        const ak = it.accessKey ?? firstAscii(it.label)
        return ak != null && ak.toLowerCase() === e.key.toLowerCase()
      })
      if (idx >= 0) {
        e.preventDefault()
        this.keyboardMode = true
        this.activeIndex = idx
        if (this.mobileMode) {
          if (!this.hamburgerOpen) this.toggleHamburger(true)
          const item = this.topItems()[idx]
          if (item?.children?.length) this.enterSubmenu(item)
          this.syncOpen()
          this.syncActive()
          this.syncRoving()
          this.focusCurrent()
          return
        }
        this.collapseToTop()
        const item = this.topItems()[idx]
        if (item?.children?.length) this.enterSubmenu(item)
        this.syncOpen()
        this.syncActive()
        this.syncRoving()
        this.focusCurrent()
      }
      return
    }
    // 焦点陷阱：子菜单打开时 Tab 在打开的子项间循环（移动端在汉堡面板内循环）
    if (e.key === 'Tab' && (this.mobileMode ? this.hamburgerOpen : this.expanded.size > 0)) {
      const focusable = this.openSubmenuItems()
      if (focusable.length === 0) return
      e.preventDefault()
      const current = focusable.indexOf(this.shadow.activeElement as HTMLElement)
      const next = e.shiftKey
        ? (current - 1 + focusable.length) % focusable.length
        : (current + 1) % focusable.length
      focusable[next]?.focus()
    }
  }

  /** 当前最深层打开子菜单的可用子项（Tab 陷阱范围；移动端限定在汉堡面板） */
  private openSubmenuItems(): HTMLElement[] {
    if (!this.shadow) return []
    const root = this.mobileMode && this.hamburgerPanel ? this.hamburgerPanel : this.shadow
    const open = [...root.querySelectorAll<HTMLElement>('.submenu.open')]
    const deepest = open.filter((ul) => !ul.querySelector('.submenu.open'))
    const ul = deepest[deepest.length - 1] ?? open[open.length - 1]
    if (!ul) return []
    return [...ul.querySelectorAll<HTMLElement>('[part="item"]')].filter(
      (li) => li.getAttribute('aria-disabled') !== 'true',
    )
  }

  /** 移动端：点击组件外部关闭汉堡面板 */
  private handleDocumentPointerDown = (e: PointerEvent): void => {
    if (!this.mobileMode || !this.hamburgerOpen) return
    if (e.composedPath().includes(this)) return
    this.toggleHamburger(false)
  }

  /** 汉堡面板开关（移动端导航入口） */
  private toggleHamburger(force?: boolean): void {
    const next = force ?? !this.hamburgerOpen
    if (!next) {
      this.hamburgerOpen = false
      this.expanded.clear()
      this.activeStack = []
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
      return
    }
    this.hamburgerOpen = true
    this.syncOpen()
  }

  /** breakpoint 属性 → matchMedia 监听（窄宽命中即切移动模式）；桌面模式无 breakpoint 时永远 false */
  private syncMobileMode(): void {
    const bp = this.getAttr('breakpoint', '')
    const query = bp ? `(max-width: ${bp}px)` : ''
    if (query === this.mobileMqQuery) {
      this.setMobileMode(query ? (this.mobileMq?.matches ?? false) : false)
      return
    }
    this.mobileMq?.removeEventListener('change', this.handleMq)
    this.mobileMq = null
    this.mobileMqQuery = query
    if (!query || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      this.setMobileMode(false)
      return
    }
    const mq = window.matchMedia(query)
    this.mobileMq = mq
    mq.addEventListener('change', this.handleMq)
    this.onCleanup(() => mq.removeEventListener('change', this.handleMq))
    this.setMobileMode(mq.matches)
  }

  private handleMq = (e: MediaQueryListEvent): void => {
    this.setMobileMode(e.matches)
  }

  private setMobileMode(on: boolean): void {
    if (this.mobileMode === on) return
    this.mobileMode = on
    // 模式切换：收起全部浮层/汉堡，避免残留展开态
    this.hamburgerOpen = false
    this.expanded.clear()
    this.activeStack = []
    this.classList.toggle('oas-menubar--mobile', on)
    this.barEl?.classList.toggle('mobile', on)
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
  }

  /** 解析快捷键字符串并匹配键盘事件；支持 Ctrl/Cmd/Shift/Alt 组合（如 "Ctrl+Shift+S"） */
  private matchShortcut(e: KeyboardEvent): MenuItem | undefined {
    const key = e.key.toLowerCase()
    const find = (items: MenuItem[]): MenuItem | undefined => {
      for (const item of items) {
        if (item.children?.length) {
          const found = find(item.children)
          if (found) return found
          continue
        }
        const sc = (item as MenubarItem).shortcut
        if (!sc) continue
        const parts = sc.split('+').map((p) => p.trim())
        const hitKey = parts[parts.length - 1]!.toLowerCase()
        const mods = new Set(parts.slice(0, -1).map((p) => p.toLowerCase()))
        // 绑定规则：「修饰键+键」直接绑定（如 Ctrl+N）；单键仅限功能键（F1-F12）可绑定，
        // 其余单键（字母/数字/Delete/Esc 等）仅作展示不绑定，避免劫持全局键盘输入
        if (mods.size === 0 && !/^f\d{1,2}$/.test(hitKey)) continue
        const ctrl = mods.has('ctrl') || mods.has('control')
        const meta = mods.has('meta') || mods.has('cmd') || mods.has('command')
        const shift = mods.has('shift')
        const alt = mods.has('alt') || mods.has('option')
        if (
          e.ctrlKey === ctrl &&
          e.metaKey === meta &&
          e.shiftKey === shift &&
          e.altKey === alt &&
          key === hitKey
        ) {
          return item
        }
      }
      return undefined
    }
    return find(this.itemsList)
  }
}
