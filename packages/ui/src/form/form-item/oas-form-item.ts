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
/* 错误提示收纳在 control 内（slot 之后），label 在左侧时错误仍位于控件下方 */
.error-text {
  color: var(--oas-color-danger);
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
}
/* ---- inline 行内模式：label 在控件左侧且宽度自适应、控件自动宽度 ---- */
:host([data-form-layout='inline']) .field {
  flex-direction: row;
  align-items: baseline;
  gap: var(--oas-space-2);
}
:host([data-form-layout='inline']) .label {
  flex: 0 0 auto;
  width: auto;
}
:host([data-form-layout='inline']) .control {
  flex: 0 1 auto;
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

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="field" part="field">
        <label part="label" class="label">
          <span part="text" class="label-text"></span>
          <span part="required" class="required" aria-hidden="true" hidden>*</span>
        </label>
        <div class="control" part="control">
          <slot></slot>
          <div part="error" class="error-text" role="alert" hidden></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定 label 点击聚焦（render 与水合路径共用） */
  private bind(): void {
    this.labelEl = this.shadow.querySelector<HTMLElement>('[part="label"]')
    this.labelTextEl = this.shadow.querySelector<HTMLElement>('.label-text')
    this.requiredEl = this.shadow.querySelector<HTMLElement>('[part="required"]')
    this.errorEl = this.shadow.querySelector<HTMLElement>('[part="error"]')

    // 点击 label 聚焦默认插槽控件（跨 Shadow DOM 原生 label for 不可用，手动代理，复用 oas-label 约定）
    this.labelEl?.addEventListener('click', () => this.focusControl())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（field/label/control 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.field')) return false
    if (!this.shadow.querySelector('[part="label"]')) return false
    if (!this.shadow.querySelector('.control')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 感知父 oas-form 的布局配置（closest 读属性；form 属性变化时由 form 侧调 refreshLayout 同步）。
    // inline 优先于 layout：标签强制左侧、label-width 自动、span 忽略。
    const form = this.closest('oas-form')
    const isInline = form?.hasAttribute('inline') === true
    const isGrid = !isInline && form?.getAttribute('layout') === 'grid'
    // grid 模式按 span 占列（1-24 整数，非法按 24）；vertical/inline/无 form 忽略 span，退化为块级
    if (isGrid) {
      this.style.gridColumn = `span ${this.normalizeSpan(this.getAttr('span', '24'))}`
    } else {
      this.style.gridColumn = ''
    }

    const labelAlign = isInline ? 'left' : this.normalizeAlign(form?.getAttribute('label-align'))
    this.dataset.formLabelAlign = labelAlign
    // 行内布局标记（CSS 钩子）；先写 label-align 再写 layout，保持 SSR 快照属性顺序稳定
    if (isInline) this.dataset.formLayout = 'inline'
    else delete this.dataset.formLayout

    const labelWidth = isInline ? '' : (form?.getAttribute('label-width') ?? '')
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
