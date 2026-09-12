import { OASElement } from '@oas-ui/core'

/** size 尺寸档（对齐全局三档：勾选框 14/16/18px + 字号联动） */
const VALID_SIZES = ['small', 'medium', 'large'] as const
/** status 校验态：success / warning / error（error 联动 aria-invalid） */
const VALID_STATUSES = ['error', 'warning', 'success'] as const
/** variant 形态：default 常规 / card 卡片（整块可点 + 选中描边） */
const VALID_VARIANTS = ['default', 'card'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认（非法值不告警，保持输出干净） */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* 尺寸档内部变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
  --_box: 16px;
  --_font: var(--oas-font-size-md);
}
:host([data-size='small']) {
  --_box: 14px;
  --_font: var(--oas-font-size-sm);
}
:host([data-size='large']) {
  --_box: 18px;
  --_font: var(--oas-font-size-lg);
}
label {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
  cursor: pointer;
  font-size: var(--_font);
  line-height: 1.5;
  color: var(--oas-color-text-primary);
}
/* 勾选框与首行文本基线对齐（行高 1.5em 与框高的差值半分） */
.box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--_box);
  height: var(--_box);
  flex-shrink: 0;
  margin-block-start: calc((1.5em - var(--_box)) / 2);
}
input {
  width: var(--_box);
  height: var(--_box);
  accent-color: var(--oas-color-primary);
  cursor: pointer;
  margin: 0;
}
input:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 自定义指示器模式：原生 input 视觉隐藏（保留聚焦/点击语义），图标层接管显示；
   未选态给默认空心轮廓（宿主可 ::part(box) 覆写），选中态显示插槽图标 */
