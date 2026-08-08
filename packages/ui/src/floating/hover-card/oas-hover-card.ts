import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.card {
  position: fixed;
  z-index: var(--oas-z-tooltip, 1080);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
  min-width: 200px;
  color: var(--oas-color-text-primary);
}
.card[aria-hidden='true'] {
  display: none;
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-md);
  margin-bottom: var(--oas-space-2);
}
.content {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
`

export class OASHoverCard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'title', 'content', 'placement', 'delay']
  }

  private card: HTMLElement | null = null
  private anchor: Element | null = null
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="card" part="card" role="dialog" aria-hidden="true">
        <div class="title" part="title"></div>
        <div class="content" part="content"></div>
      </div>
    `
    this.card = this.shadow.querySelector('.card')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('mouseenter', () => this.scheduleShow())
    this.anchor?.addEventListener('mouseleave', () => this.scheduleHide())
    this.anchor?.addEventListener('focusin', () => this.scheduleShow())
    this.anchor?.addEventListener('focusout', () => this.scheduleHide())
    this.update()
  }

  private scheduleShow(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    const delay = Number(this.getAttr('delay', '100'))
    this.showTimer = setTimeout(() => this.setAttribute('open', ''), delay)
  }

  private scheduleHide(): void {
    if (this.showTimer) clearTimeout(this.showTimer)
    const delay = Number(this.getAttr('delay', '100'))
    this.hideTimer = setTimeout(() => this.removeAttribute('open'), delay)
  }

  protected override update(): void {
    if (!this.card) return
    const open = this.hasAttr('open')
    this.card.setAttribute('aria-hidden', String(!open))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    this.shadow.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
      'content',
      '',
    )
    if (!open) return
    const anchorRect = this.anchor?.getBoundingClientRect()
    if (!anchorRect) return
    const cardRect = this.card.getBoundingClientRect()
    const { top, left } = computePosition(
      anchorRect,
      cardRect,
      this.getAttr('placement', 'top') as Placement,
      { width: window.innerWidth, height: window.innerHeight },
    )
    this.card.style.top = `${top}px`
    this.card.style.left = `${left}px`
  }
}
