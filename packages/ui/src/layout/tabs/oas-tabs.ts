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

/* 卡片式（type=card）：标签带边框、激活标签与面板连通、四边有线 */
:host(.oas-tabs--card) .tablist {
  border-bottom: none;
  gap: var(--oas-space-1);
}
:host(.oas-tabs--card) .tab {
  border: 1px solid var(--oas-color-border);
  border-bottom: none;
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
  margin-bottom: -1px;
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
:host(.oas-tabs--card) .tab[aria-selected='true'] {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid var(--oas-color-bg);
  background: var(--oas-color-bg);
}
:host(.oas-tabs--card) .panel {
  margin-top: -1px;
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) var(--oas-radius-md);
  background: var(--oas-color-bg);
}
`

export class OASTabs extends OASElement {
  static override get observedAttributes(): string[] {
    return ['active', 'type']
  }

  private panels: OASTabPanel[] = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist" role="tablist"></div>
      <div class="panel" part="panel"><slot></slot></div>
    `
    this.shadow
      .querySelector('.tablist')
      ?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.update()
  }

  protected override update(): void {
    this.panels = [...this.querySelectorAll('oas-tab-panel')] as OASTabPanel[]
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return
    // 样式变体：line（下划线，默认）/ card（卡片式）
    const type = this.getAttr('type', 'line')
    this.classList.toggle('oas-tabs--card', type === 'card')
    tablist.innerHTML = ''
    const active = this.getAttr('active', '')
    let firstValue = ''
    this.panels.forEach((panel, idx) => {
      const value = panel.getAttribute('value') ?? ''
      if (idx === 0) firstValue = value
      const btn = document.createElement('button')
      btn.className = 'tab'
      btn.classList.toggle('tab--card', type === 'card')
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
