import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-8, 56px) 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  /* compact/button-group 圆角合并协议：--oas-button-group-radius 优先，独立使用回落自身圆角 */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
input:hover {
  border-color: var(--oas-color-primary);
}
input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:host([aria-invalid='true']) input {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
/* 隐藏浏览器原生步进箭头（webkit spin button），避免与自定义箭头按钮双重显示 */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.controls {
  position: absolute;
  right: 4px;
  top: 4px;
  display: flex;
  flex-direction: column;
  height: calc(100% - 8px);
}
button {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  flex: 1;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary);
  border-radius: 2px;
}
button:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}
svg {
  width: 8px;
  height: 8px;
}
`

export class OASInputNumber extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'min', 'max', 'step', 'disabled', 'precision', 'label', 'disabled-skip']
  }

  private input: HTMLInputElement | null = null
  private upBtn: HTMLButtonElement | null = null
  private downBtn: HTMLButtonElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="wrapper" part="wrapper">
        <input part="input" type="number" />
        <span class="controls" part="controls">
          <button part="up"><svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1 5.5 L4 2.5 L7 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button part="down"><svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1 2.5 L4 5.5 L7 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </span>
      </span>
    `
  }

  /** 缓存节点引用 + 绑定输入/步进按钮事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.upBtn = this.shadow.querySelector('button[part="up"]')
    this.downBtn = this.shadow.querySelector('button[part="down"]')

    this.input?.addEventListener('change', () => this.emitChange())
    this.upBtn?.addEventListener('click', () => this.stepBy(1))
    this.downBtn?.addEventListener('click', () => this.stepBy(-1))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（主输入与步进按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input')) return false
    if (!this.shadow.querySelector('button[part="up"]')) return false
    if (!this.shadow.querySelector('button[part="down"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const i = this.input
    if (!i) return
    const value = this.getAttr('value', '')
    const min = this.getAttr('min', '')
    const max = this.getAttr('max', '')
    const step = this.getAttr('step', '1')
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()

    if (i.value !== value) i.value = value
    i.min = min
    i.max = max
    i.step = step
    i.disabled = disabled
    // 内置文案走 locale registry（label 属性优先，setLocale 切换自动刷新）
    i.setAttribute('aria-label', this.getAttr('label', this.t('inputNumber.defaultLabel')))
    this.upBtn?.setAttribute('aria-label', this.t('inputNumber.increase'))
    this.downBtn?.setAttribute('aria-label', this.t('inputNumber.decrease'))
    this.syncControls()
  }

  private stepBy(dir: 1 | -1): void {
    const i = this.input
    if (!i || this.injectDisabled()) return
    const step = Number(i.step) || 1
    const current = Number(i.value) || 0
    const next = current + step * dir
    i.value = String(this.clamp(next))
    this.syncControls()
    this.emitChange()
  }

  private clamp(n: number): number {
    const min = this.getAttr('min', '')
    const max = this.getAttr('max', '')
    let v = n
    if (max !== '') v = Math.min(v, Number(max))
    if (min !== '') v = Math.max(v, Number(min))
    const precision = this.getAttr('precision', '')
    if (precision !== '') v = Number(v.toFixed(Number(precision)))
    return v
  }

  private emitChange(): void {
    const v = Number(this.input?.value) || 0
    // 受控状态写回宿主 value 属性（与 switch/slider 一致的双向受控语义）：
    // 宿主 getAttribute / 表单序列化可直接取最新值；写回触发的 update 为幂等同步，无循环
    this.setAttribute('value', String(v))
    this.emit('change', { value: v })
  }

  private syncControls(): void {
    if (!this.upBtn || !this.downBtn || !this.input) return
    const disabled = this.injectDisabled()
    const value = Number(this.input.value) || 0
    const max = this.getAttr('max', '')
    const min = this.getAttr('min', '')
    this.upBtn.disabled = disabled || (max !== '' && value >= Number(max))
    this.downBtn.disabled = disabled || (min !== '' && value <= Number(min))
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }
}
