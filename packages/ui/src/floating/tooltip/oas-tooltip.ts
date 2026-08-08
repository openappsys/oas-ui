import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.tip {
  position: fixed;
  z-index: var(--oas-z-tooltip, 1080);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-text-primary);
  color: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  max-width: 240px;
  pointer-events: none;
}
.tip[aria-hidden='true'] {
  display: none;
}
`

export class OAStooltip extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'content', 'placement']
  }

  private tipEl: HTMLElement | null = null
  private anchor: Element | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="tip" part="tip" role="tooltip" aria-hidden="true"></div>
    `
    this.tipEl = this.shadow.querySelector('.tip')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('mouseenter', () => this.setAttribute('open', ''))
    this.anchor?.addEventListener('mouseleave', () => this.removeAttribute('open'))
    this.anchor?.addEventListener('focusin', () => this.setAttribute('open', ''))
    this.anchor?.addEventListener('focusout', () => this.removeAttribute('open'))
    this.update()
  }

  protected override update(): void {
    if (!this.tipEl) return
    const open = this.hasAttr('open')
    this.tipEl.setAttribute('aria-hidden', String(!open))
    this.tipEl.textContent = this.getAttr('content', '')
    if (!open) return
    const anchorRect = this.anchor?.getBoundingClientRect()
    if (!anchorRect) return
    const tipRect = this.tipEl.getBoundingClientRect()
    const placement = this.getAttr('placement', 'top') as Placement
    const {
      top,
      left,
      placement: actual,
    } = computePosition(anchorRect, tipRect, placement, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    this.tipEl.style.top = `${top}px`
    this.tipEl.style.left = `${left}px`
    this.tipEl.setAttribute('data-placement', actual)
  }
}
