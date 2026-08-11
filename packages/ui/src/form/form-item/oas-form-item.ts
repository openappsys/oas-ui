import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
/* label-align 为 left/right 时标签与控件同行 */
:host([data-form-label-align='left']) .field,
:host([data-form-label-align='right']) .field {
  flex-direction: row;
  align-items: baseline;
}
.label {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
:host([data-form-label-align='left']) .label,
:host([data-form-label-align='right']) .label {
  flex: 0 0 auto;
  width: var(--oas-form-label-width, 96px);
}
:host([data-form-label-align='right']) .label {
  justify-content: flex-end;
  text-align: right;
}
.required {
  color: var(--oas-color-danger);
  font-weight: 500;
  line-height: 1;
}
.control {
  flex: 1;
  min-width: 0;
}
.error-text {
  color: var(--oas-color-danger);
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
}
[hidden] {
  display: none;
}
`

/** label-align 枚举白名单，非法值回退 top */
const LABEL_ALIGNS = ['left', 'right', 'top'] as const
type LabelAlign = (typeof LABEL_ALIGNS)[number]

export class OASFormItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'name', 'span', 'required']
  }

  private labelEl: HTMLElement | null = null
  private labelTextEl: HTMLElement | null = null
  private requiredEl: HTMLElement | null = null
  private errorEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="field" part="field">
        <label part="label" class="label">
          <span part="text" class="label-text"></span>
          <span part="required" class="required" aria-hidden="true" hidden>*</span>
        </label>
        <div class="control" part="control">
          <slot></slot>
        </div>
        <div part="error" class="error-text" role="alert" hidden></div>
      </div>
    `
    this.labelEl = this.shadow.querySelector<HTMLElement>('[part="label"]')
    this.labelTextEl = this.shadow.querySelector<HTMLElement>('.label-text')
    this.requiredEl = this.shadow.querySelector<HTMLElement>('[part="required"]')
    this.errorEl = this.shadow.querySelector<HTMLElement>('[part="error"]')

    // 点击 label 聚焦默认插槽控件（跨 Shadow DOM 原生 label for 不可用，手动代理，复用 oas-label 约定）
    this.labelEl?.addEventListener('click', () => this.focusControl())
    this.update()
  }

  protected override update(): void {
    // 感知父 oas-form 的布局配置（closest 读属性；form 属性变化时由 form 侧调 refreshLayout 同步）
    const form = this.closest('oas-form')
    const isGrid = form?.getAttribute('layout') === 'grid'
    // grid 模式按 span 占列（1-24 整数，非法按 24）；vertical/无 form 忽略 span，退化为块级
    if (isGrid) {
      this.style.gridColumn = `span ${this.normalizeSpan(this.getAttr('span', '24'))}`
    } else {
      this.style.gridColumn = ''
    }

    const labelAlign = this.normalizeAlign(form?.getAttribute('label-align'))
    this.dataset.formLabelAlign = labelAlign

    const labelWidth = form?.getAttribute('label-width') ?? ''
    if (labelWidth === '') this.style.removeProperty('--oas-form-label-width')
    else this.style.setProperty('--oas-form-label-width', labelWidth)

    const label = this.getAttr('label', '')
    if (this.labelTextEl) this.labelTextEl.textContent = label
    // label 缺省且非必填时不渲染标签行
    if (this.labelEl) this.labelEl.hidden = label === '' && !this.hasAttr('required')
    if (this.requiredEl) this.requiredEl.hidden = !this.hasAttr('required')
  }

  /** span 归一化：仅接受 1-24 整数，否则按 24 */
  private normalizeSpan(value: string): number {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1 || n > 24) return 24
    return n
  }

  private normalizeAlign(value: string | null | undefined): LabelAlign {
    return LABEL_ALIGNS.includes(value as LabelAlign) ? (value as LabelAlign) : 'top'
  }

  private focusControl(): void {
    const direct = this.firstElementChild as (HTMLElement & { focus?: () => void }) | null
    if (direct && typeof direct.focus === 'function') {
      direct.focus()
      return
    }
    const focusable = this.querySelector<HTMLElement>(
      'input, select, textarea, [tabindex], button, [role="button"]',
    )
    focusable?.focus()
  }

  /** 校验错误文本收编（由 oas-form 调用）。message 为空时移除错误态。 */
  setError(message: string | null): void {
    if (!this.errorEl) return
    this.errorEl.textContent = message ?? ''
    this.errorEl.hidden = message == null || message === ''
  }

  /** 供父 oas-form 在布局属性变化时调用，即时重刷 grid/标签布局感知 */
  refreshLayout(): void {
    this.update()
  }
}
