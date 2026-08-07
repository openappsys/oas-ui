import { OASElement } from '@oas-ui/core'

export interface MenuItem {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-1);
  min-width: 160px;
  color: var(--oas-color-text-primary);
}
.menu {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item:hover,
.item.active {
  background: var(--oas-color-bg-hover);
}
.item[aria-checked='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.check {
  opacity: 0;
}
.item[aria-checked='true'] .check {
  opacity: 1;
}
`

export class OASMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value']
  }

  private itemsList: MenuItem[] = []
  private activeIndex = -1
  private menuEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <ul class="menu" part="menu" role="menu" tabindex="0"></ul>
    `
    this.menuEl = this.shadow.querySelector('.menu')
    this.menuEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    this.update()
  }

  protected override update(): void {
    this.parseItems()
    this.renderItems()
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

  private renderItems(): void {
    if (!this.menuEl) return
    this.menuEl.innerHTML = ''
    const selected = this.getAttr('value', '')
    this.itemsList.forEach((item, idx) => {
      const li = document.createElement('li')
      li.className = 'item'
      li.setAttribute('part', 'item')
      li.setAttribute('role', 'menuitem')
      li.setAttribute('aria-disabled', String(item.disabled ?? false))
      li.setAttribute('aria-checked', String(item.value === selected))
      if (idx === this.activeIndex) li.classList.add('active')
      const label = document.createElement('span')
      label.textContent = item.label
      const check = document.createElement('span')
      check.className = 'check'
      check.textContent = '✓'
      li.append(label, check)
      li.addEventListener('click', () => {
        if (item.disabled) return
        this.select(item)
      })
      this.menuEl.appendChild(li)
    })
  }

  private select(item: MenuItem): void {
    this.setAttribute('value', item.value)
    this.activeIndex = this.itemsList.indexOf(item)
    this.emit('select', { value: item.value })
    this.renderItems()
  }

  private handleKey(e: KeyboardEvent): void {
    const enabled = this.itemsList.map((i, idx) => (i.disabled ? -1 : idx)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const cur = enabled.findIndex((i) => i >= this.activeIndex)
      this.activeIndex = enabled[(cur + 1) % enabled.length]!
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const cur = enabled.findIndex((i) => i >= this.activeIndex)
      this.activeIndex = enabled[(cur - 1 + enabled.length) % enabled.length]!
    } else if (e.key === 'Enter' && this.activeIndex >= 0) {
      e.preventDefault()
      this.select(this.itemsList[this.activeIndex]!)
    } else if (e.key === 'Home') {
      this.activeIndex = enabled[0]!
    } else if (e.key === 'End') {
      this.activeIndex = enabled[enabled.length - 1]!
    } else {
      return
    }
    this.renderItems()
  }
}
