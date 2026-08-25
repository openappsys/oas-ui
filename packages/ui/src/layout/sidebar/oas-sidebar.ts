import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

/** 菜单项操作按钮：悬停项时出现，点击派发 `oas-action` */
export interface SidebarItemAction {
  icon?: string
  value: string
  label: string
}

/** 菜单项：label 必填；value 用于 `oas-select` 事件；icon 在折叠态显示（可选） */
export interface SidebarItem {
  label: string
  value: string
  icon?: string
  /** 分组名（可选）：连续同组项在组首项前渲染组标题节点（纯展示、不可点） */
  group?: string
  /** 徽标计数（可选）：项右侧小圆角徽标 */
  badge?: string | number
  /** 嵌套子菜单（可选）：有 children 的项渲染为可展开/收起的父项 */
  children?: SidebarItem[]
  /** 项操作按钮（可选）：悬停项时出现在右侧 */
  actions?: SidebarItemAction[]
}

/** 分隔线条目：`{type:'divider'}` 在菜单中渲染分隔线 */
export interface SidebarDivider {
  type: 'divider'
}

export type SidebarEntry = SidebarItem | SidebarDivider

/** 默认移动端断点（px，窄于此视口宽度时抽屉化） */
const DEFAULT_BREAKPOINT = 768

