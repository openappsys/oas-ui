import { OASElement } from '@oas-ui/core'

export interface StepItem {
  title: string
  description?: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.steps {
  display: flex;
}
.steps[data-direction='vertical'] {
  flex-direction: column;
}
.item {
  flex: 1;
  position: relative;
  text-align: center;
}
.steps[data-direction='vertical'] .item {
  display: flex;
  text-align: left;
  gap: var(--oas-space-3);
  padding-bottom: var(--oas-space-5);
}
.item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: var(--oas-control-height-sm);
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--oas-color-border);
  z-index: 0;
}
.item[data-status='finish']:not(:last-child)::after {
  background: var(--oas-color-primary);
}
.steps[data-direction='vertical'] .item:not(:last-child)::after {
  top: var(--oas-control-height-sm);
  left: var(--oas-control-height-sm);
  width: 2px;
  height: 100%;
}
.icon {
  width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  border-radius: 50%;
  border: 2px solid var(--oas-color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  position: relative;
  z-index: 1;
}
.item[data-status='finish'] .icon,
.item[data-status='current'] .icon {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.item[data-status='current'] .icon {
  font-weight: 600;
}
.text {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
}
.desc {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
`

export class OASSteps extends OASElement {
  static override get observedAttributes(): string[] {
    return ['steps', 'current', 'direction']
  }

  private steps: StepItem[] = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="steps" part="steps"></div>
    `
    this.update()
  }

  protected override update(): void {
    const stepsEl = this.shadow.querySelector('.steps')
    if (!stepsEl) return
    this.parseSteps()
    const direction = this.getAttr('direction', 'horizontal')
    stepsEl.setAttribute('data-direction', direction)
    stepsEl.innerHTML = ''
    const current = Number(this.getAttr('current', '0')) || 0
    this.steps.forEach((step, idx) => {
      const item = document.createElement('div')
      item.className = 'item'
      item.setAttribute('part', 'item')
      const status = idx < current ? 'finish' : idx === current ? 'current' : 'wait'
      item.setAttribute('data-status', status)
      const icon = document.createElement('span')
      icon.className = 'icon'
      icon.textContent = status === 'finish' ? '✓' : String(idx + 1)
      const textWrap = document.createElement('div')
      const title = document.createElement('div')
      title.className = 'text'
      title.textContent = step.title
      textWrap.appendChild(title)
      if (step.description) {
        const desc = document.createElement('div')
        desc.className = 'desc'
        desc.textContent = step.description
        textWrap.appendChild(desc)
      }
      item.append(icon, textWrap)
      stepsEl.appendChild(item)
    })
  }

  private parseSteps(): void {
    try {
      const parsed = JSON.parse(this.getAttr('steps', '[]'))
      this.steps = Array.isArray(parsed)
        ? parsed.filter((s): s is StepItem => s && typeof s.title === 'string')
        : []
    } catch {
      this.steps = []
    }
  }
}
