import { OASElement } from '@oas-ui/core'
import type { MenuItem } from '../menu/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
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
.item:hover {
  background: var(--oas-color-bg-hover);
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
`

export class OASContextMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items']
  }

  private itemsList: MenuItem[] = []
  private menuEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
      <ul class="menu" part="menu" role="menu" aria-hidden="true"></ul>
    `
    this.menuEl = this.shadow.querySelector('.menu')
    this.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault()
      this.openMenu(e.clientX, e.clientY)
    })
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.close()
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    this.update()
  }

  private openMenu(x: number, y: number): void {
    this.parseItems()
    const menuEl = this.menuEl
    if (!menuEl) return
    menuEl.innerHTML = ''
    for (const item of this.itemsList) {
      const li = document.createElement('li')
      li.className = 'item'
      li.setAttribute('role', 'menuitem')
      li.setAttribute('aria-disabled', String(item.disabled ?? false))
      li.textContent = item.label ?? ''
      li.addEventListener('click', () => {
        if (item.disabled) return
        this.emit('select', { value: item.value })
        this.close()
      })
      menuEl.appendChild(li)
    }
    menuEl.setAttribute('aria-hidden', 'false')
    menuEl.style.top = `${y}px`
    menuEl.style.left = `${x}px`
    document.addEventListener('click', this.handleOutside)
  }

  private close(): void {
    this.menuEl?.setAttribute('aria-hidden', 'true')
    document.removeEventListener('click', this.handleOutside)
  }

  private handleOutside = (e: MouseEvent): void => {
    if (!this.menuEl || this.menuEl.getAttribute('aria-hidden') === 'true') return
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.close()
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
