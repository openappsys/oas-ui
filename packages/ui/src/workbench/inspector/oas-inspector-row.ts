import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-height: var(--oas-inspector-row-height, 28px);
  box-sizing: border-box;
  border-block-end: 1px solid var(--oas-inspector-divider-color, var(--oas-color-border));
}
.label {
  flex: 0 0 50%;
  min-width: 0;
  box-sizing: border-box;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  text-align: start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.label[hidden] {
  display: none;
}
.value {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  font-size: var(--oas-font-size-sm);
}
.value[hidden] {
  display: none;
}
/* 键值行数值：表格数字体对齐 */
.value-text {
  font-variant-numeric: tabular-nums;
  color: var(--oas-color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.value-text.mixed {
  color: var(--oas-color-text-secondary);
  font-style: italic;
}
/* 控件行：插槽内容占满右半（标签 50/50 右分栏对齐） */
slot:not([name])::slotted(*) {
  flex: 1;
  min-width: 0;
}
.reset-btn {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--oas-control-height-xs, 20px);
  height: var(--oas-control-height-xs, 20px);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
}
.reset-btn:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.reset-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.reset-btn[hidden] {
  display: none;
}
/* align-top：标签与控件顶部对齐（适配高控件行，如多行控件） */
:host([align-top]) .row {
  align-items: flex-start;
}
/* striped：斑马纹底（宿主按行交替设置，值走 token 含暗色变体） */
:host([striped]) .row {
  background: var(--oas-inspector-row-striped-bg, var(--oas-color-bg-hover));
}
/* 斑马底上标签提深一档，保证次级文字在底纹上仍达对比度（回归：曾 4.39 < 4.5） */
:host([striped]) .label {
  color: var(--oas-color-text-secondary-strong);
}
`

/** 复位图标（原创 SVG：逆时针回环箭头） */
const RESET_ICON =
  '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 8a5 5 0 1 1 1.5 3.6"/><path d="M3 12.5V8.8h3.7"/></svg>'

/**
 * oas-inspector-row —— 属性行（键值行 / 标签控件行）。
 *
 * 双形态（按默认插槽是否分发内容自动切换）：
 * - **键值行**（无插槽内容）：label ↔ value 只读展示（表格数字体对齐）；`mixed` 在场显示
 *   「混合值」内置文案（多选混合态，value 让位）
 * - **控件行**（有插槽内容）：label ↔ 控件 50/50 分栏（slider/select 等表单件由宿主放入，
 *   控件自带可访问名；跨 shadow 的 label for/aria-labelledby 引用平台不支持，结构相邻承担语义）
 *
 * 属性（kebab-case）：`label`、`value`、`mixed`（布尔）、`reset`（布尔，显示行级复位钮）、
 * `align-top`（布尔，标签/控件顶对齐）、`striped`（布尔，斑马纹底）。
 *
 * 事件：`oas-row-reset`（detail `{ label }`，bubbles + composed）。
 */
export class OASInspectorRow extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'value', 'mixed', 'reset', 'align-top', 'striped', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致（单行书写防空白文本节点） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="row" part="row"><span class="label" part="row-label" hidden></span><div class="value" part="row-value"><slot></slot><span class="value-text" part="row-value-text" hidden></span><button class="reset-btn" part="row-reset" type="button" hidden>${RESET_ICON}</button></div></div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="row-reset"]')?.addEventListener('click', () => {
      this.emit('row-reset', { label: this.getAttr('label', '') })
    })
    for (const s of this.shadow.querySelectorAll('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（row 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="row"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    const labelEl = this.shadow.querySelector<HTMLElement>('[part="row-label"]')
    const valueWrap = this.shadow.querySelector<HTMLElement>('[part="row-value"]')
    const valueText = this.shadow.querySelector<HTMLElement>('[part="row-value-text"]')
    const resetBtn = this.shadow.querySelector<HTMLElement>('[part="row-reset"]')
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    if (!labelEl || !valueWrap || !valueText || !resetBtn || !slot) return

    // label：空时隐藏（无空占位）；复位钮 aria-label 走 i18n（locale 反应式）
    const label = this.getAttr('label', '')
    labelEl.textContent = label
    labelEl.hidden = label === ''
    resetBtn.setAttribute('aria-label', this.t('inspector.reset'))
    resetBtn.hidden = !this.hasAttr('reset')

    // 双形态：有分发内容 → 控件行（value 文本让位）；无 → 键值行（value/mixed 文本）
    const hasControls = slot.assignedElements().length > 0
    const mixed = this.hasAttr('mixed')
    if (hasControls) {
      valueText.hidden = true
      valueWrap.classList.add('controls')
    } else {
      valueText.textContent = mixed ? this.t('inspector.mixed') : this.getAttr('value', '')
      valueText.classList.toggle('mixed', mixed)
      valueText.hidden = valueText.textContent === ''
      valueWrap.classList.remove('controls')
    }
  }
}
