import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface BottomNavItem {
  label: string
  value: string
  icon?: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
:host(.oas-bottom-navigation--fixed) {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--oas-z-fixed);
}
.tablist {
  display: flex;
  border-top: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg-elevated);
  padding: 0;
  margin: 0;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 56px;
  padding: var(--oas-space-2) 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  transition: color var(--oas-transition-fast) var(--oas-ease-out);
}
.tab:hover {
  color: var(--oas-color-text-primary);
}
.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.tab[aria-disabled='true'] {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.tab:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.icon {
  display: inline-flex;
  font-size: 20px;
  line-height: 1;
}
.icon svg {
  display: block;
}
.tab-label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`

/**
 * oas-bottom-navigation —— 移动端底部导航。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, icon?, disabled? }]`，icon 取 @oas-ui/icons 的 iconRegistry
 * - `value`：激活项 value；未设置默认激活第一个可用项
 * - `fixed`：布尔，置顶 fixed 底部（默认静态，demo 用 static + 说明）
 *
 * 事件：`oas-change` detail `{ value }`
 *
 * 语义：`role="tablist"` + 每项 `role="tab"` + `aria-selected`；
 * 键盘左右/上下移动焦点（roving tabindex，跳过 disabled），Enter/Space 选中；
 * Home/End 首尾。顶部细分隔线，激活项主色 + 图标。
 */
export class OASBottomNavigation extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value', 'fixed']
  }

  private itemsList: BottomNavItem[] = []
  private buttons: HTMLButtonElement[] = []
  private tablist: HTMLElement | null = null
  private lastItemsRaw = ''
  private lastValueRaw: string | null = null
  private focusIndex = 0

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist"></div>
    `
    this.tablist = this.shadow.querySelector('.tablist')
    this.tablist?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.update()
  }

  protected override update(): void {
    this.classList.toggle('oas-bottom-navigation--fixed', this.hasAttr('fixed'))
    const itemsRaw = this.getAttribute('items') ?? ''
    const itemsChanged = itemsRaw !== this.lastItemsRaw
    this.lastItemsRaw = itemsRaw
    const valueRaw = this.getAttr('value')
    const valueChanged = valueRaw !== this.lastValueRaw
    this.lastValueRaw = valueRaw
    this.parseItems()
    if (itemsChanged) {
      this.renderItems()
    } else {
      if (valueChanged) {
        // 外部改 value：roving 焦点跟随激活项
        this.focusIndex = this.resolveInitialFocus(valueRaw)
      }
      this.syncState()
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter(
            (o): o is BottomNavItem =>
              !!o &&
              typeof o === 'object' &&
              typeof (o as BottomNavItem).value === 'string' &&
              typeof (o as BottomNavItem).label === 'string',
          )
        : []
    } catch {
      this.itemsList = []
    }
  }

  private renderItems(): void {
    const tablist = this.tablist
    if (!tablist) return
    tablist.innerHTML = ''
    this.buttons = []
    this.focusIndex = this.resolveInitialFocus(this.getAttr('value'))
    for (const item of this.itemsList) {
      const btn = document.createElement('button')
      btn.className = 'tab'
      btn.setAttribute('part', 'tab')
      btn.type = 'button'
      btn.addEventListener('click', () => this.select(item))
      if (item.icon) {
        const ic = this.createIcon(item.icon)
        if (ic) btn.appendChild(ic)
      }
      const label = document.createElement('span')
      label.className = 'tab-label'
      label.textContent = item.label
      btn.appendChild(label)
      this.buttons.push(btn)
      tablist.appendChild(btn)
    }
    this.syncState()
  }

  private syncState(): void {
    const tablist = this.tablist
    if (!tablist) return
    tablist.setAttribute('role', 'tablist')
    tablist.setAttribute('aria-label', this.t('bottomNavigation.nav'))
    const activeIdx = this.activeIndex()
    this.buttons.forEach((btn, i) => {
      const item = this.itemsList[i]
      if (!item) return
      const isSelected = i === activeIdx && !item.disabled
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(isSelected))
      btn.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (item.disabled) btn.tabIndex = -1
      else btn.tabIndex = i === this.focusIndex ? 0 : -1
    })
  }

  private activeIndex(): number {
    const selected = this.getAttr('value')
    if (selected) {
      const idx = this.itemsList.findIndex((it) => it.value === selected && !it.disabled)
      if (idx >= 0) return idx
    }
    const first = this.itemsList.findIndex((it) => !it.disabled)
    return first >= 0 ? first : 0
  }

  private resolveInitialFocus(selected: string): number {
    const idx = this.itemsList.findIndex((it) => it.value === selected && !it.disabled)
    if (idx >= 0) return idx
    const first = this.itemsList.findIndex((it) => !it.disabled)
    return first >= 0 ? first : 0
  }

  private select(item: BottomNavItem): void {
    if (item.disabled) return
    if (this.getAttr('value') === item.value) return
    this.setAttribute('value', item.value)
    this.emit('change', { value: item.value })
    // update() 里 value 变化会令 roving 焦点跟随激活项，无需按引用反查下标
    this.update()
  }

  private handleKey(e: KeyboardEvent): void {
    const items = this.itemsList
    if (items.length === 0) return
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.move(1, enabled)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.move(-1, enabled)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const item = items[this.focusIndex]
      if (item) this.select(item)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.focusAt(enabled[0] ?? 0)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.focusAt(enabled[enabled.length - 1] ?? 0)
    }
  }

  private move(dir: 1 | -1, enabled: number[]): void {
    const cur = enabled.indexOf(this.focusIndex)
    const next = enabled[(cur + dir + enabled.length) % enabled.length]
    if (next === undefined) return
    this.focusAt(next)
  }

  private focusAt(index: number): void {
    this.focusIndex = index
    this.syncState()
    this.buttons[index]?.focus()
  }

  /** 用 iconRegistry 渲染图标（内联 SVG，跟随 currentColor） */
  private createIcon(icon: string): HTMLElement | null {
    const content = iconRegistry[icon as IconName]
    if (!content) return null
    const span = document.createElement('span')
    span.className = 'icon'
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
}
