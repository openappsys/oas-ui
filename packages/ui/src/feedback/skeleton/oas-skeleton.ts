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
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="block" part="block"></div>
    `
    this.update()
  }

  protected override update(): void {
    const block = this.shadow.querySelector<HTMLElement>('[part="block"]')
    if (!block) return
    block.classList.toggle('active', this.hasAttr('active'))
    const rows = Math.max(1, Number(this.getAttr('rows', '3')) || 3)
    block.innerHTML = ''
    if (this.hasAttr('avatar')) {
      const a = document.createElement('span')
      a.setAttribute('part', 'avatar')
      block.appendChild(a)
    }
    if (this.hasAttr('title')) {
      const t = document.createElement('span')
      t.setAttribute('part', 'title')
      block.appendChild(t)
    }
    for (let i = 0; i < rows; i++) {
      const l = document.createElement('span')
      l.setAttribute('part', 'line')
      block.appendChild(l)
    }
  }
}
