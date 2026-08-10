import { OASElement } from '@oas-ui/core'

/** 步骤状态：wait 等待 / process 进行中 / finish 完成 / error 错误 */
export type StepStatus = 'wait' | 'process' | 'finish' | 'error'

export interface StepItem {
  title: string
  description?: string
  /** 显式状态，缺省时按 current 推导（前序 finish / 当前 process / 其余 wait） */
  status?: StepStatus
}

const VALID_STATUS = new Set<StepStatus>(['wait', 'process', 'finish', 'error'])

const STYLE = `
:host {
  display: block;
  width: 100%;
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
/* 连接线颜色跟随前一步状态：process 主色 / finish 成功色 / error 危险色 */
.item[data-status='process']:not(:last-child)::after {
  background: var(--oas-color-primary);
}
.item[data-status='finish']:not(:last-child)::after {
  background: var(--oas-color-success);
}
.item[data-status='error']:not(:last-child)::after {
  background: var(--oas-color-danger);
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
/* wait：次要色（默认），process：主色，finish：成功色，error：危险色 */
.item[data-status='process'] .icon {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
  font-weight: 600;
}
.item[data-status='finish'] .icon {
  border-color: var(--oas-color-success);
  color: var(--oas-color-success);
}
.item[data-status='error'] .icon {
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
.text {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.desc {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
/* clickable：整项可点，hover 图标轻微强调、focus-visible 焦点环 */
.steps[data-clickable='true'] .item {
  cursor: pointer;
}
.steps[data-clickable='true'] .item:hover .icon {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
}
.steps[data-clickable='true'] .item:focus-visible {
  outline: none;
  border-radius: var(--oas-radius-sm);
  box-shadow: var(--oas-focus-ring);
}
`

export class OASSteps extends OASElement {
  static override get observedAttributes(): string[] {
    return ['steps', 'current', 'direction', 'clickable']
  }

  private _steps: StepItem[] = []

  /** Vue/React 会把 steps 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get steps(): StepItem[] {
    return this._steps
  }
  set steps(value: StepItem[] | string) {
    this.setAttribute('steps', typeof value === 'string' ? value : JSON.stringify(value))
  }

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
    const clickable = this.hasAttr('clickable')
    if (clickable) stepsEl.setAttribute('data-clickable', 'true')
    else stepsEl.removeAttribute('data-clickable')
    stepsEl.innerHTML = ''
    const current = Number(this.getAttr('current', '0')) || 0
    this._steps.forEach((step, idx) => {
      const item = document.createElement('div')
      item.className = 'item'
      item.setAttribute('part', 'item')
      const status = this.resolveStatus(step, idx, current)
      item.setAttribute('data-status', status)
      const icon = document.createElement('span')
      icon.className = 'icon'
      icon.textContent =
        status === 'finish' ? '✓' : status === 'error' ? '✕' : String(idx + 1)
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
      if (clickable) {
        // 整项承担按钮角色，键盘 Enter/Space 可达；点击派发 oas-change{index} 并切换 current
        item.setAttribute('role', 'button')
        item.setAttribute('tabindex', '0')
        if (status === 'process') item.setAttribute('aria-current', 'step')
        const goto = (): void => {
          this.setAttribute('current', String(idx))
          this.emit('change', { index: idx })
          this.update()
        }
        item.addEventListener('click', goto)
        item.addEventListener('keydown', (e: Event) => {
          const k = e as KeyboardEvent
          if (k.key !== 'Enter' && k.key !== ' ') return
          k.preventDefault()
          goto()
        })
      }
      stepsEl.appendChild(item)
    })
  }

  /** 状态解析：显式 status 优先，否则按 current 推导（前序 finish / 当前 process / 其余 wait） */
  private resolveStatus(step: StepItem, idx: number, current: number): StepStatus {
    if (step.status && VALID_STATUS.has(step.status)) return step.status
    if (idx < current) return 'finish'
    if (idx === current) return 'process'
    return 'wait'
  }

  private parseSteps(): void {
    try {
      const parsed = JSON.parse(this.getAttr('steps', '[]'))
      this._steps = Array.isArray(parsed)
        ? parsed.filter((s): s is StepItem => s && typeof s.title === 'string')
        : []
    } catch {
      this._steps = []
    }
  }
}
