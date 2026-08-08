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
.indicator[data-size='sm'] { width: var(--oas-control-height-sm); height: var(--oas-control-height-sm); border-width: 2px; margin: -12px 0 0 -12px; }
.indicator[data-size='md'] { margin: -16px 0 0 -16px; }
.indicator[data-size='lg'] { width: var(--oas-control-height-lg); height: var(--oas-control-height-lg); margin: -20px 0 0 -20px; }
.wrap {
  position: relative;
  display: inline-block;
}
.wrap > .indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
}
.mask {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--oas-color-bg) 70%, transparent);
  display: none;
}
.wrap.spinning .mask {
  display: block;
}
.wrap.empty > .indicator {
  position: static;
  margin: 0;
}
.wrap > .indicator {
  display: none;
}
.wrap.spinning > .indicator,
.wrap.empty > .indicator {
  display: inline-block;
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
      <div class="wrap" part="wrap">
        <div class="mask" part="mask"></div>
        <slot></slot>
        <span class="indicator" part="indicator" data-size="${this.getAttr('size', 'md')}" role="status"></span>
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const spinning = this.hasAttr('spinning')
    this.setAttribute('aria-busy', String(spinning))
    const wrap = this.shadow.querySelector('[part="wrap"]')
    if (wrap) {
      wrap.classList.toggle('spinning', spinning)
      const hasContent = (this.shadow.querySelector('slot') as HTMLSlotElement | null)?.assignedNodes().length ? true : false
      wrap.classList.toggle('empty', !hasContent)
    }
    this.shadow.querySelector('[part="indicator"]')?.setAttribute('data-size', this.getAttr('size', 'md'))
  }
}
