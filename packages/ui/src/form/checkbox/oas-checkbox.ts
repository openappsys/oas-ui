import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
label {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
:host([disabled]) label {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
input {
  width: 16px;
  height: 16px;
  accent-color: var(--oas-color-primary);
  cursor: pointer;
  margin: 0;
}
input:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
:host([disabled]) input {
  cursor: not-allowed;
}
`

/** label for/input id 关联：确定性计数器（SSR 快照可重复，浏览器多实例不冲突） */
let cbIdCounter = 0

export class OASCheckbox extends OASElement {
  static override get observedAttributes(): string[] {
    return ['checked', 'disabled', 'indeterminate', 'value']
  }

  private input: HTMLInputElement | null = null
  private labelEl: HTMLLabelElement | null = null
  private inputId = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <label part="label"><input part="checkbox" type="checkbox" /><slot></slot></label>
    `
  }

  /** 缓存节点引用 + 绑定 change 事件 + 分配确定性 id（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.labelEl = this.shadow.querySelector('label')
    this.inputId = `oas-cb-${++cbIdCounter}`

    this.input?.addEventListener('change', () => {
      const checked = this.input!.checked
      this.toggleAttribute('checked', checked)
      this.emit('change', { checked, value: this.getAttr('value', '') })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（原生 checkbox input 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input[type="checkbox"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const input = this.input
    if (!input) return
    const checked = this.hasAttr('checked')
    const disabled = this.hasAttr('disabled')
    const indeterminate = this.hasAttr('indeterminate')

    input.checked = checked
    input.disabled = disabled
    input.indeterminate = indeterminate
    input.setAttribute('aria-checked', indeterminate ? 'mixed' : String(checked))

    input.id = this.inputId
    if (this.labelEl) this.labelEl.setAttribute('for', this.inputId)
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内原生 checkbox（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }
}
