import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.panel {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
  min-width: 200px;
  color: var(--oas-color-text-primary);
}
.panel[aria-hidden='true'] {
  display: none;
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-md);
  margin-bottom: var(--oas-space-2);
}
.body {
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
`

export class OASPopover extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'title', 'content', 'placement']
  }

  private panel: HTMLElement | null = null
  private anchor: Element | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="panel" part="panel" role="dialog" aria-hidden="true">
        <div class="title" part="title"></div>
        <div class="body" part="body"><div class="content" part="content"></div><slot name="content"></slot></div>
      </div>
    `
    this.panel = this.shadow.querySelector('.panel')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('click', () => this.toggle())
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.removeAttribute('open')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    this.update()
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
    if (!this.panel) return
    const open = this.hasAttr('open')
    this.panel.setAttribute('aria-hidden', String(!open))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    this.shadow.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
      'content',
      '',
    )
    if (open) {
      document.addEventListener('click', this.handleOutside)
      const anchorRect = this.anchor?.getBoundingClientRect()
      if (anchorRect) {
        const panelRect = this.panel.getBoundingClientRect()
        const { top, left, placement } = computePosition(
          anchorRect,
          panelRect,
          this.getAttr('placement', 'top') as Placement,
          { width: window.innerWidth, height: window.innerHeight },
        )
        this.panel.style.top = `${top}px`
        this.panel.style.left = `${left}px`
        this.panel.setAttribute('data-placement', placement)
      }
    } else {
      document.removeEventListener('click', this.handleOutside)
    }
  }
}
