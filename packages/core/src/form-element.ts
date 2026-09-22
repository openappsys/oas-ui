import { OASElement } from './oas-element.js'

/**
 * 表单类组件基类（form-associated custom element）。
 *
 * 背景：自定义元素默认不是 labelable——消费侧 `<label for="id">` 对 oas-input 等完全不生效
 * （点击不聚焦、屏幕阅读器不关联）。声明 `static formAssociated = true` 后经 `attachInternals`
 * 接入原生表单体系：
 * - label 关联：`labels`/`form` 直接可用；label 点击时浏览器向控件本体派发 click，
 *   基类把它转交为对 shadow 内真实控件的聚焦（`innerControl`）
 * - 原生表单集成：FormData 收集（有 name 才提交）、`form.reset()`、fieldset disabled、校验链
 * - 不支持 ElementInternals 的环境（老 Safari / happy-dom）静默降级为 null，组件行为与旧版一致
 *
 * 子类义务：
 * 1. `getFormValue()`：返回当前应进入 FormData 的「原始值」（非显示值；如 formatter 场景返回解析后的值）；
 *    多值组件（如多选 select）可返回 FormData（原生「同名多条 entry」语义，key 由组件自定）
 * 2. `resetFormValue()`：把控件值恢复为初始值（通常为 value 属性值），**不派发事件**（与原生一致）
 * 3. 在每个值变化点调用 `syncFormValue()`（input 输入 / 受控 value 写入 / 清空等）
 *
 * 注意：原生校验链（checkValidity/reportValidity）需组件按各自规则调 `setValidity`，本批不做。
 */
export abstract class OASFormElement extends OASElement {
  /** 浏览器在 customElements.define 时读取；沿静态原型链继承到各组件类 */
  static formAssociated = true

  private internals_: ElementInternals | null = null

  private formDisabled = false

  constructor() {
    super()
    try {
      this.internals_ = this.attachInternals()
    } catch {
      // 非 form-associated（子类未走本基类定义路径）或环境不支持时降级
      this.internals_ = null
    }
  }

  /** 原生关联到的所有 label（form-associated 后 `label for` 自动生效） */
  get labels(): NodeList | null {
    return this.internals_?.labels ?? null
  }

  /** 当前所在原生表单（含 `form` 属性关联；未挂表单为 null） */
  get form(): HTMLFormElement | null {
    return this.internals_?.form ?? null
  }

  /** 是否参与表单校验（有 name 且未被禁用时为 true） */
  get willValidate(): boolean {
    return this.internals_?.willValidate ?? false
  }

  /** 当前校验状态（ValidityState 各标志位；不支持环境为 null） */
  get validity(): ValidityState | null {
    return this.internals_?.validity ?? null
  }

  /** 当前校验消息（Chrome 对自定义元素不展示消息，但 API 语义保留） */
  get validationMessage(): string {
    return this.internals_?.validationMessage ?? ''
  }

  /** 静默校验（不触发浏览器违规提示）；不支持环境视为通过 */
  checkValidity(): boolean {
    return this.internals_?.checkValidity() ?? true
  }

  /** 校验并触发浏览器违规提示链路（invalid 事件等）；不支持环境视为通过 */
  reportValidity(): boolean {
    return this.internals_?.reportValidity() ?? true
  }

  /**
   * 组件规则变化点调用：把当前校验状态同步给原生校验链。
   * 例：`required` 且值为空 → `setValidity({ valueMissing: true }, '')`；合法 → `setValidity({})`。
   */
  protected setValidity(flags: ValidityStateFlags, message?: string, anchor?: HTMLElement): void {
    if (message !== undefined) this.internals_?.setValidity(flags, message, anchor)
    else this.internals_?.setValidity(flags)
  }

  /**
   * 值变化点由组件调用：把 getFormValue() 同步进原生表单数据。
   * 无 `name` 时浏览器自动不提交（无需组件判空）。
   */
  protected syncFormValue(): void {
    this.internals_?.setFormValue(this.getFormValue())
  }

  /** 原生 reset 回调：恢复初始值并重同步表单数据；不派发 input/change（与原生一致） */
  formResetCallback(): void {
    this.resetFormValue()
    this.syncFormValue()
  }

  /** 表单链路禁用态（所在 fieldset[disabled] 等场景）；组件自算 disabled 时并入此值 */
  protected get formDisabledState(): boolean {
    return this.formDisabled
  }

