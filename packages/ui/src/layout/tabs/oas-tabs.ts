import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'
import type { OASTabPanel } from './oas-tab-panel.js'

export type TabsSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

const VALID_TABS_SIZES: readonly TabsSize[] = ['xs', 'small', 'medium', 'large', 'xl']

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeTabsSize(raw: string): TabsSize {
  if ((VALID_TABS_SIZES as readonly string[]).includes(raw)) return raw as TabsSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-tabs] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
  }
  return 'medium'
}

const warnedSizes = new Set<string>()

export type TabsPanelMode = 'keep' | 'lazy' | 'destroy'
export type TabsActivation = 'auto' | 'manual'

const VALID_PANEL_MODES: readonly TabsPanelMode[] = ['keep', 'lazy', 'destroy']

/** 非法 panel-mode 归一化：回落 keep 并在 dev 下 console.warn 一次（同值去重） */
function normalizePanelMode(raw: string): TabsPanelMode {
  if ((VALID_PANEL_MODES as readonly string[]).includes(raw)) return raw as TabsPanelMode
  if (!warnedModes.has(raw)) {
    warnedModes.add(raw)
    console.warn(`[oas-tabs] 非法 panel-mode "${raw}"，已回落 keep；合法值：keep/lazy/destroy`)
  }
  return 'keep'
}

const warnedModes = new Set<string>()

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.tablist {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-2) var(--oas-space-4);
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  /* 标签不压缩不换行：溢出由滚动/更多下拉处理，而非挤压文字竖排（justified 均分模式以 flex:1 覆盖） */
  flex-shrink: 0;
  white-space: nowrap;
}
.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
  border-bottom-color: var(--oas-color-primary);
  font-weight: 500;
}
/* 非激活项 hover 反馈：文字与背景向激活态靠拢一档（选中项 hover 不变） */
.tab:not([aria-selected='true']):hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.panel {
  padding-top: var(--oas-space-4);
}

/* 图标 tab：icon 属性 / slot="icon" 渲染的图标位（装饰性，读屏隐藏） */
.tab-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: var(--oas-font-size-md);
  color: inherit;
}
.tab-icon svg {
  display: block;
}

/* 新增按钮（addable）：native button，+ 图标，focus 环可见 */
.tab-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 24px;
  height: 24px;
  margin-inline-start: var(--oas-space-1);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
}
.tab-add:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.tab-add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}

/* tab 徽标：数字/文本小圆角标签 */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  white-space: nowrap;
}

/* 关闭按钮：span（非原生 button）——原生 button 会被 axe 视为 tablist 的
   不允许子元素/与 role=tab 构成交互嵌套；tabindex=-1 可脚本聚焦（读屏可激活），
   不进 Tab 顺序（避免嵌套交互违规），Enter/Space 由组件内 keydown 处理 */
.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
}
.tab-close:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.tab-close:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}

/* 卡片式（type=card）：标签带边框、激活标签与面板连通、四边有线 */
:host(.oas-tabs--card) .nav {
  border-bottom: none;
}
:host(.oas-tabs--card) .tablist {
  gap: var(--oas-space-1);
}
:host(.oas-tabs--card) .tab {
  border: 1px solid var(--oas-color-border);
  border-bottom: none;
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
  margin-bottom: -1px;
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
:host(.oas-tabs--card) .tab[aria-selected='true'] {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid var(--oas-color-bg);
  background: var(--oas-color-bg);
}
/* 卡片式非激活项 hover：浮起面向内容底色靠拢（激活是 bg，非激活是 bg-hover） */
:host(.oas-tabs--card) .tab:not([aria-selected='true']):hover {
  background: color-mix(in srgb, var(--oas-color-bg-hover) 50%, var(--oas-color-bg));
}
:host(.oas-tabs--card) .panel {
  margin-top: -1px;
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) var(--oas-radius-md);
  background: var(--oas-color-bg);
}

/* 标签位置：bottom（面板在上、标签在下） */
:host(.oas-tabs--bottom) {
  display: flex;
  flex-direction: column;
}
:host(.oas-tabs--bottom) .nav {
  order: 1;
  border-bottom: none;
  border-top: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--bottom) .tablist {
  border-bottom: none;
}
:host(.oas-tabs--bottom) .panel {
  order: 0;
  padding-top: 0;
  padding-bottom: var(--oas-space-4);
}
:host(.oas-tabs--bottom) .tab {
  border-bottom: none;
  border-top: 2px solid transparent;
  margin-bottom: 0;
  margin-top: -1px;
}
:host(.oas-tabs--bottom) .tab[aria-selected='true'] {
  border-bottom-color: transparent;
  border-top-color: var(--oas-color-primary);
}

