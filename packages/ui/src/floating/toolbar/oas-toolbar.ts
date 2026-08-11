import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
/* 参与 roving 的插槽子元素：焦点环由 toolbar 统一提供 */
::slotted(:focus-visible) {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

/** 参与工具栏导航的角色（native 控件按标签判断） */
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'menuitem',
  'combobox',
  'slider',
  'spinbutton',
  'tab',
])

export class OASToolbar extends OASElement {
  static override get observedAttributes(): string[] {
    return []
  }

  private slotEl: HTMLSlotElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.setAttribute('role', 'toolbar')
    this.slotEl = this.shadow.querySelector('slot')
    this.slotEl?.addEventListener('slotchange', () => this.syncRoving())
    this.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.setAttribute('aria-label', this.t('toolbar.label'))
    this.syncRoving()
  }

  /**
   * 参与 roving 的可导航项（light DOM 直接子元素）：
   * - native 控件（button/input/select/textarea/a[href]）
   * - 交互 role（button/checkbox/…）
   * - 自定义元素（tag 含 '-'，如 oas-button）
   * 排除：disabled / aria-disabled / aria-hidden / data-toolbar-ignore
   */
  private items(): HTMLElement[] {
    return [...this.children].filter((c): c is HTMLElement => {
      const el = c as HTMLElement
      if (el.hasAttribute('data-toolbar-ignore')) return false
      if (el.hasAttribute('aria-hidden')) return false
      if (el.hasAttribute('disabled')) return false
      if (el.getAttribute('aria-disabled') === 'true') return false
      const tag = el.tagName
      const role = el.getAttribute('role')
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true
      if (tag === 'A' && el.hasAttribute('href')) return true
      if (role && INTERACTIVE_ROLES.has(role)) return true
      if (tag.includes('-')) return true
      return false
    })
  }

  /** roving tabindex：只把当前项放入 Tab 序列，其余 -1 */
  private syncRoving(): void {
    const list = this.items()
    const ae = document.activeElement as HTMLElement | null
    let focusIdx = list.findIndex((el) => el === ae || el.shadowRoot?.contains(ae))
    if (focusIdx < 0) focusIdx = 0
    list.forEach((el, i) => {
      el.setAttribute('tabindex', i === focusIdx ? '0' : '-1')
    })
  }

  private handleKey(e: KeyboardEvent): void {
    const list = this.items()
    if (list.length === 0) return
    const ae = document.activeElement as HTMLElement | null
    const cur = list.findIndex((el) => el === ae || el.shadowRoot?.contains(ae))
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.focusTo(cur < 0 ? 0 : (cur + 1) % list.length)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.focusTo(cur < 0 ? list.length - 1 : (cur - 1 + list.length) % list.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.focusTo(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.focusTo(list.length - 1)
    }
  }

  private focusTo(idx: number): void {
    const el = this.items()[idx]
    if (!el) return
    el.focus()
    this.syncRoving()
  }
}
