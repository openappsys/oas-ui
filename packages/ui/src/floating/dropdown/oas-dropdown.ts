import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import type { MenuItem } from '../menu/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.menu {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-1);
  min-width: 160px;
  margin: 0;
  list-style: none;
  color: var(--oas-color-text-primary);
}
.menu[aria-hidden='true'] {
  display: none;
}
.item {
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
}
.item:hover,
.item.active {
  background: var(--oas-color-bg-hover);
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
`

export class OASDropdown extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'items', 'value', 'placement']
  }

  private itemsList: MenuItem[] = []
  private menuEl: HTMLElement | null = null
  private anchor: Element | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <ul class="menu" part="menu" role="menu" aria-hidden="true"></ul>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.menuEl = this.shadow.querySelector('.menu')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('click', () => this.toggle())
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.removeAttribute('open')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（menu 列表存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.menu')) return false
    this.bind()
    return true
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.removeAttribute('open')
    else this.setAttribute('open', '')
  }

  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.removeAttribute('open')
    }
  }

  protected override update(): void {
    const menuEl = this.menuEl
    if (!menuEl) return
    this.parseItems()
    const open = this.hasAttr('open')
    menuEl.setAttribute('aria-hidden', String(!open))
    menuEl.innerHTML = ''
    const selected = this.getAttr('value', '')
    for (const item of this.itemsList) {
      const li = document.createElement('li')
      li.className = 'item'
      li.setAttribute('role', 'menuitem')
      li.setAttribute('aria-disabled', String(item.disabled ?? false))
      li.textContent = item.label ?? ''
      li.addEventListener('click', () => {
        if (item.disabled) return
        this.setAttribute('value', item.value ?? '')
        this.emit('select', { value: item.value })
        this.removeAttribute('open')
      })
      menuEl.appendChild(li)
    }
    if (open) {
      document.addEventListener('click', this.handleOutside)
      const anchorRect = this.anchor?.getBoundingClientRect()
      if (anchorRect) {
        const menuRect = menuEl.getBoundingClientRect()
        const { top, left } = computePosition(
          anchorRect,
          menuRect,
          this.getAttr('placement', 'bottom') as Placement,
          { width: window.innerWidth, height: window.innerHeight },
        )
        menuEl.style.top = `${top}px`
        menuEl.style.left = `${left}px`
      }
    } else {
      document.removeEventListener('click', this.handleOutside)
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is MenuItem => i && typeof i.value === 'string')
        : []
    } catch {
      this.itemsList = []
    }
  }
}