/* 标签位置：left / right（标签纵向排列、面板在旁） */
:host(.oas-tabs--vertical) {
  display: flex;
  align-items: stretch;
}
:host(.oas-tabs--vertical) .nav {
  flex-shrink: 0;
}
:host(.oas-tabs--vertical) .tablist {
  flex-direction: column;
  border-bottom: none;
}
:host(.oas-tabs--vertical) .tab {
  border-bottom: none;
  margin-bottom: 0;
}
:host(.oas-tabs--vertical) .panel {
  padding-top: 0;
  flex: 1;
  min-width: 0;
}
:host(.oas-tabs--left) .nav {
  border-right: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--left) .tab {
  border-right: 2px solid transparent;
  margin-right: -1px;
}
:host(.oas-tabs--left) .tab[aria-selected='true'] {
  border-right-color: var(--oas-color-primary);
}
:host(.oas-tabs--left) .panel {
  padding-left: var(--oas-space-4);
}
:host(.oas-tabs--right) .nav {
  order: 1;
  border-left: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--right) .tab {
  border-left: 2px solid transparent;
  margin-left: -1px;
  /* 镜像 left：内容右对齐贴标签栏右边缘 */
  justify-content: flex-end;
}
:host(.oas-tabs--right) .tab[aria-selected='true'] {
  border-left-color: var(--oas-color-primary);
}
:host(.oas-tabs--right) .panel {
  order: 0;
  padding-right: var(--oas-space-4);
}

/* card 卡片式 + bottom：镜像顶部连通 */
:host(.oas-tabs--card.oas-tabs--bottom) .nav {
  border-top: none;
}
:host(.oas-tabs--card.oas-tabs--bottom) .tab {
  border-bottom: 1px solid var(--oas-color-border);
  border-top: none;
  border-radius: 0 0 var(--oas-radius-md) var(--oas-radius-md);
  margin-bottom: 0;
  margin-top: -1px;
}
:host(.oas-tabs--card.oas-tabs--bottom) .tab[aria-selected='true'] {
  border-top: 1px solid var(--oas-color-bg);
}
:host(.oas-tabs--card.oas-tabs--bottom) .panel {
  margin-top: 0;
  margin-bottom: -1px;
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
}

/* card 卡片式 + 纵向：独立盒式（每标签全边框圆角、面板独立） */
:host(.oas-tabs--card.oas-tabs--vertical) .tablist {
  border: none;
  gap: var(--oas-space-1);
}
:host(.oas-tabs--card.oas-tabs--vertical) .tab {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  margin: 0;
  background: var(--oas-color-bg-hover);
}
:host(.oas-tabs--card.oas-tabs--vertical) .tab[aria-selected='true'] {
  border: 1px solid var(--oas-color-primary);
  border-bottom: 1px solid var(--oas-color-primary);
  background: var(--oas-color-bg);
}
:host(.oas-tabs--card.oas-tabs--vertical) .panel {
  margin: 0;
  border-radius: var(--oas-radius-md);
}

