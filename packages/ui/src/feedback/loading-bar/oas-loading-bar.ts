import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-message, 1060));
  pointer-events: none;
  font-family: inherit;
}
.track {
  height: 100%;
  background: var(--oas-color-primary);
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
.track[data-status='error'] {
  background: var(--oas-color-danger);
}
`

export class OASLoadingBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['status']
  }

  private track: HTMLElement | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private progress = 0

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="track" part="track" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
    `
    this.track = this.shadow.querySelector('.track')
    this.update()
  }

  protected override update(): void {
    if (!this.track) return
    this.track.style.width = `${this.progress}%`
    this.track.setAttribute('aria-valuenow', String(Math.round(this.progress)))
    this.track.setAttribute('data-status', this.getAttr('status', ''))
  }

  advance(): void {
    if (this.progress >= 90) return
    this.progress = Math.min(90, this.progress + Math.random() * 10)
    this.update()
    this.timer = setTimeout(() => this.advance(), 200)
  }

  done(status: 'success' | 'error' = 'success'): void {
    if (this.timer) clearTimeout(this.timer)
    this.progress = 100
    this.setAttribute('status', status === 'error' ? 'error' : '')
    this.update()
    setTimeout(() => this.remove(), 200)
  }
}
