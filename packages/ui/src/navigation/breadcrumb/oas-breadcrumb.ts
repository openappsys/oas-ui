import { OASElement } from '@oas-ui/core'

export interface BreadcrumbItem {
  label: string
  href?: string
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
nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
/* ellipsis 单行省略：容器不换行、整体超宽截断，链接文本各自省略 */
nav.ellipsis {
  flex-wrap: nowrap;
  overflow: hidden;
}
nav.ellipsis .item {
  min-width: 0;
}
nav.ellipsis .sep,
nav.ellipsis .ellipsis-btn {
  flex-shrink: 0;
}
nav.ellipsis [part='link'],
nav.ellipsis [part='current'] {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.item {
  display: inline-flex;
  align-items: center;
}
.sep {
  margin: 0 var(--oas-space-2);
  color: var(--oas-color-border);
  user-select: none;
}
[part='link'] {
  color: var(--oas-color-text-secondary);
  text-decoration: none;
  cursor: pointer;
}
[part='link']:hover {
  color: var(--oas-color-primary);
}
[part='current'] {
  color: var(--oas-color-text-primary);
  font-weight: 500;
  white-space: nowrap;
}
/* 折叠省略按钮：锚定下拉面板 */
.ellipsis-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.ellipsis-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0 var(--oas-space-1);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: 1.6;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.ellipsis-btn:hover,
.ellipsis-btn[aria-expanded='true'] {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.ellipsis-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.ellipsis-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: var(--oas-z-dropdown);
  min-width: 140px;
  max-width: 260px;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  display: none;
}
.ellipsis-dropdown.open {
  display: block;
}
.ellipsis-item {
  padding: var(--oas-space-1) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ellipsis-item:hover {
  background: var(--oas-color-bg-hover);
}
.ellipsis-item a {
  display: block;
  color: var(--oas-color-text-secondary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ellipsis-item a:hover {
  color: var(--oas-color-primary);
}
.ellipsis-item[aria-disabled='true'] {
  color: var(--oas-color-text-disabled);
  cursor: default;
}
.ellipsis-item[aria-disabled='true']:hover {
  background: transparent;
}
`

export class OASBreadcrumb extends OASElement {
  static override get observedAttributes: string[] {
    return ['items', 'separator', 'collapsed', 'max-items', 'ellipsis']
  }

  /** 折叠下拉展开状态（跨 update 重建保留） */
  private openState = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template: string {
    return `
      <style>${STYLE}</style>
      <nav part="nav"></nav>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；面包屑项事件在 update 重建时绑定） */
  private bind: void {
    // 组件断开时清理下拉的 document 点击监听（连接期间打开/关闭反复 add/remove，此处兜底移除）
    this.onCleanup( => document.removeEventListener('click', this.handleOutsideClick))
  }

  protected override render: void {
    this.shadow.innerHTML = this.template
    this.bind
    this.update
  }

  /** 真水合：校验 SSR 快照结构（nav 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate: boolean {
    if (!this.shadow.querySelector('nav')) return false
    this.bind
    return true
  }

  protected override update: void {
    const nav = this.shadow.querySelector('nav')
    if (!nav) return
    // 导航 aria-label locale 驱动（setLocale 切换自动重刷）
    nav.setAttribute('aria-label', this.t('breadcrumb.nav'))
    // ellipsis：单行省略模式（nav 容器不换行 + 链接文本各自省略）
    nav.classList.toggle('ellipsis', this.hasAttr('ellipsis'))
    nav.innerHTML = ''
    let items: BreadcrumbItem[] = []
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      items = Array.isArray(parsed)
        ? parsed.filter((i): i is BreadcrumbItem => i && typeof i.label === 'string')
        : []
    } catch {
      items = []
    }
    const separator = this.getAttr('separator', '/')

    // 折叠：collapsed 且 items 数超过 max-items（默认 4）时，
    // 保留首项 + 末 maxItems-2 项，中间项收进 … 下拉
    const maxItems = this.maxItemsValue
    const collapsed = this.hasAttr('collapsed') && items.length > maxItems
    const tailCount = Math.max(0, maxItems - 2)
    const hiddenItems = collapsed ? items.slice(1, items.length - tailCount) : []
    const seq: Array<BreadcrumbItem | 'ellipsis'> = collapsed
      ? [items[0]!, 'ellipsis', ...items.slice(items.length - tailCount)]
      : items

    seq.forEach((slot, idx) => {
      const isLast = idx === seq.length - 1
      const span = document.createElement('span')
      span.className = 'item'
      if (slot === 'ellipsis') {
        span.classList.add('ellipsis-wrap')
        span.appendChild(this.buildEllipsisControl(hiddenItems))
      } else {
        const isCurrent = !slot.href || isLast
        if (isCurrent) {
          const current = document.createElement('span')
          current.setAttribute('part', 'current')
          current.setAttribute('aria-current', 'page')
          current.textContent = slot.label
          current.title = slot.label
          span.appendChild(current)
        } else {
          const link = document.createElement('a')
          link.setAttribute('part', 'link')
          link.href = slot.href ?? ''
          link.textContent = slot.label
          link.title = slot.label
          link.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault
            this.emit('select', { value: slot.href })
          })
          span.appendChild(link)
        }
      }
      nav.appendChild(span)
      if (!isLast) {
        const sep = document.createElement('span')
        sep.className = 'sep'
        sep.textContent = separator
        nav.appendChild(sep)
      }
    })
    this.syncDropdown
  }

  /** max-items 归一化：非法值回退默认 4 */
  private maxItemsValue: number {
    const raw = this.getAttr('max-items', '4')
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) || n < 1 ? 4 : n
  }

  /**
   * 构建 … 按钮 + 下拉面板（面板默认隐藏，内容为全部被折叠项）。
   * 节点在 update 重建时创建并绑定事件，无重复绑定；断开连接由 onCleanup 统一清理 document 监听。
   */
  private buildEllipsisControl(hiddenItems: BreadcrumbItem[]): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ellipsis-btn'
    btn.setAttribute('aria-haspopup', 'menu')
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-label', this.t('breadcrumb.expand'))
    btn.textContent = '…'
    btn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation
      this.setOpen(!this.openState)
    })
    btn.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.setOpen(false)
    })

    const dropdown = document.createElement('div')
    dropdown.className = 'ellipsis-dropdown'
    dropdown.setAttribute('role', 'menu')
    dropdown.setAttribute('aria-label', this.t('breadcrumb.expand'))
    for (const item of hiddenItems) {
      const row = document.createElement('div')
      row.className = 'ellipsis-item'
      row.setAttribute('role', 'menuitem')
      if (item.href) {
        const a = document.createElement('a')
        a.setAttribute('part', 'link')
        a.href = item.href
        a.textContent = item.label
        a.title = item.label
        a.addEventListener('click', (e: MouseEvent) => {
          e.preventDefault
          this.emit('select', { value: item.href })
          this.setOpen(false)
        })
        row.appendChild(a)
      } else {
        row.textContent = item.label
        row.setAttribute('aria-disabled', 'true')
      }
      dropdown.appendChild(row)
    }

    const wrap = document.createElement('span')
    wrap.appendChild(btn)
    wrap.appendChild(dropdown)
    return wrap
  }

  private setOpen(open: boolean): void {
    this.openState = open
    this.syncDropdown
  }

  /** 下拉显隐 + aria-expanded 增量同步；打开时挂 document 点击监听、关闭时移除（防泄漏） */
  private syncDropdown: void {
    const dropdown = this.shadow.querySelector<HTMLElement>('.ellipsis-dropdown')
    const btn = this.shadow.querySelector<HTMLButtonElement>('.ellipsis-btn')
    if (!dropdown || !btn) {
      // 当前无折叠控件（如 items 缩减到不再折叠）→ 下拉状态复位并移除监听
      this.openState = false
      document.removeEventListener('click', this.handleOutsideClick)
      return
    }
    dropdown.classList.toggle('open', this.openState)
    btn.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick)
    } else {
      document.removeEventListener('click', this.handleOutsideClick)
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    // composedPath 含宿主（shadow 内任意点击）则视为组件内部，不关闭
    if (!e.composedPath.includes(this)) {
      this.setOpen(false)
    }
  }
}