:host([data-custom-checked-icon]) .box input,
:host([data-custom-indeterminate-icon]) .box input {
  position: absolute;
  inset: 0;
  opacity: 0;
}
:host([data-custom-checked-icon]) .box,
:host([data-custom-indeterminate-icon]) .box {
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-xs);
  box-sizing: border-box;
}
:host([data-custom-checked-icon][data-status='success']) .box,
:host([data-custom-indeterminate-icon][data-status='success']) .box {
  border-color: var(--oas-color-success);
}
:host([data-custom-checked-icon][data-status='warning']) .box,
:host([data-custom-indeterminate-icon][data-status='warning']) .box {
  border-color: var(--oas-color-warning);
}
:host([data-custom-checked-icon][data-status='error']) .box,
:host([data-custom-indeterminate-icon][data-status='error']) .box {
  border-color: var(--oas-color-danger);
}
:host([data-custom-checked-icon][disabled]) .box,
:host([data-custom-checked-icon][data-disabled]) .box,
:host([data-custom-checked-icon][data-group-disabled]) .box,
:host([data-custom-indeterminate-icon][disabled]) .box,
:host([data-custom-indeterminate-icon][data-disabled]) .box,
:host([data-custom-indeterminate-icon][data-group-disabled]) .box {
  border-color: var(--oas-color-border);
}
.indicator {
  display: none;
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
:host([data-custom-checked-icon][checked]) .indicator-checked {
  display: inline-flex;
}
:host([data-custom-indeterminate-icon][indeterminate]) .indicator-indeterminate {
  display: inline-flex;
}
/* 自定义指示器模式下焦点环上移到 .box（input opacity:0 连带自身 ring 不可见） */
:host([data-custom-checked-icon][data-focus-visible]) .box,
:host([data-custom-indeterminate-icon][data-focus-visible]) .box {
  border-radius: var(--oas-radius-xs);
  box-shadow: var(--oas-focus-ring);
}
.content {
  min-width: 0;
}
.description {
  display: block;
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  color: var(--oas-color-text-secondary);
}
.desc-text {
  display: block;
}
.desc-text[hidden],
.description[hidden] {
  display: none;
}
/* ---- label 位置：start 时文本在框的 start 侧（row-reverse 在 RTL 下自动镜像） ---- */
:host([label-position='start']) label {
  flex-direction: row-reverse;
}
/* ---- 禁用三来源（自身 / provider 注入镜像 / 组下发） ---- */
:host([disabled]) label,
:host([data-disabled]) label,
:host([data-group-disabled]) label {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
:host([disabled]) input,
:host([data-disabled]) input,
:host([data-group-disabled]) input {
  cursor: not-allowed;
}
/* ---- 只读：可聚焦可复制、不切换 ---- */
:host([readonly]) label,
:host([data-group-readonly]) label {
  cursor: default;
}
/* ---- 组数量限制（max 未选项 / min 已选项）：置灰拦截 ---- */
:host([data-limit-blocked]) {
  opacity: 0.6;
}
:host([data-limit-blocked]) label {
  cursor: not-allowed;
}
:host([data-limit-blocked]) input {
  cursor: not-allowed;
}
/* ---- status 校验态：勾选框着色（自定义指示器模式下由宿主图标自带色） ---- */
:host([data-status='success']) input {
  accent-color: var(--oas-color-success);
}
:host([data-status='warning']) input {
  accent-color: var(--oas-color-warning);
}
:host([data-status='error']) input {
  accent-color: var(--oas-color-danger);
}
/* ---- 卡片形态：整块可点 + 选中描边（选中/半选同视觉） ---- */
:host([data-variant='card']) label {
  display: flex;
  padding: var(--oas-space-3) var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
:host([data-variant='card']) label:hover {
  border-color: var(--oas-color-primary);
}
:host([data-variant='card'][checked]) label {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 6%, var(--oas-color-bg));
}
:host([data-variant='card'][indeterminate]) label {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 6%, var(--oas-color-bg));
}
:host([data-variant='card'][disabled]) label,
:host([data-variant='card'][data-disabled]) label,
:host([data-variant='card'][data-group-disabled]) label {
  cursor: not-allowed;
  border-color: var(--oas-color-border);
  background: var(--oas-color-bg-disabled);
}
:host([data-variant='card'][data-status='success']) label {
  border-color: var(--oas-color-success);
}
:host([data-variant='card'][data-status='warning']) label {
  border-color: var(--oas-color-warning);
}
:host([data-variant='card'][data-status='error']) label,
:host([data-variant='card'][aria-invalid='true']) label {
  border-color: var(--oas-color-danger);
}
`

/** label for/input id 关联：确定性计数器（SSR 快照可重复，浏览器多实例不冲突） */
let cbIdCounter = 0

export class OASCheckbox extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'checked',
      'disabled',
      'indeterminate',
      'value',
      'disabled-skip',
      'size',
      'status',
      'readonly',
      'variant',
      'description',
      // 组下发通道（data-group-* / data-limit-blocked 由 oas-checkbox-group 写入）
      'data-group-size',
      'data-group-disabled',
      'data-group-readonly',
      'data-group-status',
      'data-limit-blocked',
    ]
  }

  private input: HTMLInputElement | null = null
  private labelEl: HTMLLabelElement | null = null
  private inputId = ''
  /** aria-invalid 由 status=error 设置的所有权标志（清理时只移除自己设置的，不动宿主自设值） */
  private invalidByStatus = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <label part="label">
        <span class="box" part="box">
          <input part="checkbox" type="checkbox" />
          <span class="indicator indicator-checked" part="indicator-checked" aria-hidden="true"><slot name="checked-icon"></slot></span>
          <span class="indicator indicator-indeterminate" part="indicator-indeterminate" aria-hidden="true"><slot name="indeterminate-icon"></slot></span>
        </span>
        <span class="content" part="content">
          <slot></slot>
          <span class="description" part="description" hidden>
            <span class="desc-text" hidden></span><slot name="description"></slot>
          </span>
        </span>
      </label>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 分配确定性 id（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.labelEl = this.shadow.querySelector('label')

    this.inputId = `oas-cb-${++cbIdCounter}`

    this.input?.addEventListener('change', () => {
      const checked = this.input!.checked
      this.toggleAttribute('checked', checked)
      this.emit('change', { checked, value: this.getAttr('value', '') })
    })
    // 只读与数量限制拦截：click 阻止默认行为即可阻止勾选切换（键盘 Space 同路径）
    this.input?.addEventListener('click', (e) => {
      if (this.isReadonly()) {
        e.preventDefault()
        return
      }
      if (this.hasAttr('data-limit-blocked')) {
        e.preventDefault()
        const value = this.getAttr('value', '')
        this.emit('limit-blocked', { value })
      }
    })
    // 焦点事件直通 + focus-visible 镜像（自定义指示器模式下 ring 上移到 .box）
    this.input?.addEventListener('focus', () => {
      this.emit('focus')
      this.syncFocusVisible()
    })
    this.input?.addEventListener('blur', () => {
      this.emit('blur')
      this.removeAttribute('data-focus-visible')
    })
    // 具名插槽内容增删 → 重算指示器/描述显隐
    for (const name of ['checked-icon', 'indeterminate-icon', 'description']) {
      this.shadow.querySelector(`slot[name="${name}"]`)?.addEventListener('slotchange', () => {
        this.syncNamedSlots()
      })
    }
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
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入 > 组下发）
    const disabled = this.injectDisabled() || this.hasAttr('data-group-disabled')
    const indeterminate = this.hasAttr('indeterminate')
    const readonly = this.isReadonly()

    // 镜像最终禁用态到宿主 data-disabled（供 :host([data-disabled]) 样式消费，覆盖注入场景）
    this.toggleAttribute('data-disabled', disabled)

    // 尺寸档：单项显式 size > 组下发 > config-provider 密度注入 > medium
    this.setAttribute('data-size', this.resolveSize())

    // 校验态：单项显式 status > 组下发；error 联动 aria-invalid（所有权标志防误清宿主自设值）
    const status = normalizeChoice(
      this.getAttr('status', '') || this.getAttr('data-group-status', ''),
      '',
      VALID_STATUSES,
    )
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') {
      if (!this.hasAttribute('aria-invalid')) this.invalidByStatus = true
      this.setAttribute('aria-invalid', 'true')
    } else if (this.invalidByStatus) {
      this.invalidByStatus = false
      this.removeAttribute('aria-invalid')
    }

    // 形态镜像（default/card）
    this.setAttribute('data-variant', normalizeChoice(this.getAttr('variant', ''), 'default', VALID_VARIANTS))

    input.checked = checked
    input.disabled = disabled
    input.indeterminate = indeterminate
    input.setAttribute('aria-checked', indeterminate ? 'mixed' : String(checked))
    if (readonly) input.setAttribute('aria-readonly', 'true')
    else input.removeAttribute('aria-readonly')

    input.id = this.inputId
    if (this.labelEl) this.labelEl.setAttribute('for', this.inputId)

    this.syncNamedSlots()
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内原生 checkbox（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }

  /** 只读判定：单项显式 readonly > 组下发（可聚焦、不切换，与 disabled 表单语义分立） */
  private isReadonly(): boolean {
    return this.hasAttr('readonly') || this.hasAttr('data-group-readonly')
  }

  /** 尺寸档解析链：单项显式 > 组下发 > provider 注入 > medium（非法值静默回落 medium） */
  private resolveSize(): string {
    const own = this.getAttribute('size')
    if (own != null && own !== '') return normalizeChoice(own, 'medium', VALID_SIZES)
    const group = this.getAttribute('data-group-size')
    if (group != null && group !== '') return normalizeChoice(group, 'medium', VALID_SIZES)
    return normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
  }

  /**
   * 具名插槽同步：自定义指示器镜像 + description 显隐。
   * 约束：组件永不写 slot 的子树（含 fallback）——Chromium 中 slot 子树变更会再派发该 slot 的
   * slotchange，若由 slotchange 回调触发写入会形成微任务泵死循环（主线程饿死）；
   * 属性文本写入独立的 .desc-text 节点，与 slot 分发并列互斥显示。
   */
  private syncNamedSlots(): void {
    const hasSlotContent = (name: string): boolean => {
      const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      return (slot?.assignedElements().length ?? 0) > 0
    }
    this.syncIndicatorTpl('checked-icon', '.indicator-checked')
    this.syncIndicatorTpl('indeterminate-icon', '.indicator-indeterminate')
    this.toggleAttribute('data-custom-checked-icon', hasSlotContent('checked-icon'))
    this.toggleAttribute('data-custom-indeterminate-icon', hasSlotContent('indeterminate-icon'))

    const descWrap = this.shadow.querySelector<HTMLElement>('.description')
    if (!descWrap) return
    const hasDescSlot = hasSlotContent('description')
    const descText = this.getAttr('description', '')
    // 属性文本写 .desc-text（非 slot 子树）；有 slot 分发时让位隐藏
    const descTextEl = descWrap.querySelector<HTMLElement>('.desc-text')
    if (descTextEl) {
      if (descTextEl.textContent !== descText) descTextEl.textContent = descText
      descTextEl.hidden = hasDescSlot || descText === ''
    }
    descWrap.hidden = !hasDescSlot && descText === ''
  }

  /** template[slot] 指示器通道：template 分发进 slot 无视觉（内容 inert），克隆展开进指示器容器 */
  private syncIndicatorTpl(slotName: string, indicatorSelector: string): void {
    const indicator = this.shadow.querySelector<HTMLElement>(indicatorSelector)
    if (!indicator) return
    indicator.querySelector('.indicator-tpl')?.remove()
    const tpl = this.querySelector(`template[slot="${slotName}"]`)
    if (!(tpl instanceof HTMLTemplateElement)) return
    const holder = document.createElement('span')
    holder.className = 'indicator-tpl'
    holder.appendChild(tpl.content.cloneNode(true))
    indicator.appendChild(holder)
  }

  /** focus-visible 镜像（matches 查询在不支持的环境静默回落 false） */
  private syncFocusVisible(): void {
    let visible = false
    try {
      visible = this.input?.matches(':focus-visible') === true
    } catch {
      visible = false
    }
    this.toggleAttribute('data-focus-visible', visible)
  }
}
