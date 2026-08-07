import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: 100%;
}
.block {
  width: 100%;
}
.block.active :is([part='avatar'], [part='title'], [part='line']) {
  background: linear-gradient(90deg, var(--oas-color-bg-hover) 25%, var(--oas-color-border) 50%, var(--oas-color-bg-hover) 75%);
  background-size: 200% 100%;
  animation: oas-skeleton-shimmer 1.5s infinite;
}
[part='avatar'] {
  width: var(--oas-control-height-lg);
  height: var(--oas-control-height-lg);
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  margin-bottom: var(--oas-space-2);
}
[part='title'] {
  height: var(--oas-control-height-sm);
  width: 40%;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  margin-bottom: var(--oas-space-3);
}
[part='line'] {
  height: var(--oas-control-height-sm);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  margin-bottom: var(--oas-space-2);
}
[part='line']:nth-child(odd) {
  width: 92%;
}
[part='line']:nth-child(even) {
  width: 76%;
}
@keyframes oas-skeleton-shimmer {
  to { background-position: -200% 0; }
}
`

export class OASSkeleton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['rows', 'title', 'avatar', 'active']
  }

  protected override render(): void {
    const rows = Math.max(1, Number(this.getAttr('rows', '3')) || 3)
    const lines = Array.from({ length: rows }, () => '<span part="line"></span>').join('')
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="block" part="block" ${this.hasAttr('active') ? 'class="block active"' : ''}>
        ${this.hasAttr('avatar') ? '<span part="avatar"></span>' : ''}
        ${this.hasAttr('title') ? '<span part="title"></span>' : ''}
        ${lines}
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const block = this.shadow.querySelector('[part="block"]')
    if (!block) return
    block.classList.toggle('active', this.hasAttr('active'))
  }
}
