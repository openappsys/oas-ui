import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.group {
  display: inline-flex;
  align-items: center;
}
.group ::slotted(oas-avatar) {
  margin-left: -8px;
}
.group ::slotted(oas-avatar:first-child) {
  margin-left: 0;
}
.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: -8px;
  border-radius: 50%;
  background: var(--oas-color-bg-elevated);
  border: 1px solid var(--oas-color-border);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  flex-shrink: 0;
  user-select: none;
}
[hidden] {
  display: none !important;
}
`

export class OASAvatarGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['max', 'size']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group">
        <slot></slot>
        <span class="count" part="count" hidden></span>
      </div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；avatar-group 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="group"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const avatars = Array.from(this.querySelectorAll('oas-avatar')) as HTMLElement[]
    const size = this.getAttr('size', '')
    avatars.forEach((a) => {
      a.style.display = ''
      if (size) a.setAttribute('size', size)
    })

    const countEl = this.shadow.querySelector<HTMLElement>('[part="count"]')
    if (!countEl) return

    const max = Number(this.getAttr('max', ''))
    if (max > 0 && avatars.length > max) {
      avatars.slice(max).forEach((a) => {
        a.style.display = 'none'
      })
      countEl.hidden = false
      countEl.textContent = `+${avatars.length - max}`
      if (size) {
        countEl.style.width = `${size}px`
        countEl.style.height = `${size}px`
        countEl.style.fontSize = `${Math.max(12, Number(size) * 0.4)}px`
      }
    } else {
      countEl.hidden = true
      countEl.textContent = ''
    }
  }
}