const STYLE = `
:host {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: var(--oas-sidebar-width, 220px);
  height: 100%;
  min-width: 0;
  background: var(--oas-color-bg-hover);
  font-family: inherit;
  transition: width var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
:host([hidden]) {
  display: none;
}
:host([collapsed]) {
  width: var(--oas-sidebar-collapsed-width, 64px);
}
/* 移动端：宿主不占布局空间（抽屉/触发按钮均为 fixed 定位） */
:host([data-mobile]) {
  width: auto;
  height: auto;
  background: none;
}
aside {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
  overflow-y: auto;
}
/* 移动端：面板变覆盖式抽屉（inset-inline-start 逻辑属性，RTL 自动对齐） */
:host([data-mobile]) .panel {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  width: min(var(--oas-sidebar-width, 220px), 80vw);
  max-width: 80vw;
  background: var(--oas-color-bg);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
  z-index: var(--oas-z-overlay, 1040);
  visibility: hidden;
  transform: translateX(-100%);
  transition:
    transform var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s var(--oas-transition-base, 180ms);
}
:host(:dir(rtl)) .panel {
  transform: translateX(100%);
}
:host([data-mobile]) .panel.drawer-open {
  visibility: visible;
  transform: translateX(0);
  transition:
    transform var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s;
}
/* 移动端遮罩 */
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  z-index: calc(var(--oas-z-overlay, 1040) - 1);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s var(--oas-transition-base, 180ms);
}
.mask.open {
  opacity: 1;
  visibility: visible;
  transition:
    opacity var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s;
}
/* 桌面端隐藏移动态元素 */
:host(:not([data-mobile])) .mask,
:host(:not([data-mobile])) [part='trigger'] {
  display: none;
}
:host([data-mobile]) [part='toggle'] {
  display: none;
}
/* 桌面折叠：只显示图标，隐藏头/体/脚与菜单 label */
:host(:not([data-mobile])[collapsed]) .head,
:host(:not([data-mobile])[collapsed]) .body,
:host(:not([data-mobile])[collapsed]) .foot {
  display: none;
}
:host(:not([data-mobile])[collapsed]) .item {
  justify-content: center;
  padding-inline: 0;
}
:host(:not([data-mobile])[collapsed]) .item .label {
  display: none;
}
/* 头 / 体 / 脚 */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2, 8px);
  padding: var(--oas-space-3, 12px);
}
[part='close'] {
  border: none;
  background: none;
  padding: var(--oas-space-1, 4px);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-size: var(--oas-font-size-md, 14px);
  font-family: inherit;
}
[part='close']:hover {
  color: var(--oas-color-text-primary);
}
.body {
  padding: var(--oas-space-3, 12px);
}
.foot {
  margin-top: auto;
  padding: var(--oas-space-3, 12px);
}
/* 菜单 */
.nav {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1, 4px);
  padding: var(--oas-space-2, 8px);
}
.item {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3, 12px);
  width: 100%;
  min-height: var(--oas-control-height-lg, 40px);
  padding: 0 var(--oas-space-3, 12px);
  border: none;
  background: none;
  border-radius: var(--oas-radius-md, 6px);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md, 14px);
  font-family: inherit;
  white-space: nowrap;
  text-align: start;
}
.item:hover {
  background: var(--oas-color-bg-hover);
}
.item.active {
  background: color-mix(in srgb, var(--oas-color-primary) 14%, transparent);
  color: var(--oas-color-primary);
  font-weight: 500;
}
.item.active .icon {
  color: var(--oas-color-primary);
}
.item[hidden] {
  display: none;
}
.item .icon {
  flex-shrink: 0;
  width: var(--oas-control-height-md, 32px);
  text-align: center;
  font-size: var(--oas-font-size-lg, 16px);
  color: var(--oas-color-text-secondary);
}
.item .label {
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 组标题：弱化小标题，纯展示不可点；折叠态隐藏（同 .item .label） */
.group-title {
  padding: var(--oas-space-2, 8px) var(--oas-space-3, 12px) var(--oas-space-1, 4px);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs, 12px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:host(:not([data-mobile])[collapsed]) .group-title {
  display: none;
}
/* 徽标：项右侧小圆角计数（色值走 --oas-sidebar-badge-* 开口，默认主色浅调） */
.item-badge {
  flex-shrink: 0;
  margin-inline-start: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1, 4px);
  border-radius: 9px;
  background: var(--oas-sidebar-badge-bg, color-mix(in srgb, var(--oas-color-primary) 14%, transparent));
  color: var(--oas-sidebar-badge-color, var(--oas-color-primary));
  font-size: var(--oas-font-size-xs, 12px);
  line-height: 18px;
  white-space: nowrap;
}
/* 嵌套父项：展开箭头（展开时旋转） */
.chevron {
  flex-shrink: 0;
  margin-inline-start: auto;
  display: inline-flex;
  color: var(--oas-color-text-secondary);
  transition: transform var(--oas-transition-fast, 120ms) var(--oas-ease-out);
}
.item[aria-expanded='true'] .chevron {
  transform: rotate(90deg);
}
.item-badge + .chevron {
  margin-inline-start: var(--oas-space-2, 8px);
}
/* 嵌套子项：缩进 + 左侧引导线 */
.sub {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1, 4px);
  margin-inline-start: calc(var(--oas-control-height-md, 32px) / 2 + var(--oas-space-3, 12px));
  padding-inline-start: var(--oas-space-3, 12px);
  border-inline-start: 1px solid var(--oas-color-border);
}
.item.sub .icon {
  width: var(--oas-control-height-sm, 24px);
}
/* 项操作按钮：默认隐藏，悬停/聚焦项时出现 */
.item-actions {
  flex-shrink: 0;
  margin-inline-start: auto;
  display: none;
  align-items: center;
  gap: var(--oas-space-1, 4px);
}
.item:hover .item-actions,
.item:focus-within .item-actions {
  display: inline-flex;
}
.item-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--oas-radius-sm, 4px);
  background: none;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-size: var(--oas-font-size-sm, 13px);
  font-family: inherit;
}
.item-action:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
/* 分隔线 */
.divider {
  height: 1px;
  margin: var(--oas-space-2, 8px) var(--oas-space-3, 12px);
  background: var(--oas-color-border);
}
/* 边缘拖拽条（resizable）：贴宿主右缘，桌面态显示；折叠/移动态隐藏 */
[part='rail'] {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  width: 6px;
  margin-inline-end: -3px;
  cursor: col-resize;
  touch-action: none;
  z-index: 1;
}
[part='rail']::after {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 2px;
  width: 2px;
  background: transparent;
  border-radius: 2px;
  transition: background var(--oas-transition-fast, 120ms) var(--oas-ease-out);
}
[part='rail']:hover::after,
[part='rail']:focus-visible::after,
:host([data-resizing]) [part='rail']::after {
  background: var(--oas-color-primary);
}
:host(:not([data-mobile])[collapsed]) [part='rail'],
:host([data-mobile]) [part='rail'] {
  display: none;
}
:host {
  position: relative;
}
:host([data-resizing]) {
  user-select: none;
  transition: none;
}
/* 骨架屏：loading 态脉冲骨架行（与宿主 bg-hover 底色区分开，用主文字色低透明度混色） */
.skeleton {
  height: var(--oas-control-height-lg, 40px);
  border-radius: var(--oas-radius-md, 6px);
  background: color-mix(in srgb, var(--oas-color-text-primary) 9%, transparent);
  animation: oas-sidebar-pulse 1.2s var(--oas-ease-out, ease-in-out) infinite;
}
@keyframes oas-sidebar-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
/* expand-on-hover：折叠图标条悬停临时展开（视觉态，不改 collapsed 受控） */
:host(:not([data-mobile])[collapsed][expand-on-hover]:hover) {
  width: var(--oas-sidebar-width, 220px);
  position: relative;
  z-index: calc(var(--oas-z-dropdown, 1000) + 1);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
}
:host(:not([data-mobile])[collapsed][expand-on-hover]:hover) .item .label,
:host(:not([data-mobile])[collapsed][expand-on-hover]:hover) .group-title {
  display: inline;
}
:host(:not([data-mobile])[collapsed][expand-on-hover]:hover) .group-title {
  display: block;
}
:host(:not([data-mobile])[collapsed][expand-on-hover]:hover) .item {
  justify-content: flex-start;
  padding-inline: var(--oas-space-3, 12px);
}
:host(:not([data-mobile])[collapsed][expand-on-hover]:hover) .item[hidden] {
  display: flex;
}
/* side=right：移动抽屉从右侧滑入、触发按钮居右 */
:host([data-mobile][side='right']) .panel {
  inset-inline-start: auto;
  inset-inline-end: 0;
  transform: translateX(100%);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.12);
}
:host([data-mobile][side='right']) .panel.drawer-open {
  transform: translateX(0);
}
:host([data-mobile][side='right']) [part='trigger'] {
  inset-inline-start: auto;
  inset-inline-end: var(--oas-space-4, 16px);
}
:host(:dir(rtl)) [data-mobile][side='right'] .panel,
:host([data-mobile][side='right']:dir(rtl)) .panel {
  transform: translateX(-100%);
}
:host([data-mobile][side='right']:dir(rtl)) .panel.drawer-open {
  transform: translateX(0);
}
/* variant=floating：悬浮形态（外边距 + 圆角 + 阴影） */
:host([variant='floating']) {
  margin: var(--oas-space-3, 12px);
  height: calc(100% - var(--oas-space-3, 12px) * 2);
  border-radius: var(--oas-radius-lg, 10px);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
/* variant=inset：内嵌形态（外边距 + 圆角 + 背景对比） */
:host([variant='inset']) {
  margin: var(--oas-space-3, 12px);
  height: calc(100% - var(--oas-space-3, 12px) * 2);
  border-radius: var(--oas-radius-lg, 10px);
  background: var(--oas-color-bg-hover);
  overflow: hidden;
}
:host([variant='floating']) aside,
:host([variant='inset']) aside {
  border-radius: inherit;
}
/* 折叠切换按钮 */
[part='toggle'] {
  flex-shrink: 0;
  height: var(--oas-control-height-lg, 40px);
  border: none;
  border-top: 1px solid var(--oas-color-border);
  background: none;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-size: var(--oas-font-size-sm, 13px);
  font-family: inherit;
}
[part='toggle']:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
/* 移动端抽屉触发按钮（固定悬浮，在遮罩层级之下） */
[part='trigger'] {
  position: fixed;
  top: var(--oas-space-4, 16px);
  inset-inline-start: var(--oas-space-4, 16px);
  width: var(--oas-control-height-lg, 40px);
  height: var(--oas-control-height-lg, 40px);
  border: none;
  border-radius: var(--oas-radius-md, 6px);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg, 16px);
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  z-index: calc(var(--oas-z-overlay, 1040) - 1);
}
[part='trigger']:hover {
  background: var(--oas-color-bg-hover);
}
@media (prefers-reduced-motion: reduce) {
  :host,
  .panel,
  .mask {
    transition: none;
  }
}
`

