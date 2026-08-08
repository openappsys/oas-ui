import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  vertical-align: middle;
  font-family: inherit;
}
kbd {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  /* 细边框 + 内阴影（键帽底缘） */
  box-shadow: inset 0 -2px 0 var(--oas-color-border);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
}
kbd .keys[hidden] {
  display: none;
}
kbd .key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6em;
  padding: 0 var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  box-shadow: inset 0 -1px 0 var(--oas-color-border);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
kbd .sep {
  color: var(--oas-color-text-secondary);
}
`

export class OASKbd extends OASElement {
  static override get observedAttributes(): string[] {
    return ['keys']
  }

  private kbdEl: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null
  private keysEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <kbd part="kbd" role="text">
        <slot></slot>
        <span class="keys" part="keys"></span>
      </kbd>
    `
    this.kbdEl = this.shadow.querySelector<HTMLElement>('[part="kbd"]')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot')
    this.keysEl = this.shadow.querySelector<HTMLElement>('.keys')
    this.slotEl?.addEventListener('slotchange', () => this.update())
    this.update()
  }

  protected override update(): void {
    if (!this.keysEl) return
    const hasSlot = (this.slotEl?.assignedNodes().length ?? 0) > 0
    this.keysEl.hidden = hasSlot
    if (hasSlot) return

    // 按空格拆分渲染多块 + 加号连接；空 keys 渲染单空块
    const keys = this.getAttr('keys', '')
      .split(/\s+/)
      .filter(Boolean)
    const list = keys.length > 0 ? keys : ['']
    this.keysEl.replaceChildren()
    list.forEach((key, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'sep'
        sep.setAttribute('part', 'sep')
        sep.setAttribute('aria-hidden', 'true')
        sep.textContent = '+'
        this.keysEl!.appendChild(sep)
      }
      const cap = document.createElement('kbd')
      cap.className = 'key'
      cap.setAttribute('part', 'key')
      cap.textContent = key
      this.keysEl!.appendChild(cap)
    })
  }
}
