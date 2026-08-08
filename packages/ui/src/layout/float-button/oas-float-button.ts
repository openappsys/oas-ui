import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  position: fixed;
  bottom: var(--oas-space-6);
  right: var(--oas-space-6);
  z-index: var(--oas-z-fixed, 1030);
}
.btn {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--oas-color-primary);
  color: #fff;
  font-size: var(--oas-font-size-xl);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-family: inherit;
}
.btn:hover {
  background: var(--oas-color-primary-hover);
}
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--oas-color-danger);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
`

export class OASFloatButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['badge']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <button class="btn" part="btn" type="button" aria-label="悬浮操作">
        <slot name="icon">＋</slot>
        ${this.hasAttr('badge') ? '<span class="badge" part="badge"></span>' : ''}
      </button>
    `
    this.shadow.querySelector('.btn')?.addEventListener('click', () => this.emit('click'))
    this.update()
  }

  protected override update(): void {
    const badge = this.shadow.querySelector('[part="badge"]')
    if (badge) badge.textContent = this.getAttr('badge', '')
  }
}