/* disabled 标签：视觉降饱和 + 禁点光标（ui-spec §2.3） */
.tab[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
.tab[aria-disabled='true']:hover {
  color: var(--oas-color-text-secondary);
  background: none;
}

/* size 档位：CSS 变量开口，五档对齐 ui-spec §2.1；字号/内边距随档位 */
:host(.oas-tabs--xs) .tab {
  font-size: var(--oas-font-size-xs);
  padding: var(--oas-space-1) var(--oas-space-2);
}
:host(.oas-tabs--small) .tab {
  font-size: var(--oas-font-size-sm);
  padding: var(--oas-space-1_5) var(--oas-space-3);
}
:host(.oas-tabs--large) .tab {
  font-size: var(--oas-font-size-lg);
  padding: var(--oas-space-2_5) var(--oas-space-5);
}
:host(.oas-tabs--xl) .tab {
  font-size: var(--oas-font-size-xl);
  padding: var(--oas-space-3) var(--oas-space-6);
}

/* centered：标签栏整体居中（横向时） */
:host(.oas-tabs--centered) .tablist {
  justify-content: center;
}

/* justified：标签均分占满宽度 */
:host(.oas-tabs--justified) .tab {
  flex: 1;
  justify-content: center;
}

/* ===== 溢出滚动：nav 容器承载布局（替代原 tablist 容器角色），tablist 可滚动 ===== */
.nav {
  display: flex;
  align-items: stretch;
  position: relative;
  min-width: 0;
  border-bottom: 1px solid var(--oas-color-border);
}
/* 横向（默认）：nav 行向，tablist 横向滚动 */
.tablist {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* 隐藏原生滚动条，由箭头控制 */
  -ms-overflow-style: none;
}
.tablist::-webkit-scrollbar {
  display: none;
}

/* 滚动箭头：flex 项（出现时不占位跳动由 hidden 控制），视觉次要、禁用降饱和 */
.scroll-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: stretch;
  width: 28px;
  border: none;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
.scroll-btn[hidden] {
  display: none;
}
.scroll-btn:hover:not(:disabled) {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.scroll-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.scroll-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 纵向（left/right）：nav 列向，tablist 纵向滚动，箭头上下排列 */
:host(.oas-tabs--vertical) .nav {
  flex-direction: column;
}
:host(.oas-tabs--vertical) .tablist {
  overflow-x: hidden;
  overflow-y: auto;
  min-width: auto;
  min-height: 0;
}
:host(.oas-tabs--vertical) .scroll-btn {
  width: auto;
  align-self: stretch;
  height: 24px;
}

/* ===== more 溢出收缩下拉 ===== */
/* more 模式：tablist 不滚动（收缩替代滚动），被收起的 tab 隐藏 */
:host([more]) .tablist {
  overflow: visible;
}
.tab[data-overflowed] {
  display: none;
}
.more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
.more-btn[hidden] {
  display: none;
}
.more-btn:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.more-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 选中项被收进更多 → 更多按钮主色高亮标识 */
.more-btn.more-btn--active {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.more-dropdown {
  position: absolute;
  top: 100%;
  inset-inline-end: 0;
  z-index: 10;
  min-width: 120px;
  max-height: 280px;
  overflow-y: auto;
  margin: 0;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg-elevated);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}
.more-dropdown[hidden] {
  display: none;
}
.more-item {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: start;
  padding: var(--oas-space-1_5) var(--oas-space-3);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.more-item:hover {
  background: var(--oas-color-bg-hover);
}
.more-item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.more-item[aria-current='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}

/* ===== animated：选中态过渡 + 面板淡入（只动 color/border/opacity，不碰 layout） ===== */
:host(.oas-tabs--animated) .tab {
  transition:
    color var(--oas-transition-base) var(--oas-ease-out),
    border-color var(--oas-transition-base) var(--oas-ease-out),
    background-color var(--oas-transition-base) var(--oas-ease-out);
}
:host(.oas-tabs--animated) .panel ::slotted(oas-tab-panel) {
  animation: oas-tabs-fade-in var(--oas-transition-base) var(--oas-ease-out);
}
@keyframes oas-tabs-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ===== editable 重命名输入框：贴近标签文字样式，最小化视觉跳变 ===== */
.tab-rename-input {
  font-family: inherit;
  font-size: inherit;
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-primary);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  min-width: 60px;
  outline: none;
}

/* ===== sortable 拖拽：拖过目标的高亮指示 ===== */
.tab[draggable='true'] {
  cursor: grab;
}
.tab--drag-over {
  box-shadow: inset 2px 0 0 var(--oas-color-primary);
}
:host(.oas-tabs--vertical) .tab--drag-over {
  box-shadow: inset 0 2px 0 var(--oas-color-primary);
}
`

export class OASTabs extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'active',
      'type',
      'closable',
      'addable',
      'tab-position',
      'size',
      'centered',
      'justified',
      'without-scroll-controls',
      'more',
      'panel-mode',
      'activation',
      'animated',
      'sortable',
    ]
  }

  private panels: OASTabPanel[] = []
  private observer: MutationObserver | null = null
  /** 新增按钮引用（重建后更新；用于焦点归属捕获与恢复） */
  private addBtn: HTMLButtonElement | null = null
  /** 上次重建时的面板数（判断「点击 + 后宿主是否新增了面板」） */
  private prevPanelCount = -1
  /** 溢出检测（ResizeObserver 监听 tablist 尺寸变化） */
  private resizeObserver: ResizeObserver | null = null
  /** more 下拉展开态 */
  private moreOpen = false
  /** 面板子节点暂存（lazy/destroy 模式：未激活面板内容移出 DOM 暂存） */
  private stash = new WeakMap<HTMLElement, DocumentFragment>()
  /** lazy 模式已访问过的面板 value（访问过即常驻，不再暂存） */
  private visited = new Set<string>()
  /** sortable 拖拽源标签 value */
  private dragSource: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="nav" part="nav">
        <button class="scroll-btn scroll-start" part="scroll-start" type="button" hidden aria-hidden="true" tabindex="-1"></button>
        <div class="tablist" part="tablist" role="tablist"></div>
        <button class="more-btn" part="more-button" type="button" hidden></button>
        <button class="scroll-btn scroll-end" part="scroll-end" type="button" hidden aria-hidden="true" tabindex="-1"></button>
        <div class="more-dropdown" part="more-dropdown" role="menu" hidden></div>
      </div>
      <div class="panel" part="panel"><slot></slot></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.shadow
      .querySelector('.tablist')
      ?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 宿主增删 oas-tab-panel（如 closable 场景外部移除面板）时增量刷新标签栏
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true })
    this.onCleanup(() => this.observer?.disconnect())
    this.bindScroll()
    this.bindMore()
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
    // 只取直接子面板：嵌套 tabs（panel 内再放 oas-tabs）的面板归内层管理，不误抓
    this.panels = [...this.querySelectorAll(':scope > oas-tab-panel')] as OASTabPanel[]
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return
    // 样式变体：line（下划线，默认）/ card（卡片式）
    const type = this.getAttr('type', 'line')
    // 标签栏位置：top（默认）/ left / right / bottom
    const position = this.getAttr('tab-position', 'top')
    const vertical = position === 'left' || position === 'right'
    this.classList.toggle('oas-tabs--card', type === 'card')
    this.classList.toggle('oas-tabs--vertical', vertical)
    this.classList.toggle('oas-tabs--left', position === 'left')
    this.classList.toggle('oas-tabs--right', position === 'right')
    this.classList.toggle('oas-tabs--bottom', position === 'bottom')
    // size 五档（非法值归一化回落 medium）；centered/justified 布局
    const size = normalizeTabsSize(this.getAttr('size', 'medium'))
    for (const s of VALID_TABS_SIZES) this.classList.toggle(`oas-tabs--${s}`, s === size)
    this.classList.toggle('oas-tabs--centered', this.hasAttr('centered'))
    this.classList.toggle('oas-tabs--justified', this.hasAttr('justified'))
    this.classList.toggle('oas-tabs--animated', this.hasAttr('animated'))
    const closable = this.hasAttr('closable')
    const addable = this.hasAttr('addable')
    const sortable = this.hasAttr('sortable')

    // 重建前捕获 tablist 内焦点归属（动态增删后焦点恢复的依据）
    const focused = this.captureFocused()
    const added = focused?.type === 'add' && this.panels.length > this.prevPanelCount
    this.prevPanelCount = this.panels.length

    tablist.className = `tablist${vertical ? ' tablist--vertical' : ''}`
    tablist.innerHTML = ''
    const active = this.getAttr('active', '')
    let firstValue = ''
    this.panels.forEach((panel, idx) => {
      const value = panel.getAttribute('value') ?? ''
      if (idx === 0) firstValue = value
      const isSelected = value === (active || firstValue)
      const disabled = panel.hasAttribute('disabled')
      const btn = document.createElement('button')
      btn.className = 'tab'
      btn.classList.toggle('tab--card', type === 'card')
      btn.setAttribute('part', 'tab')
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(isSelected))
      // roving tabindex：仅选中标签进 Tab 顺序，其余 tabindex=-1；disabled 恒 -1 不可聚焦
      btn.setAttribute('tabindex', isSelected && !disabled ? '0' : '-1')
      if (disabled) {
        btn.setAttribute('aria-disabled', 'true')
        btn.disabled = true
      }
      btn.setAttribute('data-value', value)

      // 图标：icon 属性（iconRegistry 内联 SVG）优先；否则取面板直接子元素
      // [slot="icon"] 克隆进图标位（装饰性，读屏隐藏）
      const iconName = panel.getAttribute('icon')
      const iconContent = iconName ? iconRegistry[iconName as IconName] : undefined
      let slotIcon: HTMLElement | null = null
      if (!iconContent) {
        for (const child of panel.children) {
          if (child.getAttribute('slot') === 'icon') {
            slotIcon = child as HTMLElement
            break
          }
        }
      }
      if (iconContent || slotIcon) {
        const iconEl = document.createElement('span')
        iconEl.className = 'tab-icon'
        iconEl.setAttribute('aria-hidden', 'true')
        if (iconContent) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 16 16')
          svg.setAttribute('width', '1em')
          svg.setAttribute('height', '1em')
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('focusable', 'false')
          svg.innerHTML = iconContent
          iconEl.appendChild(svg)
        } else if (slotIcon) {
          iconEl.appendChild(slotIcon.cloneNode(true))
        }
        btn.appendChild(iconEl)
      }

      const label = document.createElement('span')
      label.className = 'tab-label'
      // slot="label" 自定义标签内容（通用的 slot 定制，fallback 到 label 属性纯文本）；
      // 克隆面板直接子元素 [slot="label"]（该元素不被面板默认 slot 投影，专供标签位使用）
      let slotLabel: HTMLElement | null = null
      for (const child of panel.children) {
        if (child.getAttribute('slot') === 'label') {
          slotLabel = child as HTMLElement
          break
        }
      }
      if (slotLabel) label.appendChild(slotLabel.cloneNode(true))
      else label.textContent = panel.getAttribute('label') ?? ''
      btn.appendChild(label)

      // editable：双击标签进入重命名编辑态（label 替换为 input，Enter 确认 / Esc 取消）
      if (panel.hasAttribute('editable')) {
        btn.addEventListener('dblclick', (e: Event) => {
          e.stopPropagation()
          this.startRename(btn, panel, value)
        })
      }

      // 徽标：数字或文本，紧邻标题
      const badge = panel.getAttribute('badge')
      if (badge) {
        const badgeEl = document.createElement('span')
        badgeEl.className = 'tab-badge'
        badgeEl.textContent = badge
        btn.appendChild(badgeEl)
      }

      // 关闭按钮：span tabindex=-1（无 role，避免 axe nested-interactive 判为
      // 可交互控件嵌套 / tablist 不允许子元素）；读屏可经 aria-label 命名并激活，
      // Enter/Space 走组件内 keydown
      if (closable) {
        const close = document.createElement('span')
        close.className = 'tab-close'
        close.setAttribute('tabindex', '-1')
        close.setAttribute('aria-label', this.t('tabs.close'))
        close.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
        close.addEventListener('click', (e: Event) => {
          e.stopPropagation()
          this.emit('close', { key: value })
        })
        close.addEventListener('keydown', (e: Event) => {
          const k = e as KeyboardEvent
          if (k.key !== 'Enter' && k.key !== ' ') return
          k.preventDefault()
          k.stopPropagation()
          this.emit('close', { key: value })
        })
        btn.appendChild(close)
      }

      btn.addEventListener('click', () => this.activate(value))

      // sortable：原生 HTML5 拖拽换位，drop 后 emit oas-reorder（宿主据此重排面板数据）
      if (sortable && !disabled) {
        btn.setAttribute('draggable', 'true')
        btn.addEventListener('dragstart', (e: Event) => {
          this.dragSource = value
          const de = e as DragEvent
          if (de.dataTransfer) {
            de.dataTransfer.effectAllowed = 'move'
            de.dataTransfer.setData('text/plain', value)
          }
        })
        btn.addEventListener('dragover', (e: Event) => {
          const de = e as DragEvent
          de.preventDefault() // 必须 preventDefault 才允许 drop
          if (de.dataTransfer) de.dataTransfer.dropEffect = 'move'
          btn.classList.add('tab--drag-over')
        })
        btn.addEventListener('dragleave', () => btn.classList.remove('tab--drag-over'))
        btn.addEventListener('drop', (e: Event) => {
          const de = e as DragEvent
          de.preventDefault()
          btn.classList.remove('tab--drag-over')
          const fromValue = this.dragSource ?? de.dataTransfer?.getData('text/plain') ?? ''
          if (fromValue && fromValue !== value) this.reorder(fromValue, value)
          this.dragSource = null
        })
        btn.addEventListener('dragend', () => {
          this.dragSource = null
          tablist
            .querySelectorAll('.tab--drag-over')
            .forEach((t) => t.classList.remove('tab--drag-over'))
        })
      }
      tablist.appendChild(btn)
    })

    // 新增按钮（addable）：native button，Enter/Space 原生触发 click → oas-add。
    // 作为 tablist 直接子元素必须声明 role=tab（axe aria-required-children：tablist 只允许
    // tab 子元素）。同款占位 tab 语义：aria-selected=false + tabindex=0，
    // Tab 键可到达（其余真实标签为 roving tabindex），读屏作为「未选中占位 tab」。
    this.addBtn = null
    if (addable) {
      const add = document.createElement('button')
      add.className = 'tab-add'
      add.setAttribute('part', 'add-button')
      add.setAttribute('role', 'tab')
      add.setAttribute('aria-selected', 'false')
      add.setAttribute('tabindex', '0')
      add.setAttribute('aria-label', this.t('tabs.add'))
      add.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">${iconRegistry['plus']}</svg>`
      add.addEventListener('click', () => {
        this.emit('add', { label: this.t('tabs.newTab') })
      })
      this.addBtn = add
      tablist.appendChild(add)
    }

    const selected = active || firstValue
    const panelMode = normalizePanelMode(this.getAttr('panel-mode', 'keep'))
    for (const panel of this.panels) {
      const value = panel.getAttribute('value') ?? ''
      const isActive = value === selected
      panel.hidden = !isActive
      this.syncPanelContent(panel, value, isActive, panelMode)
    }

    // 重建后恢复焦点（点击 + / 关闭 / 方向键切换后焦点不丢）
    this.restoreFocus(focused, added)
    // 重建后重新检测溢出（标签增删/尺寸变化后箭头显隐同步）
    this.syncScrollControls()
    this.syncMore()
  }

  /** 溢出滚动箭头：ResizeObserver 监听溢出变化 + scroll 事件更新箭头可用态 */
  private bindScroll(): void {
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    if (!tablist) return
    const start = this.shadow.querySelector('.scroll-start') as HTMLButtonElement | null
    const end = this.shadow.querySelector('.scroll-end') as HTMLButtonElement | null
    if (!start || !end) return
    // 箭头 aria-label 走 locale（ui-spec §2.3 文案禁硬编码）
    start.setAttribute('aria-label', this.t('tabs.scrollPrev'))
    end.setAttribute('aria-label', this.t('tabs.scrollNext'))
    const vertical = this.isVertical()
    const prevSvg = iconRegistry[vertical ? 'chevron-up' : 'chevron-left']
    const nextSvg = iconRegistry[vertical ? 'chevron-down' : 'chevron-right']
    start.innerHTML = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${prevSvg}</svg>`
    end.innerHTML = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${nextSvg}</svg>`
    start.addEventListener('click', () => this.scrollTabs(-1))
    end.addEventListener('click', () => this.scrollTabs(1))
    tablist.addEventListener('scroll', () => this.syncScrollControls(), { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.syncScrollControls())
      this.resizeObserver.observe(tablist)
      this.onCleanup(() => this.resizeObserver?.disconnect())
    }
    this.syncScrollControls()
  }

  private isVertical(): boolean {
    const pos = this.getAttr('tab-position', 'top')
    return pos === 'left' || pos === 'right'
  }

  /** 点击箭头滚动一段（约一个视口的 60%） */
  private scrollTabs(dir: 1 | -1): void {
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    if (!tablist) return
    const vertical = this.isVertical()
    const amount = (vertical ? tablist.clientHeight : tablist.clientWidth) * 0.6 * dir
    if (vertical) tablist.scrollBy({ top: amount, behavior: 'smooth' })
    else tablist.scrollBy({ left: amount, behavior: 'smooth' })
  }

  /** 按溢出与滚动位置同步箭头显隐/可用态（可外部触发：ResizeObserver / scroll / update） */
  private syncScrollControls(): void {
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    const start = this.shadow.querySelector('.scroll-start') as HTMLButtonElement | null
    const end = this.shadow.querySelector('.scroll-end') as HTMLButtonElement | null
    if (!tablist || !start || !end) return
    // more 模式（收缩下拉）与滚动箭头互斥：more 开启时不走滚动箭头
    const showControls = !this.hasAttr('without-scroll-controls') && !this.hasAttr('more')
    const vertical = this.isVertical()
    const scrollSize = vertical ? tablist.scrollHeight : tablist.scrollWidth
    const clientSize = vertical ? tablist.clientHeight : tablist.clientWidth
    const scrollPos = vertical ? tablist.scrollTop : tablist.scrollLeft
    const overflow = showControls && scrollSize > clientSize + 1
    start.hidden = !overflow
    end.hidden = !overflow
    if (!overflow) return
    // 到起点禁用 prev，到终点禁用 next（阈值 1px 容差）
    const atStart = scrollPos <= 1
    const atEnd = scrollPos + clientSize >= scrollSize - 1
    start.disabled = atStart
    end.disabled = atEnd
    start.setAttribute('aria-disabled', String(atStart))
    end.setAttribute('aria-disabled', String(atEnd))
  }

  /** more 溢出收缩：绑定更多按钮点击弹/收下拉、外部点击收起 */
  private bindMore(): void {
    const moreBtn = this.shadow.querySelector('.more-btn') as HTMLButtonElement | null
    if (!moreBtn) return
    moreBtn.setAttribute('aria-label', this.t('tabs.more'))
    moreBtn.setAttribute('aria-haspopup', 'menu')
    moreBtn.setAttribute('aria-expanded', 'false')
    moreBtn.innerHTML = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${iconRegistry['more']}</svg>`
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.moreOpen = !this.moreOpen
      this.syncMoreDropdown()
    })
    // 外部点击收起（宿主 document 级，composed 跨 shadow）
    const onDocClick = (e: Event) => {
      if (!this.moreOpen) return
      const path = e.composedPath()
      if (!path.includes(moreBtn) && !path.includes(this.shadow.querySelector('.more-dropdown') as Node)) {
        this.moreOpen = false
        this.syncMoreDropdown()
      }
    }
    document.addEventListener('click', onDocClick, true)
    this.onCleanup(() => document.removeEventListener('click', onDocClick, true))
  }

  /**
   * more 溢出策略：测量每个 tab 宽度累积，超出 nav 可用宽度（扣除更多按钮占位）的
   * tab 标 data-overflowed 收进「更多」下拉。仅 more 属性开启时生效（与滚动箭头互斥）。
   */
  private syncMore(): void {
    const moreBtn = this.shadow.querySelector('.more-btn') as HTMLButtonElement | null
    const nav = this.shadow.querySelector('.nav') as HTMLElement | null
    if (!moreBtn || !nav) return
    if (!this.hasAttr('more')) {
      moreBtn.hidden = true
      return
    }
    const tabs = [
      ...this.shadow.querySelectorAll<HTMLElement>('[role="tab"][data-value]'),
    ]
    // 可用宽度 = nav 宽 - 更多按钮占位（约 40px）- 余量
    const avail = nav.clientWidth - 44
    let acc = 0
    let firstOverflow = -1
    tabs.forEach((t, i) => {
      acc += t.offsetWidth
      if (firstOverflow === -1 && acc > avail) firstOverflow = i
    })
    const overflowed = firstOverflow !== -1
    moreBtn.hidden = !overflowed
    if (!overflowed) {
      tabs.forEach((t) => t.removeAttribute('data-overflowed'))
      this.moreOpen = false
      this.syncMoreDropdown()
      return
    }
    tabs.forEach((t, i) => {
      if (i >= firstOverflow) t.setAttribute('data-overflowed', '')
      else t.removeAttribute('data-overflowed')
    })
    // 选中项被收进更多 → 更多按钮高亮
    const active = this.getAttr('active', '') || (tabs[0]?.getAttribute('data-value') ?? '')
    const activeOverflowed = tabs.some(
      (t) => t.getAttribute('data-value') === active && t.hasAttribute('data-overflowed'),
    )
    moreBtn.classList.toggle('more-btn--active', activeOverflowed)
    this.renderMoreDropdown()
  }

  /** 渲染更多下拉内容（被收起的 tab 列表） */
  private renderMoreDropdown(): void {
    const dropdown = this.shadow.querySelector('.more-dropdown') as HTMLElement | null
    if (!dropdown) return
    dropdown.innerHTML = ''
    const overflowed = [
      ...this.shadow.querySelectorAll<HTMLElement>('[role="tab"][data-value][data-overflowed]'),
    ]
    const active = this.getAttr('active', '') || (this.panels[0]?.getAttribute('value') ?? '')
    for (const tab of overflowed) {
      const value = tab.getAttribute('data-value') ?? ''
      const item = document.createElement('button')
      item.className = 'more-item'
      item.setAttribute('type', 'button')
      item.setAttribute('role', 'menuitem')
      item.setAttribute('data-value', value)
      item.setAttribute('aria-current', String(value === active))
      // 取面板 label 作下拉项文本
      const panel = this.panels.find((p) => (p.getAttribute('value') ?? '') === value)
      item.textContent = panel?.getAttribute('label') ?? value
      item.addEventListener('click', () => {
        this.moreOpen = false
        this.activate(value)
        this.syncMoreDropdown()
      })
      dropdown.appendChild(item)
    }
  }

  /** 同步更多下拉展开态 */
  private syncMoreDropdown(): void {
    const dropdown = this.shadow.querySelector('.more-dropdown') as HTMLElement | null
    const moreBtn = this.shadow.querySelector('.more-btn') as HTMLButtonElement | null
    if (!dropdown || !moreBtn) return
    dropdown.hidden = !this.moreOpen
    moreBtn.setAttribute('aria-expanded', String(this.moreOpen))
    if (this.moreOpen) this.renderMoreDropdown()
  }

  /**
   * 面板内容显隐策略：keep=hidden 保留（默认）；lazy=未访问的未激活面板子节点暂存，
   * 首次激活挂载并标记 visited（此后常驻）；destroy=切换即卸载非激活面板子节点、激活时重挂。
   * 暂存/恢复操作的是面板 light DOM 子节点（Fragment 承载），不触发 tabs 的 childList observer
   * （observer 监听的是 host 直接子节点 panel 增删，不监听 panel 内部）。
   */
  private syncPanelContent(
    panel: HTMLElement,
    value: string,
    isActive: boolean,
    mode: TabsPanelMode,
  ): void {
    if (mode === 'keep') return
    if (isActive) {
      // 激活：若曾暂存则恢复子节点，并标记已访问
      const frag = this.stash.get(panel)
      if (frag) {
        panel.appendChild(frag)
        this.stash.delete(panel)
      }
      this.visited.add(value)
      return
    }
    // 未激活：lazy 仅暂存「未访问过」的；destroy 一律暂存
    const shouldStash = mode === 'destroy' || (mode === 'lazy' && !this.visited.has(value))
    if (shouldStash && !this.stash.has(panel) && panel.childNodes.length > 0) {
      const frag = document.createDocumentFragment()
      while (panel.firstChild) frag.appendChild(panel.firstChild)
      this.stash.set(panel, frag)
    }
  }

  private handleKey(e: KeyboardEvent): void {
    // 可聚焦值 = 非 disabled 面板（disabled 不参与键盘导航循环）
    const enabledValues = this.panels
      .filter((p) => !p.hasAttribute('disabled'))
      .map((p) => p.getAttribute('value') ?? '')
    if (enabledValues.length === 0) return
    const manual = this.getAttr('activation', 'auto') === 'manual'
    const active = this.getAttr('active', '') || enabledValues[0] || ''
    const idx = enabledValues.indexOf(active)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = enabledValues[(idx + 1) % enabledValues.length] ?? ''
      if (manual) this.moveFocus(next)
      else this.activate(next)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = enabledValues[(idx - 1 + enabledValues.length) % enabledValues.length] ?? ''
      if (manual) this.moveFocus(prev)
      else this.activate(prev)
    } else if (manual && (e.key === 'Enter' || e.key === ' ')) {
      // 手动激活：Enter/Space 切换当前聚焦的标签（读屏/键盘确认语义）
      const focused = (this.shadow.activeElement as HTMLElement)?.closest?.(
        '[role="tab"][data-value]',
      ) as HTMLElement | null
      const value = focused?.getAttribute('data-value')
      if (value) {
        e.preventDefault()
        this.activate(value)
      }
    }
  }

  /** 手动激活模式：移动 roving 焦点（更新 tabindex + 聚焦）但不切换 active */
  private moveFocus(value: string): void {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return
    for (const el of tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')) {
      const isTarget = el.getAttribute('data-value') === value
      el.setAttribute('tabindex', isTarget ? '0' : '-1')
      if (isTarget) el.focus({ preventScroll: true })
    }
  }

  /**
   * editable 重命名：标签 label 替换为 input 进入编辑态。Enter 确认（emit oas-rename
   * 并把新 label 写回面板属性后重渲染）；Esc 或失焦取消（恢复原 label，不发事件）。
   * 输入期间拦截冒泡，避免触发标签点击/键盘导航。
   */
  private startRename(btn: HTMLElement, panel: HTMLElement, value: string): void {
    const labelEl = btn.querySelector('.tab-label')
    if (!labelEl || btn.querySelector('.tab-rename-input')) return
    const original = panel.getAttribute('label') ?? ''
    const input = document.createElement('input')
    input.className = 'tab-rename-input'
    input.value = original
    input.setAttribute('aria-label', this.t('tabs.newTab'))
    labelEl.replaceWith(input)
    input.focus()
    input.select()
    const finish = (commit: boolean): void => {
      const newLabel = input.value.trim()
      if (commit && newLabel && newLabel !== original) {
        panel.setAttribute('label', newLabel)
        this.emit('rename', { value, label: newLabel })
      }
      // 恢复标签渲染（重渲染整个 tablist 恢复结构）
      this.update()
    }
    input.addEventListener('keydown', (e: Event) => {
      const k = e as KeyboardEvent
      k.stopPropagation()
      if (k.key === 'Enter') {
        k.preventDefault()
        finish(true)
      } else if (k.key === 'Escape') {
        k.preventDefault()
        finish(false)
      }
    })
    input.addEventListener('blur', () => finish(false))
    input.addEventListener('click', (e) => e.stopPropagation())
  }

  /**
   * sortable 拖拽换位：计算 from/to 索引并 emit oas-reorder（宿主据此重排面板顺序，
   * 组件不自动移动 DOM——数据源是宿主的 oas-tab-panel 列表）。
   */
  private reorder(fromValue: string, toValue: string): void {
    const values = this.panels.map((p) => p.getAttribute('value') ?? '')
    const fromIndex = values.indexOf(fromValue)
    const toIndex = values.indexOf(toValue)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
    this.emit('reorder', { fromIndex, toIndex })
  }

  private activate(value: string): void {
    // disabled 面板不可激活（键盘已跳过；此处防御性守卫，防宿主直接 setAttribute 到 disabled 值时面板错位）
    const panel = this.panels.find((p) => (p.getAttribute('value') ?? '') === value)
    if (panel?.hasAttribute('disabled')) return
    // oas-before-change：切换前拦截点（cancelable），宿主 preventDefault 可 veto 本次切换
    if (!this.emit('before-change', { value }, { cancelable: true })) return
    this.setAttribute('active', value)
    this.emit('change', { value })
    this.update()
    // 激活后焦点落到新激活标签（方向键/点击切换时 roving tabindex 同步）
    this.findTabByValue(value)?.focus({ preventScroll: true })
  }

  /**
   * 捕获 tablist 内当前焦点的归属：'add'（+ 按钮）| 'tab'/'close' + 标签 value |
   * null（焦点不在 tablist 内，如初始渲染/宿主聚焦他处）。
   * 注意：焦点在 shadow DOM 内时 document.activeElement 只返回宿主，
   * 必须用 this.shadow.activeElement 才能拿到真正聚焦的元素。
   */
  private captureFocused(): { type: 'tab' | 'close' | 'add'; value: string } | null {
    const tablist = this.shadow.querySelector('.tablist')
    const active = this.shadow.activeElement
    if (!tablist || !tablist.contains(active)) return null
    if (this.addBtn && active === this.addBtn) return { type: 'add', value: '' }
    const btn = (active as HTMLElement).closest('[role="tab"]')
    if (!btn) return null
    const close = (active as HTMLElement).closest('.tab-close')
    return {
      type: close ? 'close' : 'tab',
      value: (btn as HTMLElement).getAttribute('data-value') ?? '',
    }
  }

  /** 重建后按捕获的焦点归属恢复焦点；标签被移除时落到当前选中标签 */
  private restoreFocus(
    focused: { type: 'tab' | 'close' | 'add'; value: string } | null,
    added: boolean,
  ): void {
    if (!focused) return
    if (focused.type === 'add') {
      // + 按钮触发且宿主新增了面板 → 焦点落到新标签（最后追加的面板）；
      // 否则仍留在 + 按钮
      const target = added ? this.lastTabButton() : this.addBtn
      target?.focus({ preventScroll: true })
      return
    }
    const btn = this.findTabByValue(focused.value)
    if (btn) {
      const target = focused.type === 'close' ? btn.querySelector<HTMLElement>('.tab-close') : btn
      ;(target ?? btn).focus({ preventScroll: true })
    } else {
      // 焦点所在标签已被移除 → 落到当前选中标签
      this.shadow
        .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true })
    }
  }

  private findTabByValue(value: string): HTMLElement | null {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return null
    // 限定带 data-value 的真实标签（排除 + 占位 tab）
    for (const el of tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')) {
      if (el.getAttribute('data-value') === value) return el
    }
    return null
  }

  private lastTabButton(): HTMLElement | null {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return null
    // 限定带 data-value 的真实标签（+ 占位 tab 在末尾，不能作为「最后追加的面板」落焦点）
    const tabs = tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
    return tabs.length ? (tabs[tabs.length - 1] ?? null) : null
  }
}
