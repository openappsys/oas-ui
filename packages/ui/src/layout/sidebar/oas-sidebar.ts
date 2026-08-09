import { OASElement } from '@oas-ui/core'

/** 菜单项：label 必填；value 用于 `oas-select` 事件；icon 在折叠态显示（可选） */
export interface SidebarItem {
  label: string
  value: string
  icon?: string
}

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
/* 桌面折叠切换按钮 */
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
    return ['collapsed', 'items', 'width', 'mobile-breakpoint']
  }

  private _items: SidebarItem[] = []

  /** Vue/React 会把 items 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get items(): SidebarItem[] {
    return this._items
  }
  set items(value: SidebarItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }
  private mq: MediaQueryList | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
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
      </aside>
      <button part="trigger" type="button" hidden>☰</button>
      <div class="mask" part="mask"></div>
    `
    this.shadow.querySelector('.mask')?.addEventListener('click', () => this.closeDrawer())
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => this.closeDrawer())
    this.shadow.querySelector('[part="trigger"]')?.addEventListener('click', () => this.openDrawer())
    this.shadow.querySelector('[part="toggle"]')?.addEventListener('click', () => this.toggleCollapsed())

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))

    this.syncMq()
    this.onCleanup(() => this.mq?.removeEventListener('change', this.mqListener))
    this.update()
  }

  /** matchMedia 变化：断点穿越时重新判定（抽屉关闭逻辑收敛在 update） */
  private mqListener = (): void => {
    this.update()
  }

  private syncMq(): void {
    const bp = Number(this.getAttr('mobile-breakpoint', String(DEFAULT_BREAKPOINT))) || DEFAULT_BREAKPOINT
    const media = `(max-width: ${bp}px)`
    if (this.mq && this.mq.media === media) return
    this.mq?.removeEventListener('change', this.mqListener)
    this.mq = window.matchMedia?.(media) ?? null
    this.mq?.addEventListener('change', this.mqListener)
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
    this.shadow.querySelector<HTMLElement>('.nav')?.setAttribute('aria-label', this.t('sidebar.nav'))
    if (toggle) {
      const collapsed = this.hasAttr('collapsed')
      toggle.setAttribute('aria-expanded', String(!collapsed))
      toggle.setAttribute('aria-label', collapsed ? this.t('sidebar.expand') : this.t('sidebar.toggle'))
      toggle.textContent = collapsed ? '»' : '«'
    }
    if (trigger) trigger.setAttribute('aria-label', this.t('sidebar.openMenu'))
    if (close) close.setAttribute('aria-label', this.t('sidebar.closeMenu'))

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
    for (const item of this._items) {
      const btn = document.createElement('button')
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.type = 'button'
      btn.setAttribute('aria-label', item.label)
      btn.dataset.value = item.value
      const icon = document.createElement('span')
      icon.className = 'icon'
      if (item.icon) icon.textContent = item.icon
      else icon.hidden = true
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = item.label
      btn.append(icon, label)
      // 折叠态无图标项整体隐藏（仅保留图标）
      if (collapsed && !item.icon) btn.hidden = true
      btn.addEventListener('click', () => {
        this.emit('select', { value: item.value, label: item.label })
        if (this.hasAttr('drawer-open')) this.closeDrawer()
      })
      nav.appendChild(btn)
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this._items = Array.isArray(parsed)
        ? parsed.filter(
            (i): i is SidebarItem =>
              i && typeof i.label === 'string' && typeof i.value === 'string',
          )
        : []
    } catch {
      this._items = []
    }
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
