import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'
import type { MenuItem } from '../menu/index.js'

export interface NavItem extends MenuItem {
  /** 链接地址（可选）；带 href 的叶子项渲染为 <a> */
  href?: string
  /** 链接打开方式（可选） */
  target?: string
  /** 链接卡描述（大面板形态下渲染在标题下方） */
  description?: string
  /** 当前页标记：链接渲染 aria-current="page"（顶级与面板链接均生效） */
  active?: boolean
  /** 二级级联子导航（面板内）：带 sub 的项渲染二级触发器，点击在面板内打开覆盖式二级面板 */
  sub?: NavItem[]
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
.nav {
  position: relative;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  position: relative;
}
.bar.vertical {
  flex-direction: column;
  align-items: stretch;
}
.top-item {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  text-decoration: none;
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
  box-sizing: border-box;
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
.chevron {
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  transition: transform 0.2s ease;
}
.chevron svg {
  display: block;
  width: 1em;
  height: 1em;
}
.top-item[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
.bar.vertical .chevron {
  transform: rotate(-90deg);
}
.bar.vertical .top-item[aria-expanded='true'] .chevron {
  transform: rotate(90deg);
}
/* 活动触发器指示条：位置/宽度由 --ind-x/--ind-w（或纵向 --ind-y/--ind-h）驱动 */
.indicator {
  position: absolute;
  bottom: -2px;
  left: 0;
  width: var(--ind-w, 0);
  height: 2px;
  background: var(--oas-color-primary);
  border-radius: var(--oas-radius-full, 999px);
  transform: translateX(var(--ind-x, 0));
  opacity: 0;
  pointer-events: none;
  transition: transform 0.2s ease, width 0.2s ease, opacity 0.15s ease;
}
.indicator[data-state='open'] {
  opacity: 1;
}
.bar.vertical .indicator {
  left: auto;
  right: -2px;
  width: 2px;
  height: var(--ind-h, 0);
  transform: translateY(var(--ind-y, 0));
}
/* 统一视口容器：所有顶级项的面板渲染进同一容器 */
.viewport {
  position: absolute;
  top: calc(100% + var(--oas-space-1));
  left: 0;
  min-width: 200px;
  width: var(--vp-w, auto);
  height: var(--vp-h, auto);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  z-index: var(--oas-z-dropdown, 1000);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: width 0.2s ease, height 0.2s ease, opacity 0.15s ease;
}
.viewport.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
/* 视口边界碰撞翻转：右缘溢出右对齐（flip-right）、下缘溢出向上弹（flip-up）；竖排右缘不足向左弹 */
.viewport.flip-right {
  left: auto;
  right: 0;
}
.viewport.flip-up {
  top: auto;
  bottom: calc(100% + var(--oas-space-1));
}
.viewport.vertical.flip-left {
  left: auto;
  right: calc(100% + var(--oas-space-1));
}
.viewport.vertical {
  top: 0;
  left: calc(100% + var(--oas-space-1));
}
/* 超大面板滚动：max-height 由 CSS 变量兜底，宿主可覆盖 --oas-nav-panel-max-height */
.panel {
  padding: var(--oas-space-2);
  max-height: var(--oas-nav-panel-max-height, 60vh);
  overflow: auto;
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(var(--nav-columns, 2), minmax(0, 1fr));
  gap: var(--oas-space-1);
}
.card {
  padding: 0;
}
.card-link {
  display: flex;
  gap: var(--oas-space-2);
  align-items: flex-start;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  color: var(--oas-color-text-primary);
  text-decoration: none;
  cursor: pointer;
}
.card-link:hover {
  background: var(--oas-color-bg-hover);
}
.card-link:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.card-link[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.icon {
  color: var(--oas-color-primary);
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 2px;
}
.icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.card-title {
  display: block;
  font-weight: 500;
}
.card-desc {
  display: block;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.section {
  padding: var(--oas-space-1);
}
.section-title {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.section-title:hover {
  background: var(--oas-color-bg-hover);
}
.section-title:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.section-links {
  list-style: none;
  margin: 0;
  padding: var(--oas-space-1) 0 0 var(--oas-space-2);
}
.section-links a {
  display: block;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  color: var(--oas-color-text-primary);
  text-decoration: none;
  cursor: pointer;
}
.section-links a:hover {
  background: var(--oas-color-bg-hover);
}
.section-links a:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.section-links a[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
/* 弹出层箭头（指向宿主触发器）：rotate45 描边菱形（与 menubar 统一）——
   跨面板边缘悬置（探出侧指向宿主），不内缩进面板内部；坐标系=触发器相对 nav 的 offset。 */
.nav > .arrow {
  position: absolute;
  top: calc(100% + var(--oas-space-1) - 6px);
  left: var(--arrow-x, 24px);
  width: 12px;
  height: 12px;
  background: var(--oas-color-bg);
  border-left: 1px solid var(--oas-color-border);
  border-top: 1px solid var(--oas-color-border);
  transform: rotate(45deg);
  z-index: calc(var(--oas-z-dropdown, 1000) + 1);
  opacity: 0;
  transition: opacity 0.15s ease;
}
/* 垂直形态：贴面板左边线（尖朝左指向触发器） */
.nav > .arrow.vertical {
  top: var(--arrow-y, 24px);
  left: calc(100% + var(--oas-space-1) - 6px);
  border-top: none;
  border-bottom: 1px solid var(--oas-color-border);
}
/* flip-up（面板翻到触发器上方）：箭头贴面板底边、尖朝下 */
.nav > .arrow.flip-up {
  top: auto;
  bottom: calc(100% + var(--oas-space-1) - 6px);
  border-left: none;
  border-top: none;
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
/* 垂直 flip-left（面板翻到触发器左侧）：箭头贴面板右边、尖朝右 */
.nav > .arrow.vertical.flip-left {
  left: auto;
  right: calc(100% + var(--oas-space-1) - 6px);
  border-bottom: none;
  border-left: none;
  border-right: 1px solid var(--oas-color-border);
  border-top: 1px solid var(--oas-color-border);
}
.nav.open > .arrow {
  opacity: 1;
}
/* 遮罩（可选 backdrop 属性时打开） */
.backdrop {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease;
  z-index: calc(var(--oas-z-dropdown, 1000) - 1);
}
.backdrop.open {
  opacity: 1;
  visibility: visible;
}
/* data-motion 方向位移动画 */
.panel[data-motion='from-start'] {
  animation: nav-motion-start 0.25s ease;
}
.panel[data-motion='from-end'] {
  animation: nav-motion-end 0.25s ease;
}
@keyframes nav-motion-start {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes nav-motion-end {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
/* ===== Sub 二级级联：面板内覆盖式二级面板（见 openSubPanel 设计决策注释） ===== */
.sub-trigger {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-1);
}
.sub-trigger:hover,
.sub-trigger[aria-expanded='true'] {
  background: var(--oas-color-bg-hover);
}
.sub-trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.sub-trigger .sub-chevron {
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  transition: transform 0.2s ease;
}
.sub-trigger[aria-expanded='true'] .sub-chevron {
  transform: rotate(90deg);
}
.sub-trigger .sub-chevron svg {
  display: block;
  width: 1em;
  height: 1em;
}
.sub-panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: var(--oas-space-2);
  background: var(--oas-color-bg);
  overflow: auto;
  box-sizing: border-box;
}
.sub-panel[hidden] {
  display: none;
}
.sub-panel.open {
  animation: nav-sub-in 0.22s var(--oas-ease-out, ease-out);
}
@keyframes nav-sub-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.sub-back {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-1);
}
.sub-back:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.sub-back:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.sub-back svg {
  display: block;
  width: 1em;
  height: 1em;
}
.sub-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--oas-space-1);
}
.sub-links a {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  color: var(--oas-color-text-primary);
  text-decoration: none;
  cursor: pointer;
}
.sub-links a:hover {
  background: var(--oas-color-bg-hover);
}
.sub-links a:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.sub-links a[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
/* ===== panel-footer 营销位插槽：面板底部，有内容才显示 ===== */
.panel-footer {
  border-top: 1px solid var(--oas-color-border);
  margin-top: var(--oas-space-2);
  padding-top: var(--oas-space-2);
}
.panel-footer[hidden] {
  display: none;
}
`

let viewportSeq = 0

export class OASNavigationMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'items',
      'value',
      'delay-duration',
      'skip-delay-duration',
      'orientation',
      'columns',
      'backdrop',
      'keep-mounted',
      'arrow',
      'loop',
    ]
  }

  private itemsList: NavItem[] = []
  private navEl: HTMLElement | null = null
  private barEl: HTMLElement | null = null
  private viewportEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private indicatorEl: HTMLElement | null = null
  private arrowEl: HTMLElement | null = null
  private backdropEl: HTMLElement | null = null
  private subPanelEl: HTMLElement | null = null
  private panelFooterEl: HTMLElement | null = null
  private viewportId = `oas-nav-panel-${viewportSeq++}`
  private subPanelId = `oas-nav-sub-${viewportSeq++}`

  /** 内部打开项（非受控模式；受控模式以 value 属性为准） */
  private openValue: string | null = null
  /** 上一个打开项（计算 data-motion 方向） */
  private prevOpenValue: string | null = null
  /** 面板内 inline 二级子导航当前展开的 section（常开一项） */
  private openSection: string | null = null
  /** 面板内覆盖式二级面板（Sub 级联）当前打开项 value；null = 未打开 */
  private openSub: string | null = null
  /** 键盘导航当前层级焦点索引（顶级 activeIndex / 面板 panelIndex） */
  private activeIndex = 0
  private panelIndex = 0
  private keyboardMode = false
  /** 延迟开合计时器 */
  private openTimer: ReturnType<typeof setTimeout> | null = null
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  /** 上次关闭时刻（skip-delay-duration 跳过打开延迟） */
  private lastCloseAt = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="nav" part="nav" role="navigation">
        <div class="bar" part="bar">
          <span class="indicator" part="indicator" data-state="closed" aria-hidden="true"></span>
        </div>
        <span class="arrow" part="arrow" aria-hidden="true"></span>
        <div class="viewport" part="viewport">
          <div class="panel" part="panel"></div>
          <div class="panel-footer" part="panel-footer" hidden><slot name="panel-footer"></slot></div>
          <div class="sub-panel" part="sub-panel" hidden></div>
        </div>
        <div class="backdrop" part="backdrop" aria-hidden="true"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.navEl = this.shadow.querySelector('.nav')
    this.barEl = this.shadow.querySelector('.bar')
    this.viewportEl = this.shadow.querySelector('.viewport')
    this.panelEl = this.shadow.querySelector('.panel')
    this.indicatorEl = this.shadow.querySelector('.indicator')
    this.arrowEl = this.shadow.querySelector('.arrow')
    this.backdropEl = this.shadow.querySelector('.backdrop')
    this.subPanelEl = this.shadow.querySelector('.sub-panel')
    this.panelFooterEl = this.shadow.querySelector('.panel-footer')
    this.viewportEl?.setAttribute('id', this.viewportId)
    this.subPanelEl?.setAttribute('id', this.subPanelId)
    // 营销位插槽内容动态增减 → 重算容器显隐（宿主后插内容也能生效）
    const footerSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="panel-footer"]')
    footerSlot?.addEventListener('slotchange', () => this.syncPanelFooter())
    this.navEl?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.navEl?.addEventListener('mouseleave', () => this.scheduleClose())
    // 指针进入面板区域不关闭（悬停区域 = bar + 面板）
    this.viewportEl?.addEventListener('mouseenter', () => {
      if (this.closeTimer) {
        clearTimeout(this.closeTimer)
        this.closeTimer = null
      }
    })
    this.viewportEl?.addEventListener('mouseleave', () => this.scheduleClose())
    this.backdropEl?.addEventListener('click', () => this.close())
    document.addEventListener('pointerdown', this.handleDocPointer)
    document.addEventListener('keydown', this.handleDocumentKey)
    this.onCleanup(() => {
      document.removeEventListener('pointerdown', this.handleDocPointer)
      document.removeEventListener('keydown', this.handleDocumentKey)
      if (this.openTimer) clearTimeout(this.openTimer)
      if (this.closeTimer) clearTimeout(this.closeTimer)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（nav 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.nav')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseItems()
    this.pruneState()
    this.navEl?.setAttribute('aria-label', this.t('navigationMenu.label'))
    this.renderBar()
    const open = this.effectiveOpen()
    if (open && this.findItem(open)?.children?.length) {
      if (this.prevOpenValue !== open) this.setMotion(open)
      this.renderPanel()
    } else if (!this.hasAttr('keep-mounted')) {
      if (this.panelEl) this.panelEl.innerHTML = ''
    }
    this.syncOpen()
    this.syncIndicator()
    this.syncActive()
    this.syncRoving()
    this.syncPanelFooter()
  }

  /** panel-footer 营销位插槽容器：有内容才显示（宿主放 CTA 卡片） */
  private syncPanelFooter(): void {
    const wrap = this.panelFooterEl
    if (!wrap) return
    wrap.hidden = this.querySelectorAll('[slot="panel-footer"]').length === 0
    // 插槽显隐变化影响 viewport 高度过渡目标，重算尺寸变量
    this.syncViewportSize()
  }

  /** viewport 尺寸变量（--vp-w/--vp-h）：面板内容 + 营销位 + 覆盖式二级面板（打开时）。
   *  营销位按真实布局计（offsetHeight 含自身 padding；外距与上边分隔线一并计入）——
   *  手工拼「+4」与 .panel-footer 的 margin+padding+border 实际结构不符会裁切底部。 */
  private syncViewportSize(): void {
    const vp = this.viewportEl
    const p = this.panelEl
    if (!vp || !p) return
    const footer = this.panelFooterEl
    const sub = this.subPanelEl
    // 二级面板打开时以其内容为准（覆盖主面板）；否则主面板 + 营销位
    if (sub && this.openSub && !sub.hidden) {
      const w = sub.scrollWidth
      const h = sub.scrollHeight
      if (w > 0) vp.style.setProperty('--vp-w', `${w}px`)
      if (h > 0) vp.style.setProperty('--vp-h', `${h}px`)
      return
    }
    const w = p.scrollWidth
    let h = p.scrollHeight
    if (footer && !footer.hidden) {
      const fh = footer.offsetHeight
      if (fh > 0) {
        const mt = parseFloat(getComputedStyle(footer).marginTop) || 0
        h += fh + mt + 1 // +1 分隔线上边框（viewport 为 content-box，height 即内容高）
      }
    }
    if (w > 0) vp.style.setProperty('--vp-w', `${w}px`)
    if (h > 0) vp.style.setProperty('--vp-h', `${h}px`)
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is NavItem => {
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

  private pruneState(): void {
    const valid = new Set<string>()
    const collect = (items: MenuItem[]): void => {
      for (const i of items) {
        if (i.value != null) valid.add(i.value)
        if (i.children) collect(i.children)
      }
    }
    collect(this.itemsList)
    if (this.openValue && !valid.has(this.openValue)) this.openValue = null
    if (this.openSection && !valid.has(this.openSection)) this.openSection = null
    if (this.prevOpenValue && !valid.has(this.prevOpenValue)) this.prevOpenValue = null
    const n = this.itemsList.length
    if (this.activeIndex >= n) this.activeIndex = Math.max(0, n - 1)
  }

  /** 有效打开项：受控（value 属性存在）以属性为准，否则内部状态 */
  private effectiveOpen(): string {
    return this.hasAttr('value') ? this.getAttr('value', '') : (this.openValue ?? '')
  }

  private isVertical(): boolean {
    return this.getAttr('orientation', 'horizontal') === 'vertical'
  }

  private delayDuration(): number {
    const n = Number.parseInt(this.getAttr('delay-duration', '200'), 10)
    return Number.isFinite(n) && n >= 0 ? n : 200
  }

  private skipDelay(): number {
    const n = Number.parseInt(this.getAttr('skip-delay-duration', '300'), 10)
    return Number.isFinite(n) && n >= 0 ? n : 300
  }

  private columns(): number {
    const n = Number.parseInt(this.getAttr('columns', '2'), 10)
    return Number.isFinite(n) && n >= 1 ? n : 2
  }

  /** loop 循环导航开关：缺省 true（保持既有循环行为），仅显式 "false" 关闭 */
  private loopEnabled(): boolean {
    return this.getAttr('loop', '') !== 'false'
  }

  private findItem(value: string): NavItem | undefined {
    let found: NavItem | undefined
    const walk = (items: MenuItem[]): void => {
      for (const item of items) {
        if (item.value === value) found = item as NavItem
        else if (item.children) walk(item.children)
      }
    }
    walk(this.itemsList)
    return found
  }

  private indexOfTop(value: string): number {
    return this.itemsList.findIndex((i) => i.value === value)
  }

  // ================= 顶级触发器行 =================

  private renderBar(): void {
    const barEl = this.barEl
    if (!barEl) return
    for (const t of [...barEl.querySelectorAll<HTMLElement>('[part="top-item"]')]) t.remove()
    this.itemsList.forEach((item, idx) => {
      const hasChildren = !!item.children?.length
      const el =
        hasChildren || !item.href ? document.createElement('button') : document.createElement('a')
      el.className = 'top-item'
      el.setAttribute('part', 'top-item')
      if (item.value != null) el.dataset.value = item.value
      el.textContent = item.label ?? ''
      if (item.label) el.setAttribute('aria-label', item.label)
      if (hasChildren || !item.href) {
        el.setAttribute('type', 'button')
        el.setAttribute('aria-expanded', 'false')
        el.setAttribute('aria-controls', this.viewportId)
      } else {
        el.setAttribute('href', item.href)
        if (item.target) el.setAttribute('target', item.target)
        if (item.active) el.setAttribute('aria-current', 'page')
      }
      el.setAttribute('tabindex', idx === this.activeIndex ? '0' : '-1')
      if (item.disabled) el.setAttribute('aria-disabled', 'true')
      el.addEventListener('focus', () => {
        this.activeIndex = idx
        this.syncActive()
      })
      el.addEventListener('click', () => {
        this.keyboardMode = false
        if (item.disabled) return
        if (hasChildren) {
          if (this.effectiveOpen() === item.value) this.close()
          else this.open(item.value ?? '')
        } else {
          this.select(item)
        }
      })
      el.addEventListener('mouseenter', () => {
        this.keyboardMode = false
        if (item.disabled) return
        if (hasChildren) this.scheduleOpen(item.value ?? '')
      })
      el.addEventListener('mouseleave', () => {
        if (hasChildren) this.scheduleClose()
      })
      barEl.appendChild(el)
      if (hasChildren) {
        el.appendChild(this.createChevron())
      }
    })
  }

  private createChevron(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'chevron'
    span.setAttribute('part', 'chevron')
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML =
      '<path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    span.appendChild(svg)
    return span
  }

  // ================= 面板渲染（大面板 + inline 二级子导航） =================

  private renderPanel(): void {
    const p = this.panelEl
    if (!p) return
    const value = this.effectiveOpen()
    const item = this.findItem(value)
    if (!item?.children?.length) {
      p.innerHTML = ''
      return
    }
    // 切换顶级触发器 → 二级覆盖面板复位（主面板重渲染）
    this.openSub = null
    if (this.subPanelEl) this.subPanelEl.hidden = true
    // 常开一项：默认展开第一个 inline 二级子导航 section（排除 Sub 二级触发器）
    const firstSection = item.children.find((c) => c.children?.length && !(c as NavItem).sub)
    if (!this.openSection && firstSection?.value) this.openSection = firstSection.value
    const grid = document.createElement('ul')
    grid.className = 'grid'
    grid.setAttribute('part', 'grid')
    grid.style.setProperty('--nav-columns', String(this.columns()))
    for (const child of item.children) {
      if (child.type === 'divider') continue
      if (child.type === 'group') {
        if (child.children) {
          for (const g of child.children) this.appendPanelCell(grid, g)
        }
        continue
      }
      this.appendPanelCell(grid, child)
    }
    p.innerHTML = ''
    p.appendChild(grid)
    this.syncViewportSize()
  }

  private appendPanelCell(grid: HTMLElement, item: MenuItem): void {
    if ((item as NavItem).sub?.length) {
      // Sub 二级级联：渲染二级触发器（优先于 inline section）
      grid.appendChild(this.buildSubTrigger(item as NavItem))
    } else if (item.children?.length) {
      grid.appendChild(this.buildSection(item as NavItem))
    } else {
      grid.appendChild(this.buildCard(item as NavItem))
    }
  }

  private buildCard(item: NavItem): HTMLElement {
    const li = document.createElement('li')
    li.className = 'card'
    li.setAttribute('part', 'item')
    if (item.value != null) li.dataset.value = item.value
    const a = document.createElement('a')
    a.className = 'card-link'
    a.setAttribute('part', 'card-link')
    a.setAttribute('href', item.href ?? '#')
    if (item.target) a.setAttribute('target', item.target)
    if (item.active) a.setAttribute('aria-current', 'page')
    if (item.disabled) a.setAttribute('aria-disabled', 'true')
    if (item.icon) {
      const ic = this.createIcon(item.icon)
      if (ic) a.appendChild(ic)
    }
    const text = document.createElement('span')
    text.className = 'card-text'
    const title = document.createElement('span')
    title.className = 'card-title'
    title.textContent = item.label ?? ''
    text.appendChild(title)
    if (item.description) {
      const desc = document.createElement('span')
      desc.className = 'card-desc'
      desc.textContent = item.description
      text.appendChild(desc)
    }
    a.appendChild(text)
    a.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      if (item.disabled) {
        e.preventDefault()
        return
      }
      this.select(item)
    })
    li.appendChild(a)
    // li 空白处点击同样选中（demo-coverage 用 li DOM click 避免 <a> 跳转）
    li.addEventListener('click', () => {
      if (item.disabled) return
      this.select(item)
    })
    return li
  }

  private buildSection(item: NavItem): HTMLElement {
    const li = document.createElement('li')
    li.className = 'section'
    li.setAttribute('part', 'section')
    if (item.value != null) li.dataset.value = item.value
    const open = this.openSection === item.value
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'section-title'
    btn.setAttribute('part', 'section-title')
    if (item.value != null) btn.dataset.value = item.value
    btn.setAttribute('aria-expanded', String(open))
    btn.textContent = item.label ?? ''
    const ul = document.createElement('ul')
    ul.className = 'section-links'
    ul.setAttribute('part', 'section-links')
    if (!open) ul.hidden = true
    for (const child of item.children ?? []) {
      const li2 = document.createElement('li')
      const a2 = document.createElement('a')
      a2.setAttribute('href', (child as NavItem).href ?? '#')
      if ((child as NavItem).target) a2.setAttribute('target', (child as NavItem).target!)
      if ((child as NavItem).active) a2.setAttribute('aria-current', 'page')
      if (child.disabled) a2.setAttribute('aria-disabled', 'true')
      a2.textContent = child.label ?? ''
      if (child.value != null) a2.dataset.value = child.value
      a2.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        if (child.disabled) {
          e.preventDefault()
          return
        }
        this.select(child)
      })
      li2.appendChild(a2)
      ul.appendChild(li2)
    }
    btn.addEventListener('click', () => {
      this.keyboardMode = false
      if (item.value != null) this.toggleSection(item.value)
    })
    li.appendChild(btn)
    li.appendChild(ul)
    return li
  }

  /** inline 二级子导航：常开一项（点击已展开项保持展开，点击其他项切换） */
  private toggleSection(value: string): void {
    if (this.openSection === value) return
    this.openSection = value
    const p = this.panelEl
    if (!p) return
    for (const sec of p.querySelectorAll<HTMLElement>('[part="section"]')) {
      const isOpen = sec.dataset.value === value
      const title = sec.querySelector<HTMLElement>('[part="section-title"]')
      title?.setAttribute('aria-expanded', String(isOpen))
      const links = sec.querySelector<HTMLElement>('[part="section-links"]')
      if (links) links.hidden = !isOpen
    }
  }

  // ================= Sub 二级级联（面板内覆盖式二级面板） =================
  //
  // 设计决策：采用「面板内 absolute 覆盖式二级面板」，而非 viewport 级联换内容。
  // 理由：本组件 viewport 是单一面板容器（width/height 过渡 + data-motion 方向动画），
  // 多级内容交替塞进同一容器会破坏尺寸过渡连续性、并让主面板上下文丢失；
  // 覆盖式保留主面板 DOM 于底层，二级面板 absolute inset:0 覆盖其上（slide-in 动画），
  // Esc/ArrowLeft 逐层回退零成本。与现有 inline section 折叠并存（sub 字段优先于 children）。
  // 限制：二级面板内不再支持三级级联（sub 的 sub 不渲染）；焦点链见 handleSubKey。

  /** 二级触发器（按钮）：面板格内渲染，点击开/关覆盖式二级面板 */
  private buildSubTrigger(item: NavItem): HTMLElement {
    const li = document.createElement('li')
    li.className = 'section'
    li.setAttribute('part', 'section')
    if (item.value != null) li.dataset.value = item.value
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'sub-trigger'
    btn.setAttribute('part', 'sub-trigger')
    if (item.value != null) btn.dataset.value = item.value
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-controls', this.subPanelId)
    btn.setAttribute('aria-haspopup', 'menu')
    const label = document.createElement('span')
    label.textContent = item.label ?? ''
    btn.appendChild(label)
    const chevron = document.createElement('span')
    chevron.className = 'sub-chevron'
    chevron.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML =
      '<path d="M6 4 L10 8 L6 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    chevron.appendChild(svg)
    btn.appendChild(chevron)
    btn.addEventListener('click', () => {
      this.keyboardMode = false
      if (this.openSub === item.value) this.closeSubPanel()
      else this.openSubPanel(item.value ?? '')
    })
    li.appendChild(btn)
    return li
  }

  /** 渲染覆盖式二级面板内容：返回按钮 + sub 子项链接（href 叶子渲染 <a>） */
  private renderSubPanel(): void {
    const sp = this.subPanelEl
    if (!sp) return
    const item = this.openSub ? this.findItem(this.openSub) : undefined
    const sub = item?.sub ?? []
    sp.innerHTML = ''
    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'sub-back'
    back.setAttribute('part', 'sub-back')
    back.setAttribute('aria-label', this.t('navigationMenu.back'))
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML =
      '<path d="M10 4 L6 8 L10 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    back.appendChild(svg)
    back.append(this.t('navigationMenu.back'))
    back.addEventListener('click', () => this.closeSubPanel())
    sp.appendChild(back)
    const ul = document.createElement('ul')
    ul.className = 'sub-links'
    ul.setAttribute('role', 'list')
    for (const s of sub) {
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.className = 'sub-link'
      a.setAttribute('part', 'sub-link')
      a.setAttribute('href', s.href ?? '#')
      if (s.target) a.setAttribute('target', s.target)
      if (s.active) a.setAttribute('aria-current', 'page')
      if (s.disabled) a.setAttribute('aria-disabled', 'true')
      if (s.value != null) a.dataset.value = s.value
      a.textContent = s.label ?? ''
      a.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        if (s.disabled) {
          e.preventDefault()
          return
        }
        this.select(s)
      })
      li.appendChild(a)
      ul.appendChild(li)
    }
    sp.appendChild(ul)
  }

  /** 打开二级面板：渲染内容 + 显隐 + 焦点移入首项（键盘/鼠标共用） */
  private openSubPanel(value: string): void {
    this.openSub = value
    this.renderSubPanel()
    this.syncSubOpen()
    this.keyboardMode = true
    this.panelIndex = this.firstEnabledSubIndex()
    this.focusSubPanel()
    this.syncViewportSize()
  }

  /** 关闭二级面板：焦点回触发器（Esc/ArrowLeft/返回按钮/再点触发器） */
  private closeSubPanel(): void {
    const value = this.openSub
    this.openSub = null
    this.syncSubOpen()
    this.syncViewportSize()
    if (value) {
      const trig = this.shadow.querySelector<HTMLElement>(
        `[part="sub-trigger"][data-value="${value}"]`,
      )
      ;(trig as HTMLElement | null)?.focus()
    }
  }

  /** 二级面板开合同步：显隐 + 触发器 aria-expanded + 尺寸过渡 */
  private syncSubOpen(): void {
    const sp = this.subPanelEl
    if (sp) sp.hidden = !this.openSub
    for (const t of this.shadow.querySelectorAll<HTMLElement>('[part="sub-trigger"]')) {
      t.setAttribute('aria-expanded', String(this.openSub === (t.dataset.value ?? '')))
    }
  }

  private subFocusables(): HTMLElement[] {
    const sp = this.subPanelEl
    if (!sp) return []
    return [...sp.querySelectorAll<HTMLElement>('[part="sub-link"]')]
  }

  private firstEnabledSubIndex(): number {
    const list = this.subFocusables()
    return list.findIndex((el) => el.getAttribute('aria-disabled') !== 'true')
  }

  private focusSubPanel(): void {
    const list = this.subFocusables()
    const el = list[this.panelIndex]
    if (el) el.focus()
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

  // ================= 打开/关闭（受控 + 延迟 + 事件） =================

  /** 立即打开（点击/键盘路径，不走延迟） */
  private open(value: string): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.setOpenValue(value)
  }

  /** 立即关闭（点击/外部点击/Esc 路径） */
  private close(): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.setOpenValue('')
  }

  private setOpenValue(value: string): void {
    const prev = this.effectiveOpen()
    if (prev === value) return
    if (prev && !value) this.lastCloseAt = Date.now()
    // 切换/关闭顶级触发器 → 面板级状态（section 折叠 + Sub 二级面板）复位
    this.openSection = null
    this.openSub = null
    if (this.subPanelEl) this.subPanelEl.hidden = true
    if (!this.hasAttr('value')) this.openValue = value || null
    this.emit('change', { value })
    const open = this.effectiveOpen()
    if (open && this.findItem(open)?.children?.length) {
      if (this.prevOpenValue !== open) this.setMotion(open)
      this.renderPanel()
    } else if (!this.hasAttr('keep-mounted')) {
      if (this.panelEl) this.panelEl.innerHTML = ''
    }
    this.syncOpen()
    this.syncIndicator()
    this.syncActive()
    this.syncRoving()
  }

  private setMotion(value: string): void {
    const prevIdx = this.prevOpenValue ? this.indexOfTop(this.prevOpenValue) : -1
    const idx = this.indexOfTop(value)
    // 首次打开（无上一项）或向左 → from-start；向右 → from-end
    const motion = prevIdx < 0 ? 'from-start' : idx < prevIdx ? 'from-start' : 'from-end'
    this.panelEl?.setAttribute('data-motion', motion)
    this.prevOpenValue = value
  }

  /** hover 打开：延迟 delay-duration；命中 skip-delay 时立即打开 */
  private scheduleOpen(value: string): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    if (this.effectiveOpen() === value) return
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    const skip =
      this.skipDelay() > 0 &&
      this.lastCloseAt > 0 &&
      Date.now() - this.lastCloseAt < this.skipDelay()
    const delay = skip ? 0 : this.delayDuration()
    if (delay <= 0) {
      this.open(value)
      return
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = null
      this.open(value)
    }, delay)
  }

  /** hover 关闭：延迟 delay-duration */
  private scheduleClose(): void {
    if (!this.effectiveOpen()) return
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null
      this.close()
    }, this.delayDuration())
  }

  private select(item: MenuItem): void {
    this.emit('select', { value: item.value })
    this.close()
    if (this.keyboardMode) {
      const parentIdx = item.value != null ? this.indexOfTop(item.value) : -1
      if (parentIdx >= 0) this.activeIndex = parentIdx
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
    }
  }

  // ================= 外部点击关闭 =================

  private handleDocPointer = (e: PointerEvent): void => {
    if (!this.effectiveOpen()) return
    const t = e.target as Node | null
    if (t && (t === this || this.contains(t))) return
    this.keyboardMode = false
    this.close()
  }

  // ================= 状态同步 =================

  private syncOpen(): void {
    if (!this.shadow) return
    const open = this.effectiveOpen()
    this.navEl?.classList.toggle('open', !!open)
    this.viewportEl?.classList.toggle('open', !!open)
    this.viewportEl?.setAttribute('data-value', open)
    this.viewportEl?.classList.toggle('vertical', this.isVertical())
    this.barEl?.setAttribute('data-orientation', this.isVertical() ? 'vertical' : 'horizontal')
    this.barEl?.classList.toggle('vertical', this.isVertical())
    for (const btn of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      const v = btn.dataset.value ?? ''
      if (btn.hasAttribute('aria-expanded')) {
        btn.setAttribute('aria-expanded', String(!!open && open === v))
      }
    }
    if (this.indicatorEl) {
      this.indicatorEl.setAttribute('data-state', open ? 'open' : 'closed')
    }
    if (this.arrowEl) {
      this.arrowEl.hidden = this.getAttr('arrow', 'true') === 'false'
      this.arrowEl.classList.toggle('vertical', this.isVertical())
    }
    if (this.backdropEl) {
      this.backdropEl.classList.toggle('open', !!open && this.hasAttr('backdrop'))
    }
    // 碰撞翻转（右缘/下缘溢出）在每次开合/切换时重算
    this.syncViewportPosition()
  }

  /**
   * 碰撞/翻转检测：viewport 固定 top:100% left:0（竖排 left:100%），
   * 右缘溢出时 right 对齐（flip-right），下缘溢出时向上弹（flip-up），竖排右缘不足向左弹（flip-left）。
   * 水平右边界取「视口右缘 与 导航栏右缘」较小值——窄容器内面板也不越出容器。
   * 尺寸用 offsetWidth/scrollWidth（transform 免疫），位置用 getBoundingClientRect（面板/栏无 scale 动画）。
   */
  private syncViewportPosition(): void {
    const vp = this.viewportEl
    const bar = this.barEl
    if (!vp || !bar) return
    const open = this.effectiveOpen()
    if (!open) {
      vp.classList.remove('flip-right', 'flip-up', 'flip-left')
      return
    }
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    const size = this.viewportContentSize()
    if (this.isVertical()) {
      const barRect = bar.getBoundingClientRect()
      const rightEdge = barRect.left + bar.offsetWidth + size.w
      vp.classList.toggle('flip-left', rightEdge > vw - margin)
      vp.classList.remove('flip-right')
    } else {
      const barRect = bar.getBoundingClientRect()
      const navRect = this.navEl?.getBoundingClientRect()
      const navRight = navRect?.right ?? 0
      // 右边界 = min(视口, 导航栏右缘)；navRight 为 0（未布局/测试环境）回退视口
      const boundRight = navRight > 0 ? Math.min(vw, navRight) : vw
      const rightEdge = barRect.left + size.w
      vp.classList.toggle('flip-right', rightEdge > boundRight - margin)
      vp.classList.remove('flip-left')
    }
    const vpRect = vp.getBoundingClientRect()
    const bottom = vpRect.top + size.h
    vp.classList.toggle('flip-up', bottom > vh - margin)
    // 箭头镜像 flip 状态：箭头挂 nav 下（viewport 外），面板翻转后箭头须换边贴合面板、
    // 尖端反向指向触发器——不镜像的话箭头悬空在翻转前的位置、背对触发器
    if (this.arrowEl) {
      this.arrowEl.classList.toggle('flip-up', vp.classList.contains('flip-up'))
      this.arrowEl.classList.toggle('flip-left', vp.classList.contains('flip-left'))
    }
  }

  /** 面板内容尺寸（主面板 + 营销位；二级面板打开时以二级内容为准）——翻转/尺寸过渡共用。
   *  营销位按真实布局计（offsetHeight 含自身 padding；外距与上边分隔线一并计入），
   *  手工拼「+4」与 .panel-footer 的 margin+padding+border 实际结构不符会裁切底部。 */
  private viewportContentSize(): { w: number; h: number } {
    const p = this.panelEl
    const w = p?.scrollWidth ?? 0
    let h = p?.scrollHeight ?? 0
    const footer = this.panelFooterEl
    if (footer && !footer.hidden) {
      const fh = footer.offsetHeight
      if (fh > 0) {
        const mt = parseFloat(getComputedStyle(footer).marginTop) || 0
        h += fh + mt + 1 // +1 分隔线上边框（viewport 为 content-box，height 即内容高）
      }
    }
    const sub = this.subPanelEl
    if (sub && this.openSub && !sub.hidden) {
      const sw = sub.scrollWidth
      const sh = sub.scrollHeight
      return { w: sw > 0 ? sw : w, h: sh > 0 ? sh : h }
    }
    return { w, h }
  }

  private syncIndicator(): void {
    const ind = this.indicatorEl
    const barEl = this.barEl
    if (!ind || !barEl) return
    const open = this.effectiveOpen()
    if (!open) return
    const trigger = this.shadow.querySelector<HTMLElement>(
      `[part="top-item"][data-value="${open}"]`,
    )
    if (!trigger) return
    if (this.isVertical()) {
      const y = trigger.offsetTop
      const h = trigger.offsetHeight
      if (h > 0) {
        ind.style.setProperty('--ind-y', `${y}px`)
        ind.style.setProperty('--ind-h', `${h}px`)
      }
    } else {
      const x = trigger.offsetLeft
      const w = trigger.offsetWidth
      if (w > 0) {
        ind.style.setProperty('--ind-x', `${x}px`)
        ind.style.setProperty('--ind-w', `${w}px`)
      }
    }
    // 箭头跟随触发器：箭头挂在 nav 直下（viewport 外），坐标系=触发器相对 nav 的 offset——
    // nav 在打开期间静止，面板 width/height 过渡不再牵动箭头；垂直/翻转形态天然正确
    // （旧实现 offsetLeft 相对 bar 但箭头在 viewport 内定位，坐标系错位致箭头指偏/越界）。
    // 垂直形态开面板会 toggle bar 的 vertical 类触发横→竖排重排，同帧 offsetTop 是旧布局值——
    // rAF 等一帧重排后写入。viewport 尺寸变量同帧重算（打开瞬间面板内容布局未稳，
    // 同步测量会比终态少几像素，营销位底缘被裁）。
    requestAnimationFrame(() => {
      if (!this.effectiveOpen() || !this.isConnected) return
      this.writeArrow(trigger)
      this.syncViewportSize()
    })
  }

  /** 箭头位置写入：触发器中心投影到 nav 坐标系（offsetLeft/offsetTop 相对 bar，
   *  补偿 bar 相对 nav 的偏移——箭头定位上下文是 nav，触发器 offsetParent 是 bar） */
  private writeArrow(trigger: HTMLElement): void {
    const ar = this.arrowEl
    const bar = this.barEl
    if (!ar || !bar) return
    const bx = bar.offsetLeft
    const by = bar.offsetTop
    if (this.isVertical()) {
      const cy = by + trigger.offsetTop + trigger.offsetHeight / 2 - 6 // 半箭头高 6px（箭头高 12，与浮层家族一致）
      ar.style.setProperty('--arrow-y', `${cy}px`)
    } else {
      const cx = bx + trigger.offsetLeft + trigger.offsetWidth / 2 - 6 // 半箭头宽 6px（箭头宽 12，与浮层家族一致）
      ar.style.setProperty('--arrow-x', `${cx}px`)
    }
  }

  private syncActive(): void {
    if (!this.shadow) return
    for (const el of this.shadow.querySelectorAll('.active')) el.classList.remove('active')
    const item = this.itemsList[this.activeIndex]
    if (!item || item.value == null) return
    this.shadow
      .querySelector<HTMLElement>(`[part="top-item"][data-value="${item.value}"]`)
      ?.classList.add('active')
  }

  private syncRoving(): void {
    if (!this.shadow) return
    const open = this.effectiveOpen()
    const target = open || this.itemsList[this.activeIndex]?.value || ''
    for (const el of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      const v = el.dataset.value ?? ''
      el.setAttribute('tabindex', v === target ? '0' : '-1')
    }
  }

  private focusCurrent(): void {
    if (!this.keyboardMode) return
    const open = this.effectiveOpen()
    if (
      open &&
      this.shadow.activeElement &&
      this.panelEl?.contains(this.shadow.activeElement as Node)
    ) {
      return
    }
    if (!open) {
      const item = this.itemsList[this.activeIndex]
      if (item?.value == null) return
      this.shadow
        .querySelector<HTMLElement>(`[part="top-item"][data-value="${item.value}"]`)
        ?.focus()
    }
  }

  // ================= 键盘导航 =================

  private handleKey(e: KeyboardEvent): void {
    const open = this.effectiveOpen()
    const active = this.shadow.activeElement as Node | null
    const inPanel =
      !!open &&
      ((active != null && this.panelEl?.contains(active)) ||
        (active != null && this.subPanelEl?.contains(active)))
    if (inPanel) {
      this.handlePanelKey(e)
      return
    }
    this.handleTopKey(e)
  }

  private handleTopKey(e: KeyboardEvent): void {
    const items = this.itemsList
    const enabled = items.map((i, idx) => (i.disabled ? -1 : idx)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    this.keyboardMode = true
    const vertical = this.isVertical()
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft'
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
    const openKey = vertical ? 'ArrowRight' : 'ArrowDown'
    const active = items[this.activeIndex]
    if (e.key === prevKey) {
      e.preventDefault()
      this.moveActive(enabled, -1)
    } else if (e.key === nextKey) {
      e.preventDefault()
      this.moveActive(enabled, 1)
    } else if (e.key === openKey) {
      e.preventDefault()
      if (active && !active.disabled && active.children?.length) {
        this.open(active.value ?? '')
        this.panelIndex = this.firstEnabledPanelIndex()
        this.syncRoving()
        this.focusPanel()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!active || active.disabled) return
      if (active.children?.length) {
        if (this.effectiveOpen() === active.value) {
          this.close()
          this.syncRoving()
          this.focusCurrent()
        } else {
          this.open(active.value ?? '')
          this.panelIndex = this.firstEnabledPanelIndex()
          this.syncRoving()
          this.focusPanel()
        }
      } else {
        this.select(active)
      }
    } else if (e.key === 'Escape') {
      if (this.effectiveOpen()) {
        e.preventDefault()
        this.close()
        this.syncRoving()
        this.focusCurrent()
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.activeIndex = enabled[0]!
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
    } else if (e.key === 'End') {
      e.preventDefault()
      this.activeIndex = enabled[enabled.length - 1]!
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
    } else {
      return
    }
    this.syncActive()
    this.syncRoving()
    if (!(e.key === 'Enter' && active?.children?.length && this.effectiveOpen() === active.value)) {
      this.focusCurrent()
    }
  }

  private handlePanelKey(e: KeyboardEvent): void {
    // 二级覆盖面板打开：键盘在其内部独立处理（Esc/ArrowLeft 逐层回退，不动主面板）
    if (this.openSub) {
      this.handleSubKey(e)
      return
    }
    const focusables = this.panelFocusables()
    const enabled = focusables
      .map((el, i) => (el.getAttribute('aria-disabled') === 'true' ? -1 : i))
      .filter((i) => i >= 0)
    if (enabled.length === 0) return
    this.keyboardMode = true
    const cur = this.shadow.activeElement as HTMLElement | null
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.movePanel(enabled, e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'ArrowRight') {
      if (cur?.getAttribute('part') === 'section-title') {
        e.preventDefault()
        const val = cur.dataset.value ?? ''
        if (this.openSection !== val) this.toggleSection(val)
        const sec = cur.closest('[part="section"]')
        const first = sec?.querySelector<HTMLElement>('[part="section-links"] a')
        ;(first as HTMLElement | null)?.focus()
      } else if (cur?.getAttribute('part') === 'sub-trigger') {
        // 二级触发器 → 展开二级面板并聚焦首项（级联进入）
        e.preventDefault()
        this.openSubPanel(cur.dataset.value ?? '')
      }
    } else if (e.key === 'ArrowLeft') {
      const inSection = cur?.closest('[part="section-links"]')
      if (inSection) {
        e.preventDefault()
        const title = inSection
          .closest('[part="section"]')
          ?.querySelector<HTMLElement>('[part="section-title"]')
        ;(title as HTMLElement | null)?.focus()
      } else {
        // 面板第一项 ← 收起并回顶级
        e.preventDefault()
        this.close()
        this.syncRoving()
        this.focusCurrent()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!cur) return
      if (cur.getAttribute('part') === 'section-title') {
        const val = cur.dataset.value ?? ''
        this.toggleSection(val)
      } else {
        cur.click()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.close()
      this.syncRoving()
      this.focusCurrent()
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.panelIndex = enabled[0]!
      this.focusPanel()
    } else if (e.key === 'End') {
      e.preventDefault()
      this.panelIndex = enabled[enabled.length - 1]!
      this.focusPanel()
    } else {
      return
    }
    this.syncActive()
  }

  /** 二级覆盖面板内键盘：上下移动、Enter 选择、Esc/ArrowLeft 回退到主面板（焦点回触发器） */
  private handleSubKey(e: KeyboardEvent): void {
    const list = this.subFocusables()
    const enabled = list
      .map((el, i) => (el.getAttribute('aria-disabled') === 'true' ? -1 : i))
      .filter((i) => i >= 0)
    if (enabled.length === 0) return
    this.keyboardMode = true
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const cur = enabled.indexOf(this.panelIndex)
      const next = (cur + (e.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
      this.panelIndex = enabled[next]!
      this.focusSubPanel()
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault()
      this.closeSubPanel()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const cur = this.shadow.activeElement as HTMLElement | null
      cur?.click()
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.panelIndex = enabled[0]!
      this.focusSubPanel()
    } else if (e.key === 'End') {
      e.preventDefault()
      this.panelIndex = enabled[enabled.length - 1]!
      this.focusSubPanel()
    }
  }

  private panelFocusables(): HTMLElement[] {
    // 二级覆盖面板打开时，焦点集合 = 二级面板项（主面板不可达）
    if (this.openSub) return this.subFocusables()
    const p = this.panelEl
    if (!p) return []
    return [
      ...p.querySelectorAll<HTMLElement>(
        '[part="card-link"], [part="section-title"], [part="sub-trigger"], [part="section-links"] a',
      ),
    ]
  }

  private firstEnabledPanelIndex(): number {
    const list = this.panelFocusables()
    return list.findIndex((el) => el.getAttribute('aria-disabled') !== 'true')
  }

  private moveActive(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
    if (len === 0) return
    const cur = enabled.indexOf(this.activeIndex)
    if (!this.loopEnabled()) {
      const next = cur + dir
      if (next >= 0 && next < len) this.activeIndex = enabled[next]!
      return
    }
    this.activeIndex = enabled[(cur + dir + len) % len]!
  }

  private movePanel(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
    if (len === 0) return
    let cur = enabled.indexOf(this.panelIndex)
    if (cur < 0) cur = dir === 1 ? -1 : len
    this.panelIndex = enabled[(cur + dir + len) % len]!
    this.focusPanel()
  }

  private focusPanel(): void {
    const list = this.panelFocusables()
    const el = list[this.panelIndex]
    if (el) el.focus()
  }

  /** 文档级键盘：面板打开时 Tab 焦点陷阱 */
  private handleDocumentKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || !this.effectiveOpen()) return
    const focusables = this.panelFocusables()
    if (focusables.length === 0) return
    const active = this.shadow.activeElement as Node | null
    const inPanel =
      (active != null && this.panelEl?.contains(active)) ||
      (active != null && this.subPanelEl?.contains(active))
    if (!inPanel) return
    e.preventDefault()
    const current = focusables.indexOf(this.shadow.activeElement as HTMLElement)
    const next = e.shiftKey
      ? (current - 1 + focusables.length) % focusables.length
      : (current + 1) % focusables.length
    focusables[next]?.focus()
  }
}
