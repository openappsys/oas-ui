import { OASElement } from '@oas-ui/core'
import type { OASCheckbox } from './oas-checkbox.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
fieldset {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
legend {
  padding: 0;
  margin-bottom: var(--oas-space-1);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASCheckboxGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled']
  }

  private items: OASCheckbox[] = []

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <fieldset part="group">
        <legend part="legend"><slot name="label"></slot></legend>
        <slot></slot>
      </fieldset>
    `
  }

  /** 绑定 slotchange + 初次收集（render 与水合路径共用） */
  private bind(): void {
    const slot = this.shadow.querySelector('slot:not([name])')
    slot?.addEventListener('slotchange', () => this.collect())
    this.collect()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（fieldset 与默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('fieldset')) return false
    if (!this.shadow.querySelector('slot:not([name])')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.collect()
  }

  private collect(): void {
    const disabled = this.hasAttr('disabled')
    const values = this.parseValue()
    this.items = [...this.querySelectorAll('oas-checkbox')] as OASCheckbox[]
    for (const cb of this.items) {
      cb.toggleAttribute('checked', values.includes(cb.getAttribute('value') ?? ''))
      cb.toggleAttribute('disabled', disabled)
      cb.addEventListener('oas-change', this.handleItemChange)
    }
  }

  private handleItemChange = (e: Event): void => {
    const cb = e.target as OASCheckbox
    if (!this.contains(cb)) return
    const value = cb.getAttribute('value') ?? ''
    const current = new Set(this.parseValue())
    if (cb.hasAttribute('checked')) current.add(value)
    else current.delete(value)
    this.setAttribute('value', JSON.stringify([...current]))
    this.emit('change', { value: [...current] })
  }

  private parseValue(): string[] {
    const raw = this.getAttr('value', '[]')
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }
}
