import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.track {
  position: relative;
  height: var(--oas-space-2);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-full, 999px);
  overflow: hidden;
}
.bar {
  height: 100%;
  background: var(--oas-color-primary);
  border-radius: inherit;
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
.bar.done {
  background: var(--oas-color-success);
}
.bar[data-status='error'] {
  background: var(--oas-color-danger);
}
.text {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  text-align: right;
}
`

export class OASProgress extends OASElement {
  static override get observedAttributes(): string[] {
    return ['percent', 'status', 'no-text', 'show-text']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="track" part="track">
        <div class="bar" part="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <div class="text" part="text"></div>
    `
    this.update()
  }

  protected override update(): void {
    const bar = this.shadow.querySelector<HTMLElement>('[part="bar"]')
    if (!bar) return
    const percent = Math.min(100, Math.max(0, Number(this.getAttr('percent', '0')) || 0))
    bar.style.width = `${percent}%`
    bar.setAttribute('aria-valuenow', String(percent))
    const status = this.getAttr('status', '')
    bar.classList.toggle('done', percent >= 100 && !status)
    bar.setAttribute('data-status', status)
    const text = this.shadow.querySelector<HTMLElement>('[part="text"]')
    if (text) {
      text.textContent = `${percent}%`
      text.hidden = this.hasAttr('no-text') || this.getAttr('show-text', 'true') === 'false'
    }
  }
}
