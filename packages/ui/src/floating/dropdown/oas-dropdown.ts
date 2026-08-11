import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import '../menu/index.js' // 副作用：确保 oas-menu 已注册
import type { OASMenu } from '../menu/index.js'
import type { MenuItem } from '../menu/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.menu-anchor {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
}
.menu-anchor[hidden] {
  display: none;
}
`

export class OASDropdown extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'items', 'value', 'placement']
  }

  private itemsList: MenuItem[] = []
  private menuEl: OASMenu | null = null
  private anchorEl: HTMLElement | null = null
  private anchor: Element | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="menu-anchor" part="menu" hidden>
        <oas-menu tabindex="-1"></oas-menu>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.anchorEl = this.shadow.querySelector('.menu-anchor')
    this.menuEl = this.shadow.querySelector('oas-menu')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('click', () => this.toggle())
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.removeAttribute('open')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    // 内层 oas-menu 的选中事件转发为 dropdown 的 oas-select 并关闭（多级子菜单叶子项同样走这里）
    this.menuEl?.addEventListener('oas-select', (e: Event) => {
      const detail = (e as CustomEvent).detail as { value?: string }
      if (typeof detail?.value !== 'string') return
      this.setAttribute('value', detail.value)
      this.emit('select', { value: detail.value })
      this.removeAttribute('open')
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（menu-anchor 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.menu-anchor')) return false
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
    this.parseItems()
    const open = this.hasAttr('open')
    if (!this.menuEl || !this.anchorEl) return
    if (open) {
      this.menuEl.setAttribute('items', JSON.stringify(this.itemsList))
      this.menuEl.setAttribute('value', this.getAttr('value', ''))
      this.anchorEl.hidden = false
      document.addEventListener('click', this.handleOutside)
      const anchorRect = this.anchor?.getBoundingClientRect()
      const menuRect = this.anchorEl.getBoundingClientRect()
      if (anchorRect) {
        const { top, left } = computePosition(
          anchorRect,
          menuRect,
          this.getAttr('placement', 'bottom') as Placement,
          { width: window.innerWidth, height: window.innerHeight },
        )
        this.anchorEl.style.top = `${top}px`
        this.anchorEl.style.left = `${left}px`
      }
    } else {
      this.anchorEl.hidden = true
      document.removeEventListener('click', this.handleOutside)
      // 收起内层菜单残留的级联展开态，避免重开时子菜单直接可见；
      // SSR/Node 渲染环境无 MouseEvent，跳过（SSR 快照本就是关闭态）
      if (typeof MouseEvent !== 'undefined') {
        this.menuEl.shadowRoot
          ?.querySelector('.menu')
          ?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      }
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
