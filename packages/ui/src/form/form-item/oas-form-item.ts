import { OASElement } from '@oas-ui/core'
import { closeCirclePath } from '@oas-ui/icons/icons/close-circle'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
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
/* label-align=left/right 是显式物理 API：RTL 下标签仍物理右对齐——
   flex-end 会随书写方向镜像到左侧，用 data-rtl 反向钉回物理右侧 */
:host([data-rtl][data-form-label-align='right']) .label {
  justify-content: flex-start;
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
/* 校验状态图标（status-icon 开启 + 错误在场时显示，随错误文本同色 danger） */
.status-icon {
  display: inline-flex;
  align-items: center;
  vertical-align: -2px;
  margin-inline-end: var(--oas-space-1);
}
.status-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}
.status-icon[hidden] {
  display: none;
}
/* 静态帮助文案（help 属性）：常驻控件下方、与校验错误独立并存 */
.help-text {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
}
.help-text[hidden] {
  display: none;
}
/* ---- 表级冒号开关：宿主 oas-form[colon] 镜像 data-colon 后标签渲染冒号 ---- */
:host([data-colon]) .label-text::after {
  content: ':';
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
    return ['label', 'name', 'span', 'required', 'dir', 'help', 'status-icon']
  }

  private labelEl: HTMLElement | null = null
  private labelTextEl: HTMLElement | null = null
  private requiredEl: HTMLElement | null = null
  private errorEl: HTMLElement | null = null
  private errorMsgEl: HTMLElement | null = null
  private statusIconEl: HTMLElement | null = null
  private helpEl: HTMLElement | null = null
  /** 当前错误消息（status-icon 显隐的状态源；null = 无错误） */
  private lastError: string | null = null

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
          <div part="help" class="help-text" hidden></div>
          <div part="error" class="error-text" role="alert" hidden><span part="status-icon" class="status-icon" aria-hidden="true" hidden></span><span class="error-msg"></span></div>
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
    this.errorMsgEl = this.shadow.querySelector<HTMLElement>('.error-msg')
    this.statusIconEl = this.shadow.querySelector<HTMLElement>('[part="status-icon"]')
    this.helpEl = this.shadow.querySelector<HTMLElement>('[part="help"]')

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
    // 书写方向镜像（data-rtl 供 :host([data-rtl]) 物理对齐 API 钉定消费）
    this.toggleAttribute('data-rtl', isRtl(this))
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

    // 表级冒号开关：宿主 oas-form[colon] 感知（form 属性变化经 refreshLayout 链路即时同步）
    this.toggleAttribute('data-colon', this.closest('oas-form')?.hasAttribute('colon') === true)

    // 静态帮助文案（help）：常驻控件下方，与校验错误独立并存
    const help = this.getAttr('help', '')
    if (this.helpEl) {
      if (this.helpEl.textContent !== help) this.helpEl.textContent = help
      this.helpEl.hidden = help === ''
    }

    this.syncStatusIcon()
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
    const focusable = this.querySelector<HTMLElement>('input, select, textarea, [tabindex], button, [role="button"]')
    focusable?.focus()
  }

  /** 校验错误文本收编（由 oas-form 调用）。message 为空时移除错误态。 */
  setError(message: string | null): void {
    this.lastError = message != null && message !== '' ? message : null
    if (!this.errorEl) return
    if (this.errorMsgEl) this.errorMsgEl.textContent = message ?? ''
    this.errorEl.hidden = this.lastError === null
    this.syncStatusIcon()
  }

  /** 状态图标（status-icon 开启 + 错误在场时显示 danger 图标；装饰性 aria-hidden，文本已由 error 播报） */
  private syncStatusIcon(): void {
    const el = this.statusIconEl
    if (!el) return
    if (!(this.hasAttr('status-icon') && this.lastError !== null)) {
      el.hidden = true
      return
    }
    if (!el.querySelector('svg')) {
      el.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">${closeCirclePath}</svg>`
    }
    el.hidden = false
  }

  /** 供父 oas-form 在布局属性变化时调用，即时重刷 grid/标签布局感知 */
  refreshLayout(): void {
    this.update()
  }
}
