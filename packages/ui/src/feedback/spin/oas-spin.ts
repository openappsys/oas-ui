import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.indicator {
  display: inline-block;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  border: 3px solid var(--oas-color-bg-hover);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-spin-rotate 0.8s linear infinite;
}
.indicator[data-size='sm'] { width: var(--oas-control-height-sm); height: var(--oas-control-height-sm); border-width: 2px; }
.indicator[data-size='lg'] { width: var(--oas-control-height-lg); height: var(--oas-control-height-lg); }
.wrap {
  position: relative;
}
.wrap .indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
}
@keyframes oas-spin-rotate {
  to { transform: rotate(360deg); }
}
`

export class OASSpin extends OASElement {
  static override get observedAttributes(): string[] {
    return ['size', 'spinning']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      ${this.hasAttr('spinning') ? `
        <div class="wrap" part="wrap">
          <div class="mask" part="mask"></div>
          <slot></slot>
          <span class="indicator" part="indicator" data-size="${this.getAttr('size', 'md')}" role="status"></span>
        </div>` : `
        <span class="indicator" part="indicator" data-size="${this.getAttr('size', 'md')}" role="status"></span>`}
    `
    this.update()
  }

  protected override update(): void {
    if (!this.hasAttr('spinning')) this.setAttribute('aria-busy', 'true')
    const indicator = this.shadow.querySelector('[part="indicator"]')
    indicator?.setAttribute('data-size', this.getAttr('size', 'md'))
  }
}
