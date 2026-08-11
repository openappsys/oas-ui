import { OASElement } from '@oas-ui/core'
import type { OASRadio } from './oas-radio.js'

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

/** 组内互斥 name：确定性计数器（SSR 快照可重复，浏览器多实例不冲突） */
let radioGroupCounter = 0

export class OASRadioGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled']
  }

  private items: OASRadio[] = []
  private groupName = `oas-radio-group-${++radioGroupCounter}`

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
    const value = this.getAttr('value', '')
    const disabled = this.hasAttr('disabled')
    this.items = [...this.querySelectorAll('oas-radio')] as OASRadio[]
    for (const r of this.items) {
      r.setAttribute('name', this.groupName)
      r.toggleAttribute('checked', r.getAttribute('value') === value)
      r.toggleAttribute('disabled', disabled)
      r.addEventListener('oas-change', this.handleItemChange)
    }
  }

  private handleItemChange = (e: Event): void => {
    const r = e.target as OASRadio
    if (!this.contains(r)) return
    if (!r.hasAttribute('checked')) return
    const value = r.getAttribute('value') ?? ''
    this.setAttribute('value', value)
    this.emit('change', { value })
  }
}