/**
 * oas-sidebar —— 与 layout/sider 对齐的可折叠侧栏。
 *
 * 属性（kebab-case）：
 * - `collapsed`：受控折叠，收窄为图标条（无 icon 的菜单项隐藏）
 * - `items`：可选菜单 JSON `[{label, value, icon?}]`
 * - `width`：展开宽度，默认走 `--oas-sidebar-width` token
 * - `mobile-breakpoint`：移动端断点（px，默认 768），窄于此视口时变覆盖式抽屉
 *
 * 事件：
 * - `oas-collapse`：detail `{ collapsed }`，桌面折叠按钮切换时派发
 * - `oas-select`：detail `{ value, label }`，选中菜单项时派发
 *
 * 移动端抽屉：遮罩 + 点击外部/关闭按钮/Esc 收起；断点回桌面自动关抽屉，无孤儿浮层。
 */
export class OASSidebar extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'collapsed',
      'items',
      'width',
      'mobile-breakpoint',
      'active',
      'drawer-open',
      'loading',
      'expand-on-hover',
      'shortcut',
      'side',
      'variant',
      'resizable',
      'resize-min',
      'resize-max',
    ]
  }

  private _items: SidebarEntry[] = []

  /** Vue/React 会把 items 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get items(): SidebarEntry[] {
    return this._items
  }
  set items(value: SidebarEntry[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }
  private mq: MediaQueryList | null = null
  /** 展开的嵌套父项 value 集合（父项点击切换） */
  private expanded = new Set<string>()
  /** 嵌套父项含激活子项时自动展开（记录已自动展开的，避免渲染循环反复重置用户手动操作） */
  private autoExpanded = new Set<string>()

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <aside part="root">
        <div class="panel" part="panel">
          <div class="head" part="head">
            <slot name="header"></slot>
            <button part="close" type="button" hidden>✕</button>
          </div>
          <nav class="nav" part="nav"></nav>
          <div class="body" part="body"><slot></slot></div>
          <div class="foot" part="foot"><slot name="footer"></slot></div>
        </div>
        <button part="toggle" type="button" aria-expanded="true"></button>
        <div part="rail" role="separator" aria-orientation="vertical" tabindex="0" hidden></div>
      </aside>
      <button part="trigger" type="button" hidden><svg viewBox="0 0 16 16" width="1.25em" height="1.25em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4.5 H13 M3 8 H13 M3 11.5 H13"/></svg></button>
      <div class="mask" part="mask"></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('.mask')?.addEventListener('click', () => this.closeDrawer())
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => this.closeDrawer())
    this.shadow
      .querySelector('[part="trigger"]')
      ?.addEventListener('click', () => this.openDrawer())
    this.shadow
      .querySelector('[part="toggle"]')
      ?.addEventListener('click', () => this.toggleCollapsed())

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.closeDrawer()
      // ctrl/cmd+b 折叠切换（仅 shortcut 属性开启时，避免默认劫持全局键）
      if (
        this.hasAttr('shortcut') &&
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'b'
      ) {
        e.preventDefault()
        this.toggleCollapsed()
      }
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))

    // 菜单键盘导航：↑/↓ 在可见项间移动焦点（Home/End 跳首末；Enter/Space 走原生 button 激活）
    const nav = this.shadow.querySelector('.nav')
    nav?.addEventListener('keydown', (e) => this.onNavKey(e))

    // 边缘拖拽条（resizable）：pointer 拖拽调宽 + 方向键微调
    const rail = this.shadow.querySelector<HTMLElement>('[part="rail"]')
    rail?.addEventListener('pointerdown', (e) => this.startRailDrag(e))
    rail?.addEventListener('keydown', (e) => this.onRailKey(e))

    this.syncMq()
    this.onCleanup(() => this.mq?.removeEventListener('change', this.mqListener))
  }

  /** rail 拖拽：以 width 属性为唯一事实源（update 会写入 CSS 变量，不冲突） */
  private railDragging = false
  private railStartX = 0
  private railStartWidth = 0

  private resizeMin(): number {
    return Number(this.getAttr('resize-min', '160')) || 160
  }
  private resizeMax(): number {
    return Number(this.getAttr('resize-max', '480')) || 480
  }

  private startRailDrag(e: Event): void {
    const pe = e as PointerEvent
    if (pe.button !== 0 && pe.pointerType !== 'touch') return
    e.preventDefault()
    this.railDragging = true
    this.railStartX = pe.clientX
    this.railStartWidth = this.getBoundingClientRect().width
    this.setAttribute('data-resizing', '')
    document.addEventListener('pointermove', this.onRailDrag)
    document.addEventListener('pointerup', this.endRailDrag, { once: true })
  }

  private onRailDrag = (e: PointerEvent): void => {
    if (!this.railDragging) return
    // side=right 的侧栏在屏幕右侧，向左拖才变宽（delta 取反）
    const sign = this.getAttr('side') === 'right' ? -1 : 1
    const next = this.railStartWidth + sign * (e.clientX - this.railStartX)
    this.setWidthPx(next)
  }

  private endRailDrag = (): void => {
    if (!this.railDragging) return
    this.railDragging = false
    this.removeAttribute('data-resizing')
    document.removeEventListener('pointermove', this.onRailDrag)
    this.emit('resize', { width: this.currentWidthPx() })
  }

  /** 当前宽度 px（width 属性优先，回落实际盒宽） */
  private currentWidthPx(): number {
    const fromAttr = parseInt(this.getAttr('width', '0'), 10)
    return Number.isFinite(fromAttr) && fromAttr > 0
      ? fromAttr
      : this.getBoundingClientRect().width
  }

  /** 方向键微调宽度（±8px；Home/End 跳最小/最大） */
  private onRailKey(e: Event): void {
    const ke = e as KeyboardEvent
    const step = 8
    const sign = this.getAttr('side') === 'right' ? -1 : 1
    const cur = this.currentWidthPx()
    if (ke.key === 'ArrowRight') {
      ke.preventDefault()
      this.setWidthPx(cur + sign * step)
    } else if (ke.key === 'ArrowLeft') {
      ke.preventDefault()
      this.setWidthPx(cur - sign * step)
    } else if (ke.key === 'Home') {
      ke.preventDefault()
      this.setWidthPx(this.resizeMin())
    } else if (ke.key === 'End') {
      ke.preventDefault()
      this.setWidthPx(this.resizeMax())
    } else {
      return
    }
    this.emit('resize', { width: this.currentWidthPx() })
  }

  private setWidthPx(px: number): void {
    const clamped = Math.round(Math.min(this.resizeMax(), Math.max(this.resizeMin(), px)))
    this.setAttribute('width', `${clamped}px`)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（panel 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.panel')) return false
    this.bind()
    return true
  }

  /** matchMedia 变化：断点穿越时重新判定（抽屉关闭逻辑收敛在 update） */
  private mqListener = (): void => {
    this.update()
  }

  private syncMq(): void {
    const bp =
      Number(this.getAttr('mobile-breakpoint', String(DEFAULT_BREAKPOINT))) || DEFAULT_BREAKPOINT
    const media = `(max-width: ${bp}px)`
    if (this.mq && this.mq.media === media) return
    this.mq?.removeEventListener('change', this.mqListener)
    this.mq = window.matchMedia?.(media) ?? null
    this.mq?.addEventListener('change', this.mqListener)
  }

  /** 菜单键盘导航：ArrowDown/Up 移动焦点、Home/End 跳首末 */
  private onNavKey(e: Event): void {
    const ke = e as KeyboardEvent
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ke.key)) return
    const items = [...this.shadow.querySelectorAll<HTMLElement>('.nav [part="item"]')].filter(
      (b) => !b.hidden,
    )
    if (!items.length) return
    e.preventDefault()
    const activeEl = this.shadow.activeElement as HTMLElement | null
    const idx = activeEl ? items.indexOf(activeEl) : -1
    let next = 0
    if (ke.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length
    else if (ke.key === 'ArrowUp')
      next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length
    else if (ke.key === 'Home') next = 0
    else next = items.length - 1
    items[next]?.focus()
  }

  protected override update(): void {
    this.syncMq()
    const mobile = this.mq?.matches ?? false
    // 桌面态不允许残留抽屉浮层（防孤儿）
    if (!mobile && this.hasAttr('drawer-open')) this.removeAttribute('drawer-open')
    const drawerOpen = mobile && this.hasAttr('drawer-open')

    if (mobile) this.dataset.mobile = 'true'
    else delete this.dataset.mobile

    const panel = this.shadow.querySelector<HTMLElement>('.panel')
    if (panel) {
      panel.classList.toggle('drawer-open', drawerOpen)
      // 仅移动端做 aria-hidden（桌面面板常驻可见，不能隐藏）
      if (mobile) panel.setAttribute('aria-hidden', String(!drawerOpen))
      else panel.removeAttribute('aria-hidden')
    }
    this.shadow.querySelector<HTMLElement>('.mask')?.classList.toggle('open', drawerOpen)

    const toggle = this.shadow.querySelector<HTMLElement>('[part="toggle"]')
    const trigger = this.shadow.querySelector<HTMLElement>('[part="trigger"]')
    const close = this.shadow.querySelector<HTMLElement>('[part="close"]')
    if (toggle) toggle.hidden = mobile
    if (trigger) trigger.hidden = !mobile
    if (close) close.hidden = !drawerOpen

    // 内置文案走 locale registry（setLocale 切换自动重刷 update）
    this.shadow
      .querySelector<HTMLElement>('.nav')
      ?.setAttribute('aria-label', this.t('sidebar.nav'))
    if (toggle) {
      const collapsed = this.hasAttr('collapsed')
      toggle.setAttribute('aria-expanded', String(!collapsed))
      toggle.setAttribute(
        'aria-label',
        collapsed ? this.t('sidebar.expand') : this.t('sidebar.toggle'),
      )
      toggle.textContent = collapsed ? '»' : '«'
    }
    if (trigger) trigger.setAttribute('aria-label', this.t('sidebar.openMenu'))
    if (close) close.setAttribute('aria-label', this.t('sidebar.closeMenu'))

    // 边缘拖拽条：仅桌面 + resizable + 非折叠时显示；aria-label 走 locale
    const rail = this.shadow.querySelector<HTMLElement>('[part="rail"]')
    if (rail) {
      const showRail = this.hasAttr('resizable') && !mobile && !this.hasAttr('collapsed')
      rail.hidden = !showRail
      if (showRail) rail.setAttribute('aria-label', this.t('sidebar.resize'))
    }

    // width 属性 → 覆盖展开宽度 token
    const width = this.getAttr('width')
    if (width) this.style.setProperty('--oas-sidebar-width', width)
    else this.style.removeProperty('--oas-sidebar-width')

    // 移动端抽屉始终展示完整项；桌面折叠态只保留图标项
    this.renderItems(this.hasAttr('collapsed') && !mobile)
  }

  private renderItems(collapsed: boolean): void {
    const nav = this.shadow.querySelector<HTMLElement>('.nav')
    if (!nav) return
    this.parseItems()
    nav.innerHTML = ''
    // loading 骨架屏：渲染脉冲骨架行，不渲染菜单
    if (this.hasAttr('loading')) {
      const n = Math.max(1, Number(this.getAttr('loading', '4')) || 4)
      for (let i = 0; i < n; i++) {
        const row = document.createElement('div')
        row.className = 'skeleton'
        row.setAttribute('part', 'skeleton')
        row.setAttribute('aria-hidden', 'true')
        nav.appendChild(row)
      }
      return
    }
    const active = this.getAttr('active', '')
    let currentGroup: string | undefined
    for (const entry of this._items) {
      if ('type' in entry && entry.type === 'divider') {
        currentGroup = undefined
        const divider = document.createElement('div')
        divider.className = 'divider'
        divider.setAttribute('part', 'divider')
        divider.setAttribute('role', 'separator')
        nav.appendChild(divider)
        continue
      }
      const item = entry as SidebarItem
      const group = item.group?.trim()
      // 组首项前渲染组标题（纯展示、part=group；无 group 或换组时插入）
      if (group && group !== currentGroup) {
        const title = document.createElement('div')
        title.className = 'group-title'
        title.setAttribute('part', 'group')
        title.textContent = group
        nav.appendChild(title)
      }
      currentGroup = group || undefined
      nav.appendChild(this.renderItem(item, collapsed, active, 0))
    }
  }

  /** 渲染单个菜单项（含徽标/操作/嵌套子项；collapsed=桌面图标条态） */
  private renderItem(item: SidebarItem, collapsed: boolean, active: string, depth: number): HTMLElement {
    const hasChildren = !!item.children?.length
    const btn = document.createElement('button')
    btn.className = 'item'
    btn.setAttribute('part', 'item')
    btn.type = 'button'
    btn.setAttribute('aria-label', item.label)
    btn.dataset.value = item.value
    if (depth > 0) btn.classList.add('sub')
    const isActive = !hasChildren && item.value === active
    if (isActive) {
      btn.classList.add('active')
      btn.setAttribute('aria-current', 'page')
    }
    const icon = document.createElement('span')
    icon.className = 'icon'
    const iconSvg = item.icon ? this.iconSvg(item.icon) : null
    if (iconSvg) {
      icon.innerHTML = iconSvg
    } else if (item.icon) {
      // 非注册表名下的自定义图标名：回退文本（不静默丢失）
      icon.textContent = item.icon
    } else {
      icon.hidden = true
    }
    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = item.label
    btn.append(icon, label)
    // 徽标：项右侧小圆角计数
    if (item.badge != null && item.badge !== '') {
      const badge = document.createElement('span')
      badge.className = 'item-badge'
      badge.setAttribute('part', 'badge')
      badge.textContent = String(item.badge)
      btn.appendChild(badge)
    }
    // 嵌套父项：右侧展开箭头；点击切换展开（不派发 select）
    let subWrap: HTMLElement | null = null
    if (hasChildren) {
      // 含激活子项的父项自动展开（一次，不打断用户后续手动收起）
      const hasActiveChild = this.findActiveChild(item.children!, active)
      if (hasActiveChild && !this.autoExpanded.has(item.value)) {
        this.expanded.add(item.value)
        this.autoExpanded.add(item.value)
      }
      const expanded = this.expanded.has(item.value)
      btn.setAttribute('aria-expanded', String(expanded))
      const chevron = document.createElement('span')
      chevron.className = 'chevron'
      chevron.setAttribute('aria-hidden', 'true')
      chevron.innerHTML = this.chevronSvg()
      btn.appendChild(chevron)
      subWrap = document.createElement('div')
      subWrap.className = 'sub'
      subWrap.setAttribute('part', 'submenu')
      subWrap.hidden = !expanded
      for (const child of item.children!) {
        if ('type' in child && (child as SidebarDivider).type === 'divider') {
          const d = document.createElement('div')
          d.className = 'divider'
          d.setAttribute('part', 'divider')
          d.setAttribute('role', 'separator')
          subWrap.appendChild(d)
        } else {
          subWrap.appendChild(this.renderItem(child as SidebarItem, collapsed, active, depth + 1))
        }
      }
      btn.addEventListener('click', () => {
        if (this.expanded.has(item.value)) this.expanded.delete(item.value)
        else this.expanded.add(item.value)
        btn.setAttribute('aria-expanded', String(this.expanded.has(item.value)))
        subWrap!.hidden = !this.expanded.has(item.value)
      })
    } else {
      btn.addEventListener('click', () => {
        this.emit('select', { value: item.value, label: item.label })
        if (this.hasAttr('drawer-open')) this.closeDrawer()
      })
    }
    // 项操作按钮：悬停项时出现；点击派发 oas-action（不触发 select/展开）
    if (item.actions?.length) {
      const actions = document.createElement('span')
      actions.className = 'item-actions'
      for (const action of item.actions) {
        const actionBtn = document.createElement('button')
        actionBtn.className = 'item-action'
        actionBtn.setAttribute('part', 'action')
        actionBtn.type = 'button'
        actionBtn.setAttribute('aria-label', action.label)
        const aSvg = action.icon ? this.iconSvg(action.icon) : null
        if (aSvg) actionBtn.innerHTML = aSvg
        else actionBtn.textContent = action.label
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.emit('action', { value: item.value, action: action.value, label: action.label })
        })
        actions.appendChild(actionBtn)
      }
      btn.appendChild(actions)
    }
    // 折叠态无图标项整体隐藏（仅保留图标）；嵌套子项在折叠态隐藏
    if (collapsed && !item.icon) btn.hidden = true
    // 折叠态：图标项包 tooltip（label 提示，placement=right）
    let out: HTMLElement = btn
    if (collapsed && item.icon && !hasChildren) {
      const tip = document.createElement('oas-tooltip')
      tip.setAttribute('content', item.label)
      tip.setAttribute('placement', 'right')
      tip.appendChild(btn)
      out = tip as unknown as HTMLElement
    }
    if (subWrap) {
      const frag = document.createElement('div')
      frag.className = 'item-block'
      frag.append(out, subWrap)
      // 折叠态嵌套父项的子树隐藏
      if (collapsed) subWrap.hidden = true
      return frag
    }
    return out
  }

  /** 递归查找激活子项（用于父项自动展开） */
  private findActiveChild(children: SidebarEntry[], active: string): boolean {
    for (const c of children) {
      if ('type' in c && (c as SidebarDivider).type === 'divider') continue
      const item = c as SidebarItem
      if (item.value === active) return true
      if (item.children && this.findActiveChild(item.children, active)) return true
    }
    return false
  }

  private chevronSvg(): string {
    return `<svg viewBox="0 0 16 16" width="0.9em" height="0.9em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5 L10 8 L6 11.5"/></svg>`
  }

  /** 图标名（注册表）→ 内联 SVG（fill/stroke=currentColor，随禁用/激活态着色） */
  private iconSvg(name: string): string | null {
    const path = iconRegistry[name as IconName] ?? null
    if (!path) return null
    return `<svg viewBox="0 0 16 16" width="1.25em" height="1.25em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this._items = Array.isArray(parsed)
        ? parsed
            .map((e): SidebarEntry | null => this.parseEntry(e))
            .filter((e): e is SidebarEntry => e !== null)
        : []
    } catch {
      this._items = []
    }
  }

  /** 递归解析条目：divider 直通；item 校验 label/value，children 递归校验 */
  private parseEntry(e: unknown): SidebarEntry | null {
    if (!e || typeof e !== 'object') return null
    const entry = e as Record<string, unknown>
    if (entry.type === 'divider') return { type: 'divider' }
    if (typeof entry.label !== 'string' || typeof entry.value !== 'string') return null
    const item: SidebarItem = {
      label: entry.label,
      value: entry.value,
      icon: typeof entry.icon === 'string' ? entry.icon : undefined,
      group: typeof entry.group === 'string' ? entry.group : undefined,
      badge:
        typeof entry.badge === 'string' || typeof entry.badge === 'number'
          ? (entry.badge as string | number)
          : undefined,
      actions: Array.isArray(entry.actions)
        ? (entry.actions as unknown[])
            .filter(
              (a): a is SidebarItemAction =>
                !!a &&
                typeof (a as SidebarItemAction).value === 'string' &&
                typeof (a as SidebarItemAction).label === 'string',
            )
            .map((a) => ({ icon: a.icon, value: a.value, label: a.label }))
        : undefined,
      children: Array.isArray(entry.children)
        ? (entry.children as unknown[])
            .map((c) => this.parseEntry(c))
            .filter((c): c is SidebarItem => c !== null && (c as SidebarItem).label !== undefined) as SidebarItem[]
        : undefined,
    }
    return item
  }

  /** 桌面折叠切换：受控属性 + 派发事件供宿主响应 */
  private toggleCollapsed(): void {
    const collapsed = this.hasAttr('collapsed')
    if (collapsed) this.removeAttribute('collapsed')
    else this.setAttribute('collapsed', '')
    this.emit('collapse', { collapsed: !collapsed })
    this.update()
  }

  private openDrawer(): void {
    if (this.hasAttr('drawer-open')) return
    this.setAttribute('drawer-open', '')
    this.update()
  }

  private closeDrawer(): void {
    if (!this.hasAttr('drawer-open')) return
    this.removeAttribute('drawer-open')
    this.update()
  }
}