  /**
   * 原生 disabled 回调（父级 fieldset[disabled] 也会触发）。
   * ⚠️ 不能回写 `disabled` 属性：属性在场后元素的禁用态不再随 fieldset 变化（自锁，
   * 解除 fieldset 时回调不会再触发）。改为内部标志位 + 经 injectDisabled 通道并入。
   */
  formDisabledCallback(disabled: boolean): void {
    if (this.formDisabled === disabled) return
    this.formDisabled = disabled
    if (this.hasRendered) this.update()
  }

  /** 表单链路禁用并入注入解析（组件显式 disabled > 表单链路 > provider 注入 > 豁免） */
  protected override injectDisabled(): boolean {
    return super.injectDisabled() || this.formDisabled
  }

  /** label 点击转焦点：label 激活行为向控件本体派发合成 click（path 起点 = 宿主本身） */
  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.onClickForwardFocus)
  }

  override disconnectedCallback(): void {
    this.removeEventListener('click', this.onClickForwardFocus)
    super.disconnectedCallback()
  }

  private onClickForwardFocus = (e: MouseEvent): void => {
    const inner = this.innerControl
    if (!inner || e.defaultPrevented) return
    const path = e.composedPath()
    if (path[0] !== this) return // 点击来自 shadow 内部（真实控件或清除钮等），焦点语义已正常
    inner.focus()
  }

  /** 程序化 focus 转到 shadow 内真实控件（labels / SR / 脚本调用保持一致） */
  override focus(options?: FocusOptions): void {
    const inner = this.innerControl
    if (inner) inner.focus(options)
    else super.focus(options)
  }

  /**
   * 外部 label 命名转发：把关联 label 的文本复制为内层控件的 `aria-label`。
   * 原生 `<label for>` 关联的是宿主（FACE 语义），但 axe/读屏检测的是 shadow 内真实控件；
   * 不能用 aria-labelledby 跨 shadow 引用 light DOM 的 label id（跨根 IDREF 不解析，axe 判无名），
   * 故复制文本（在 shadow 树内可解析）。优先级遵循原生：外部 label > 组件内建命名回退；
   * 外部 label 移除后只清理自己设置的（组件下次 update 恢复其回退名）。
   */
  private syncInnerLabelledBy(): void {
    const inner = this.innerControl
    if (!inner) return
    const labels = this.associatedLabels()
    if (labels.length > 0) {
      const text = labels
        .map((l) => (l.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ')
      if (text) {
        inner.setAttribute('aria-label', text)
        inner.setAttribute('data-fa-label', '')
        return
      }
    }
    if (inner.hasAttribute('data-fa-label')) {
      inner.removeAttribute('aria-label')
      inner.removeAttribute('data-fa-label')
    }
  }

  /** 关联 label 解析：优先原生 internals.labels（for 指向 + 祖先包裹）；无 ElementInternals 环境手动解析（行为一致） */
  private associatedLabels(): HTMLLabelElement[] {
    const fromInternals = this.labels
    if (fromInternals && fromInternals.length > 0) {
      return [...fromInternals].filter((n): n is HTMLLabelElement => n instanceof HTMLLabelElement)
    }
    const out: HTMLLabelElement[] = []
    if (this.id) {
      out.push(...document.querySelectorAll<HTMLLabelElement>(`label[for="${CSS.escape(this.id)}"]`))
    }
    const wrapping = this.closest('label')
    if (wrapping) out.push(wrapping)
    return out
  }

  /** 基类触发的更新统一收尾：内层命名转发随属性/关联变化重同步（组件 update 之后执行，避免被组件命名逻辑覆盖） */
  protected override runUpdateAndNotify(): void {
    super.runUpdateAndNotify()
    this.syncInnerLabelledBy()
  }

  /** shadow 内真实表单控件（焦点目标）；复合控件（多输入）子类按需覆盖 */
  protected get innerControl(): HTMLElement | null {
    return this.shadow.querySelector('input, textarea, select, [tabindex]')
  }

  /** 当前应进入 FormData 的原始值；子类实现。多值组件返回 FormData（同名多条 entry 语义） */
  protected abstract getFormValue(): string | FormData | null

  /** 把控件值恢复为初始值（通常为 value 属性值）；不派发事件 */
  protected abstract resetFormValue(): void
}
