import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.wrap {
  display: inline-block;
}
.wrap.fixed {
  position: fixed;
  z-index: var(--oas-z-sticky, 1020);
}
`

export class OASAffix extends OASElement {
  static override get observedAttributes(): string[] {
    return ['offset']
  }

  private wrap: HTMLElement | null = null
  private lastTop: number | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap"><slot></slot></div>
    `
    this.wrap = this.shadow.querySelector('.wrap')
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.onCleanup(() => window.removeEventListener('scroll', this.handleScroll))
    this.update()
  }

  private handleScroll = (): void => {
    const now = Math.round(window.scrollY)
    if (this.lastTop === null) {
      this.lastTop = now
      return
    }
    if (Math.abs(now - this.lastTop) < 4) return
    this.lastTop = now
    this.apply()
  }

  protected override update(): void {
    this.apply()
  }

  private apply(): void {
    if (!this.wrap) return
    const offset = Number(this.getAttr('offset', '0')) || 0
    const rect = this.getBoundingClientRect()
    const stuck = rect.top <= offset
    this.wrap.classList.toggle('fixed', stuck)
    if (stuck) this.wrap.style.top = `${offset}px`
  }
}
