import { OASElement } from '@oas-ui/core'
import type { OASTabPanel } from './oas-tab-panel.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.tablist {
  display: flex;
  border-bottom: 1px solid var(--oas-color-border);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tab {
  padding: var(--oas-space-2) var(--oas-space-4);
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
  border-bottom-color: var(--oas-color-primary);
  font-weight: 500;
}
.panel {
  padding-top: var(--oas-space-4);
}
`

export class OASTabs extends OASElement {
  static override get observedAttributes(): string[] {
    return ['active']
  }

  private panels: OASTabPanel[] = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist" role="tablist"></div>
      <div class="panel" part="panel"><slot></slot></div>
    `
    this.shadow.querySelector('.tablist')?.addEventListener('keydown', (e) => this.handleKey(e))
    this.update()
  }

  protected override update(): void {
    this.panels = [...this.querySelectorAll('oas-tab-panel')] as OASTabPanel[]
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return
    tablist.innerHTML = ''
    const active = this.getAttr('active', '')
    let firstValue = ''
    this.panels.forEach((panel, idx) => {
      const value = panel.getAttribute('value') ?? ''
      if (idx === 0) firstValue = value
      const btn = document.createElement('button')
      btn.className = 'tab'
      btn.setAttribute('part', 'tab')
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(value === (active || firstValue)))
      btn.textContent = panel.getAttribute('label') ?? ''
      btn.addEventListener('click', () => {
        this.setAttribute('active', value)
        this.emit('change', { value })
        this.update()
      })
      tablist.appendChild(btn)
    })
    const selected = active || firstValue
    for (const panel of this.panels) {
      const isActive = panel.getAttribute('value') === selected
      panel.hidden = !isActive
    }
  }

  private handleKey(e: KeyboardEvent): void {
    const values = this.panels.map((p) => p.getAttribute('value') ?? '')
    const active = this.getAttr('active', '') || values[0] || ''
    const idx = values.indexOf(active)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.activate(values[(idx + 1) % values.length] ?? '')
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.activate(values[(idx - 1 + values.length) % values.length] ?? '')
    }
  }

  private activate(value: string): void {
    this.setAttribute('active', value)
    this.emit('change', { value })
    this.update()
  }
}
