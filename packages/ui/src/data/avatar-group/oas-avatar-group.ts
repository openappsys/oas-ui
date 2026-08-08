import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
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

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="group" part="group">
        <slot></slot>
        <span class="count" part="count" hidden></span>
      </div>
    `
    this.update()
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
