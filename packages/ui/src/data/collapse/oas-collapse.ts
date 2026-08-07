import { OASElement } from '@oas-ui/core'
import type { OASCollapseItem } from './oas-collapse-item.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.group {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.item {
  border-bottom: 1px solid var(--oas-color-border);
}
.item:last-child {
  border-bottom: none;
}
`

export class OASCollapse extends OASElement {
  static override get observedAttributes(): string[] {
    return ['active', 'accordion']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="group" part="group"><slot></slot></div>
    `
    this.shadow.querySelector('.group')?.addEventListener('click', () => undefined)
    this.update()
  }

  private toggle(name: string): void {
    const active = new Set(this.getActive())
    if (this.hasAttr('accordion')) {
      active.clear()
      if (!this.getActive().includes(name)) active.add(name)
    } else if (active.has(name)) {
      active.delete(name)
    } else {
      active.add(name)
    }
    this.setAttribute('active', [...active].join(','))
    this.emit('change', { active: [...active] })
    this.update()
  }

  protected override update(): void {
    const active = this.getActive()
    for (const item of this.querySelectorAll('oas-collapse-item') as NodeListOf<OASCollapseItem>) {
      if (active.includes(item.getAttribute('name') ?? '')) item.setAttribute('open', '')
      else item.removeAttribute('open')
      if (!this.bound.has(item)) {
        item.addEventListener('oas-collapse-item-click', ((e: Event) => {
          this.toggle((e as CustomEvent<{ item: OASCollapseItem }>).detail.item.getAttribute('name') ?? '')
        }) as EventListener)
        this.bound.add(item)
      }
    }
  }

  private bound = new WeakSet<OASCollapseItem>()

  private getActive(): string[] {
    return this.getAttr('active', '').split(',').filter(Boolean)
  }
}
