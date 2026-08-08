import { OASElement } from '@oas-ui/core'
import '../menu/index.js' // 副作用：确保 oas-menu 已注册
import type { OASMenu } from '../menu/index.js'
import type { MenuItem } from '../menu/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.menu-anchor {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
}
.menu-anchor[hidden] {
  display: none;
}
`

export class OASContextMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items']
  }

  private itemsList: MenuItem[] = []
  private menuEl: OASMenu | null = null
  private anchorEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="menu-anchor" part="menu" hidden>
        <oas-menu tabindex="-1"></oas-menu>
      </div>
    `
    this.anchorEl = this.shadow.querySelector('.menu-anchor')
    this.menuEl = this.shadow.querySelector('oas-menu')
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
    this.menuEl?.addEventListener('oas-select', (e: Event) => {
      const detail = (e as CustomEvent).detail
      this.emit('select', { value: detail.value })
      this.close()
    })
    this.update()
  }

  private openMenu(x: number, y: number): void {
    if (!this.menuEl || !this.anchorEl) return
    this.parseItems()
    this.menuEl.setAttribute('items', JSON.stringify(this.itemsList))
    this.anchorEl.hidden = false
    // 锚定在光标处；超出视口时向左/上回退
    let left = x
    let top = y
    const { innerWidth: w, innerHeight: h } = window
    const rect = this.anchorEl.getBoundingClientRect()
    if (left + rect.width > w) left = Math.max(0, x - rect.width)
    if (top + rect.height > h) top = Math.max(0, y - rect.height)
    this.anchorEl.style.left = `${left}px`
    this.anchorEl.style.top = `${top}px`
    document.addEventListener('click', this.handleOutside)
  }

  private close(): void {
    if (this.anchorEl) this.anchorEl.hidden = true
    document.removeEventListener('click', this.handleOutside)
  }

  private handleOutside = (e: MouseEvent): void => {
    if (!this.anchorEl || this.anchorEl.hidden) return
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
