import { OASElement } from '@oas-ui/core'

export type LinkType = 'default' | 'primary' | 'success' | 'warning' | 'danger'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
a {
  color: var(--oas-color-text-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  transition: color var(--oas-transition-fast) var(--oas-ease-out);
}
a:hover {
  color: var(--oas-color-primary);
}
a:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
a.no-underline {
  text-decoration: none;
}
a.primary {
  color: var(--oas-color-primary);
}
a.primary:hover {
  color: var(--oas-color-primary-hover);
}
a.success {
  color: var(--oas-color-success);
}
a.warning {
  color: var(--oas-color-warning);
}
a.danger {
  color: var(--oas-color-danger);
}
a[disabled] {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  text-decoration: none;
  pointer-events: none;
}
`

export class OASLink extends OASElement {
  static override get observedAttributes(): string[] {
    return ['href', 'type', 'underline', 'disabled', 'target']
  }

  private a: HTMLAnchorElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <a part="link"><slot></slot></a>
    `
    this.a = this.shadow.querySelector('a')
    this.a?.addEventListener('click', (e: MouseEvent) => {
      if (this.hasAttr('disabled')) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      this.emit('click', { originalEvent: e })
    })
    this.update()
  }

  protected override update(): void {
    const a = this.a
    if (!a) return
    const href = this.getAttr('href', '')
    const type = this.getAttr('type', 'default') as LinkType
    const underline = this.getAttr('underline', 'true') !== 'false'
    const disabled = this.hasAttr('disabled')
    const target = this.getAttr('target', '')

    a.setAttribute('href', href)
    if (target) a.setAttribute('target', target)
    else a.removeAttribute('target')
    a.className = `${type}${underline ? '' : ' no-underline'}`
    a.toggleAttribute('disabled', disabled)
    a.setAttribute('aria-disabled', disabled ? 'true' : 'false')
  }
}
