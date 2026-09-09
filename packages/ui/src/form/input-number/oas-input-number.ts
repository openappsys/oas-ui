import { OASElement } from '@oas-ui/core'

/**
 * OASInputNumber 数字输入框。
 *
 * 核心契约：
 * - 内层为 input[type=text] + inputmode=decimal（格式化显示的前提），手动补 spinbutton aria
 * - 值模型：`value` attribute 为数字串；空串/缺省 = 空值（null 语义，未填 ≠ 0）
 * - 提交制：键入过程不派发、不写回；失焦 / Enter / 步进 / 滚轮 / 清空 时提交
 *   （setAttribute('value', …) 写回宿主 + 派发 oas-change，detail.value 为 number | null）
 * - 键入越界不打断输入（临时 data-out-of-range 红显），失焦矫正（钳制 + 吸附）
 * - 格式化双层：声明式 format/grouping/precision（Intl 语义）+ formatter/parser 函数 property
 */

/** 长按连击：按住 800ms 后每 100ms 步进一次（内置常量，不开放属性） */
const HOLD_DELAY_MS = 800
const REPEAT_INTERVAL_MS = 100

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* 尺寸档位（sm/md/lg）内部变量：控件高度 + 字号联动，仅引用 token */
  --oas-input-number-height: var(--oas-control-height-md);
  --oas-input-number-font: var(--oas-font-size-md);
}
:host([size='sm']) {
  --oas-input-number-height: var(--oas-control-height-sm);
  --oas-input-number-font: var(--oas-font-size-sm);
}
:host([size='lg']) {
  --oas-input-number-height: var(--oas-control-height-lg);
  --oas-input-number-font: var(--oas-font-size-lg);
}
.wrapper {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  width: 100%;
}
/* inner 只承载 input（block 流，宽度 == input 边框盒）：suffix/clear/controls 全部
   absolute 锚定 inner 右缘（即 input 右缘）右侧叠加，占位由 input 的
   padding-inline-end 按「叠加元素集合」让位——与 oas-input 内嵌前后缀同构。
   曾现 bug：inner 为 inline-flex 且 suffix/clear 在流内，input width:100% 被挤压后
   inner 比 input 宽（suffix/clear 顶出 input 右缘），absolute controls 锚 inner 右缘
   随之外溢 16px；suffix/clear 本身也渲染在 input 边框外 */
.inner {
  position: relative;
  flex: 1;
  min-width: 0;
  display: block;
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: var(--oas-input-number-height);
  padding-inline-start: var(--oas-space-3);
  /* 右侧叠加区让位：步进钮区（right 形态，20 宽 + 4 间隙 = 24，历史变量可覆盖） */
  padding-inline-end: var(--oas-input-number-controls-pad, 28px);
  border: 1px solid var(--oas-color-border);
  /* compact/button-group 圆角合并协议：--oas-button-group-radius 优先，独立使用回落自身圆角 */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-input-number-font);
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
input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
input:disabled:hover {
  border-color: var(--oas-color-border);
}
input[readonly] {
  cursor: default;
}

/* ---- 校验态（status 属性）与表单校验钩子（aria-invalid） ---- */
:host([aria-invalid='true']) input,
:host([status='error']) input {
  border-color: var(--oas-color-danger);
}
:host([status='warning']) input {
  border-color: var(--oas-color-warning);
}
:host([status='success']) input {
  border-color: var(--oas-color-success);
}
:host([status='error']) input:focus,
:host([aria-invalid='true']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([status='warning']) input:focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([status='success']) input:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
/* 键入越界临时红显（失焦矫正后由组件移除；排在 status 之后，越界优先） */
:host([data-out-of-range]) input,
:host([data-out-of-range]) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}

/* ---- 内嵌前后缀（prefix / suffix 文案 + 同名插槽） ---- */
.affix {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  flex: none;
  max-width: 50%;
  overflow: hidden;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-input-number-font);
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
}
/* prefix 内嵌叠加（left 锚 input 左缘内）：与 suffix 同构；input 左侧按让位协议预留 */
[part='prefix'] {
  inset-inline-start: var(--oas-space-3);
}
:host([prefix-text]) input,
:host([data-slot-prefix]) input {
  padding-inline-start: var(--oas-space-8, 40px);
}
:host([disabled]) .affix,
:host([data-disabled]) .affix {
  color: var(--oas-color-text-disabled);
}
.affix[hidden] {
  display: none;
}
/* 后缀叠加锚点（right 形态）：清除钮恒占位（clearable 即预留，值清空不跳动），
   后缀贴清除钮左侧；无清除钮时后缀贴步进钮左侧 */
[part='suffix'] {
  inset-inline-end: calc(4px + 20px + var(--oas-space-1) + 16px + var(--oas-space-1));
}
:host(:not([clearable])) [part='suffix'] {
  inset-inline-end: calc(4px + 20px + var(--oas-space-1));
}
/* input 右侧按叠加元素集合让位（与 oas-input 的 [clearable]/[suffix-text] 让位协议同构） */
:host([clearable]) input {
  padding-inline-end: calc(var(--oas-input-number-controls-pad, 28px) + 16px + var(--oas-space-1));
}
:host([suffix-text]) input,
:host([data-slot-suffix]) input {
  padding-inline-end: calc(var(--oas-input-number-controls-pad, 28px) + 24px + var(--oas-space-1));
}
:host([clearable][suffix-text]) input,
:host([clearable][data-slot-suffix]) input {
  padding-inline-end: calc(
    var(--oas-input-number-controls-pad, 28px) + 16px + var(--oas-space-1) + 24px + var(--oas-space-1)
  );
}

/* ---- 清除按钮（clearable，空值语义入口）：右侧叠加区，锚 input 右缘、步进钮左侧 ---- */
.clear-btn {
  appearance: none;
  border: none;
  background: transparent;
  flex: none;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  border-radius: 50%;
  z-index: 1;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  inset-inline-end: calc(4px + 20px + var(--oas-space-1));
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}

/* ---- 步进按钮（默认 right 形态：右侧上下箭头覆盖层） ---- */
.controls {
  position: absolute;
  inset-inline-end: 4px;
  inset-block: 4px;
  display: flex;
  flex-direction: column;
  z-index: 1;
}
.controls button {
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
  user-select: none;
}
.controls button:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.controls button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.controls button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}
.controls svg {
  width: 8px;
  height: 8px;
}
/* both 形态下图标放大一号（+/- 语义比箭头更需要可读性） */
.controls .icon-sign {
  display: none;
}

/* ---- both 形态：两侧 - / + 按钮（flex 流式布局，display:contents 解包 controls 容器） ---- */
:host([controls-position='both']) .inner {
  order: 0;
}
:host([controls-position='both']) .controls {
  position: static;
  inset: auto;
  display: contents;
}
:host([controls-position='both']) .controls button {
  position: relative;
  flex: none;
  width: 32px;
  height: var(--oas-input-number-height);
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  border-radius: 0;
}
:host([controls-position='both']) [part='down'] {
  order: -1;
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md)) 0 0
    var(--oas-button-group-radius, var(--oas-radius-md));
}
:host([controls-position='both']) [part='down']:hover {
  border-color: var(--oas-color-primary);
}
/* both 形态 [-] 钮贴在 input 左缘外（32px），内嵌 prefix 右移一个钮位 + 让位同步 */
:host([controls-position='both']) [part='prefix'] {
  inset-inline-start: calc(32px + var(--oas-space-2));
}
:host([controls-position='both'][prefix-text]) input,
:host([controls-position='both'][data-slot-prefix]) input {
  padding-inline-start: calc(32px + var(--oas-space-2) + var(--oas-space-8, 40px));
}
:host([controls-position='both']) [part='up'] {
  order: 1;
  border-radius: 0 var(--oas-button-group-radius, var(--oas-radius-md))
    var(--oas-button-group-radius, var(--oas-radius-md)) 0;
}
:host([controls-position='both']) [part='up']:hover {
  border-color: var(--oas-color-primary);
}
:host([controls-position='both']) input {
  padding-inline-end: var(--oas-space-3);
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
/* both 形态 [+] 钮贴在 input 右缘外（32px），右侧叠加锚点与让位同步右移一个钮位 */
:host([controls-position='both']:not([controls='false'])) .clear-btn {
  inset-inline-end: calc(32px + var(--oas-space-1));
}
:host([controls-position='both']) [part='suffix'] {
  inset-inline-end: calc(32px + var(--oas-space-1) + 16px + var(--oas-space-1));
}
:host([controls-position='both']:not([clearable])) [part='suffix'] {
  inset-inline-end: calc(32px + var(--oas-space-1));
}
:host([controls-position='both'][clearable]) input {
  padding-inline-end: calc(var(--oas-space-3) + 16px + var(--oas-space-1));
}
:host([controls-position='both'][clearable][suffix-text]) input,
:host([controls-position='both'][clearable][data-slot-suffix]) input {
  padding-inline-end: calc(var(--oas-space-3) + 16px + var(--oas-space-1) + 24px + var(--oas-space-1));
}
:host([controls-position='both']) .controls .icon-chevron {
  display: none;
}
:host([controls-position='both']) .controls .icon-sign {
  display: block;
  width: 10px;
  height: 10px;
}

/* ---- controls="false" 显隐：置于 both 形态规则之后（同特异性时后定义者胜，隐藏恒生效） ---- */
:host([controls='false']) .controls {
  display: none;
}
:host([controls='false']) input,
:host([controls='false'][controls-position='both']) input {
  padding-inline-end: var(--oas-space-3);
  border-start-end-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  border-end-end-radius: var(--oas-button-group-radius, var(--oas-radius-md));
}
/* controls=false 时无步进钮区，叠加锚点与让位回落常规内边距基准 */
:host([controls='false']) .clear-btn {
  inset-inline-end: var(--oas-space-3);
}
:host([controls='false']:not([clearable])) [part='suffix'] {
  inset-inline-end: var(--oas-space-3);
}
:host([controls='false'][clearable]) [part='suffix'] {
  inset-inline-end: calc(var(--oas-space-3) + 16px + var(--oas-space-1));
}
:host([controls='false'][clearable]) input,
:host([controls='false'][controls-position='both'][clearable]) input {
  padding-inline-end: calc(var(--oas-space-3) + 16px + var(--oas-space-1));
}
:host([controls='false'][clearable][suffix-text]) input,
:host([controls='false'][controls-position='both'][clearable][suffix-text]) input,
:host([controls='false'][clearable][data-slot-suffix]) input,
:host([controls='false'][controls-position='both'][clearable][data-slot-suffix]) input {
  padding-inline-end: calc(var(--oas-space-3) + 16px + var(--oas-space-1) + 24px + var(--oas-space-1));
}
:host([controls='false']:not([clearable])[suffix-text]) input,
:host([controls='false']:not([clearable])[data-slot-suffix]) input,
:host([controls='false'][controls-position='both']:not([clearable])[suffix-text]) input,
:host([controls='false'][controls-position='both']:not([clearable])[data-slot-suffix]) input {
  padding-inline-end: calc(var(--oas-space-3) + 24px + var(--oas-space-1));
}
`

export class OASInputNumber extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'min',
      'max',
      'step',
      'disabled',
      'precision',
      'label',
      'controls',
      'controls-position',
      'prefix-text',
      'suffix-text',
      'format',
      'grouping',
      'size',
      'readonly',
      'status',
      'placeholder',
      'wheel',
      'step-strictly',
      'clearable',
    ]
  }

  /** 函数式格式化通道：优先于声明式 format/grouping/precision（attribute 传不了函数的等价能力） */
  get formatter(): ((value: number) => string) | null {
    return this._formatter
  }
  set formatter(fn: ((value: number) => string) | null) {
    this._formatter = typeof fn === 'function' ? fn : null
    this.writeDisplay()
  }

  /** 函数式解析通道：把显示文本还原为数值（与 formatter 成对；返回非有限数按非法处理） */
  get parser(): ((text: string) => number) | null {
    return this._parser
  }
  set parser(fn: ((text: string) => number) | null) {
    this._parser = typeof fn === 'function' ? fn : null
  }

  private _formatter: ((value: number) => string) | null = null
  private _parser: ((text: string) => number) | null = null

  private input: HTMLInputElement | null = null
  private upBtn: HTMLButtonElement | null = null
  private downBtn: HTMLButtonElement | null = null
  private clearBtn: HTMLButtonElement | null = null

  /**
   * 键入脏标记：input 事件置位，提交后复位；Esc / 非法还原（writeDisplay）时复位。
   * 派发条件 = 脏标记 || 值实际变化——既覆盖「清空后再失焦重报 null」，又保证
   * change+blur 双序列与 Esc 取消路径不重复/不误发。
   */
  private dirty = false

  /** 长按连击计时器（启动即占用，松手/离焦/断连统一清理） */
  private holdTimer: number | null = null
  private repeatTimer: number | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="wrapper" part="wrapper">
        <span class="affix" part="prefix" hidden><slot name="prefix"><span data-fallback></span></slot></span>
        <span class="inner" part="inner">
          <input part="input" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" role="spinbutton" />
          <span class="affix" part="suffix" hidden><slot name="suffix"><span data-fallback></span></slot></span>
          <button class="clear-btn" part="clear" type="button" hidden aria-label="">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </span>
        <span class="controls" part="controls">
          <button part="up" type="button">
            <svg class="icon-chevron" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 5.5 L4 2.5 L7 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg class="icon-sign" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 4 H7 M4 1 V7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <button part="down" type="button">
            <svg class="icon-chevron" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 2.5 L4 5.5 L7 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg class="icon-sign" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 4 H7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </span>
      </span>
    `
  }

  /** 缓存节点引用 + 绑定输入/步进/清除/滚轮事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.upBtn = this.shadow.querySelector('button[part="up"]')
    this.downBtn = this.shadow.querySelector('button[part="down"]')
    this.clearBtn = this.shadow.querySelector('button[part="clear"]')

    // 键入过程：容忍中间态，不提交；仅同步 aria / 越界红显 / 按钮态 / 清除按钮显隐
    this.input?.addEventListener('input', () => this.onTyping())
    // 提交制：失焦（change 先于 blur 触发，二者共用幂等提交）与 Enter
    this.input?.addEventListener('change', () => this.commitFromInput())
    this.input?.addEventListener('blur', () => this.commitFromInput())
    this.input?.addEventListener('keydown', (e) => this.onKeydown(e))
    // 滚轮步进（wheel 属性显式开启 + 聚焦时；preventDefault 需非 passive）
    this.input?.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })

    // 步进按钮：click 覆盖键盘激活与快速点击；pointerdown 启动长按连击
    this.upBtn?.addEventListener('click', () => this.stepBy(1))
    this.downBtn?.addEventListener('click', () => this.stepBy(-1))
    this.upBtn?.addEventListener('pointerdown', () => this.startHold(1))
    this.downBtn?.addEventListener('pointerdown', () => this.startHold(-1))
    const stop = (): void => this.stopHold()
    this.upBtn?.addEventListener('pointerup', stop)
    this.upBtn?.addEventListener('pointerleave', stop)
    this.upBtn?.addEventListener('pointercancel', stop)
    this.downBtn?.addEventListener('pointerup', stop)
    this.downBtn?.addEventListener('pointerleave', stop)
    this.downBtn?.addEventListener('pointercancel', stop)

    // 清除按钮：一键回到空值态（未填 ≠ 0）
    this.clearBtn?.addEventListener('click', () => {
      if (!this.input || this.injectDisabled() || this.hasAttr('readonly')) return
      this.emit('clear', {})
      this.commit(null)
      this.input.focus()
    })

    // 内嵌前后缀 slot：light DOM 分发内容增减时同步显隐
    const slotPrefix = this.shadow.querySelector<HTMLSlotElement>('slot[name="prefix"]')
    const slotSuffix = this.shadow.querySelector<HTMLSlotElement>('slot[name="suffix"]')
    slotPrefix?.addEventListener('slotchange', () => this.syncAffixes())
    slotSuffix?.addEventListener('slotchange', () => this.syncAffixes())
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

  /** 断连时清理长按连击计时器（孤儿计时器会在组件移除后继续步进） */
  override disconnectedCallback(): void {
    this.stopHold()
    super.disconnectedCallback()
  }

  protected override update(): void {
    const i = this.input
    if (!i) return
    this.normalizeLegacyAlias('prefix-text', 'prefix')
    this.normalizeLegacyAlias('suffix-text', 'suffix')
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    const min = this.getAttr('min', '')
    const max = this.getAttr('max', '')

    // 镜像最终禁用态到宿主 data-disabled（供 :host([data-disabled]) 样式消费，覆盖注入场景）
    this.toggleAttribute('data-disabled', disabled)

    i.disabled = disabled
    i.readOnly = readonly
    i.placeholder = this.getAttr('placeholder', '')
    if (readonly) i.setAttribute('aria-readonly', 'true')
    else i.removeAttribute('aria-readonly')
    if (min !== '') i.setAttribute('aria-valuemin', min)
    else i.removeAttribute('aria-valuemin')
    if (max !== '') i.setAttribute('aria-valuemax', max)
    else i.removeAttribute('aria-valuemax')
    // 内置文案走 locale registry（label 属性 > placeholder > 内置文案，setLocale 切换自动刷新）
    i.setAttribute(
      'aria-label',
      this.getAttr('label', '') || this.getAttr('placeholder', '') || this.t('inputNumber.defaultLabel'),
    )
    this.upBtn?.setAttribute('aria-label', this.t('inputNumber.increase'))
    this.downBtn?.setAttribute('aria-label', this.t('inputNumber.decrease'))
    // 清除按钮可访问名称复用 input.clear（语义一致的既有 key）
    this.clearBtn?.setAttribute('aria-label', this.t('input.clear'))

    this.syncAffixes()
    // 聚焦中的键入文本不被受控回显打断；失焦时按受控值回显
    if (this.shadow.activeElement !== i) {
      const text = this.formatDisplay(this.committedValue())
      if (i.value !== text) i.value = text
    }
    this.syncAriaValue()
    this.syncControls()
    this.syncClear()
  }

  // ---------- 值模型 ----------

  /** 已提交值（受控源：value attribute；'' | 'null' | 'NaN' 或非法 → null 空值态） */
  private committedValue(): number | null {
    const raw = this.getAttr('value', '').trim()
    if (raw === '' || raw === 'null' || raw === 'NaN') return null
    const v = Number(raw)
    return Number.isFinite(v) ? v : null
  }

  /**
   * 解析显示文本为数值（三态）：
   * null = 空值；NaN = 非法（键入容忍、失焦还原）；number = 有效
   */
  private parseText(text: string): number | null {
    const raw = text.trim()
    if (raw === '') return null
    if (this._parser) {
      try {
        const v = this._parser(raw)
        return typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN
      } catch {
        return Number.NaN
      }
    }
    // 声明式格式化配套解析：剥离分组符/货币符号等装饰字符后取数字
    const cleaned = raw.replace(/[^0-9eE+.\-]/g, '')
    if (cleaned === '') return Number.NaN
    let v = Number(cleaned)
    if (this.getAttr('format', '') === 'percent') v = v / 100
    return Number.isFinite(v) ? v : Number.NaN
  }

  /** 显示格式化：null → ''；函数式 formatter 优先；否则按 Intl 语义的声明式选项 */
  private formatDisplay(v: number | null): string {
    if (v === null) return ''
    if (this._formatter) {
      try {
        const s = this._formatter(v)
        return typeof s === 'string' ? s : String(v)
      } catch {
        return String(v)
      }
    }
    const opts = this.intlOptions()
    if (opts) {
      try {
        return new Intl.NumberFormat(undefined, opts).format(v)
      } catch {
        return String(v)
      }
    }
    return String(v)
  }

  /** 声明式格式化选项（format/grouping/precision → Intl.NumberFormatOptions）；无任何声明时返回 null */
  private intlOptions(): Intl.NumberFormatOptions | null {
    const fmt = this.getAttr('format', '')
    const precision = this.getAttr('precision', '')
    const opts: Intl.NumberFormatOptions = {}
    if (fmt === 'percent') {
      opts.style = 'percent'
    } else if (fmt.startsWith('currency:')) {
      opts.style = 'currency'
      opts.currency = fmt.slice('currency:'.length).trim()
    } else if (fmt.startsWith('unit:')) {
      opts.style = 'unit'
      opts.unit = fmt.slice('unit:'.length).trim()
    }
    if (this.hasAttr('grouping')) opts.useGrouping = true
    if (precision !== '') {
      const d = Math.max(0, Math.min(100, Math.floor(Number(precision) || 0)))
      opts.minimumFractionDigits = d
      opts.maximumFractionDigits = d
    }
    const hasAny = fmt !== '' || this.hasAttr('grouping') || precision !== ''
    return hasAny ? opts : null
  }

  /** 提交前归一：step-strictly 吸附最近倍数 → min/max 钳制 → precision 定位 */
  private normalizeCommit(v: number): number {
    let out = v
    const step = Number(this.getAttr('step', '1')) || 1
    if (this.hasAttr('step-strictly')) out = Math.round(out / step) * step
    out = this.clamp(out)
    return out
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

  /** 提交：写回宿主 value 属性（数字串或空串）+ 回显 + 派发 oas-change（脏或值变化时） */
  private commit(v: number | null): void {
    const s = v === null ? '' : String(v)
    const prev = this.getAttribute('value') ?? ''
    const changed = prev !== s
    // 先判定再回显（writeDisplay 会复位脏标记）
    const shouldEmit = this.dirty || changed
    if (changed) this.setAttribute('value', s)
    this.writeDisplay()
    if (shouldEmit) this.emit('change', { value: v })
  }

  /** 强制回显受控值（无视聚焦保护）：提交 / Esc 还原 / 非法还原 / 外部 formatter 变化时使用 */
  private writeDisplay(): void {
    const i = this.input
    if (!i) return
    const text = this.formatDisplay(this.committedValue())
    if (i.value !== text) i.value = text
    this.removeAttribute('data-out-of-range')
    this.dirty = false
    this.syncAriaValue()
    this.syncControls()
    this.syncClear()
  }

  // ---------- 交互 ----------

  /** 键入过程：同步 aria / 越界红显 / 边界按钮态；不提交（置脏标记） */
  private onTyping(): void {
    const i = this.input
    if (!i) return
    this.dirty = true
    const parsed = this.parseText(i.value)
    if (parsed !== null && !Number.isNaN(parsed)) {
      this.syncAriaValue(parsed)
      this.toggleAttribute('data-out-of-range', this.isOutOfRange(parsed))
      this.syncControls(parsed)
    } else {
      // 中间态（"-"、"1."）与非法文本不做红显，失焦统一处理
      this.removeAttribute('data-out-of-range')
      this.syncControls()
    }
    this.syncClear()
  }

  /** 失焦 / Enter 提交：空 → null；非法 → 还原；有效 → 归一（吸附 + 钳制 + 定位） */
  private commitFromInput(): void {
    const i = this.input
    if (!i) return
    if (this.injectDisabled() || this.hasAttr('readonly')) {
      this.writeDisplay()
      return
    }
    const parsed = this.parseText(i.value)
    if (parsed === null) {
      this.commit(null)
    } else if (Number.isNaN(parsed)) {
      this.writeDisplay()
    } else {
      this.commit(this.normalizeCommit(parsed))
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.stepBy(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.stepBy(-1)
    } else if (e.key === 'Enter') {
      this.commitFromInput()
    } else if (e.key === 'Escape') {
      // 取消路径：还原本次键入（不派发事件）
      e.preventDefault()
      this.writeDisplay()
    }
  }

  private onWheel(e: WheelEvent): void {
    if (!this.hasAttr('wheel')) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    if (this.input && this.shadow.activeElement !== this.input) return
    if (e.deltaY === 0) return
    e.preventDefault()
    this.stepBy(e.deltaY < 0 ? 1 : -1)
  }

  /** 步进：base 取当前键入值，空值/非法回落已提交值 → 空值再回落 min（有 min 时）或 0 */
  private stepBy(dir: 1 | -1): void {
    const i = this.input
    if (!i || this.injectDisabled() || this.hasAttr('readonly')) return
    const step = Number(this.getAttr('step', '1')) || 1
    const min = this.getAttr('min', '')

    let base: number
    const parsed = this.parseText(i.value)
    if (parsed !== null && !Number.isNaN(parsed)) {
      base = parsed
    } else {
      const committed = this.committedValue()
      base = committed ?? (min !== '' ? Number(min) : 0)
    }
    this.commit(this.normalizeCommit(base + step * dir))
  }

  /** 长按连击：pointerdown 启动（仅计时）；快速点击的步进由 release 后的 click 承担 */
  private startHold(dir: 1 | -1): void {
    this.stopHold()
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.holdTimer = window.setTimeout(() => {
      this.repeatTimer = window.setInterval(() => this.stepBy(dir), REPEAT_INTERVAL_MS)
    }, HOLD_DELAY_MS)
  }

  private stopHold(): void {
    if (this.holdTimer !== null) {
      window.clearTimeout(this.holdTimer)
      this.holdTimer = null
    }
    if (this.repeatTimer !== null) {
      window.clearInterval(this.repeatTimer)
      this.repeatTimer = null
    }
  }

  // ---------- 状态同步 ----------

  private isOutOfRange(v: number): boolean {
    const min = this.getAttr('min', '')
    const max = this.getAttr('max', '')
    if (max !== '' && v > Number(max)) return true
    if (min !== '' && v < Number(min)) return true
    return false
  }

  /** spinbutton aria 值：aria-valuenow（数值态）+ aria-valuetext（格式化显示 ≠ 数字串时） */
  private syncAriaValue(v?: number | null): void {
    const i = this.input
    if (!i) return
    const val = v !== undefined ? v : this.committedValue()
    if (typeof val === 'number') {
      i.setAttribute('aria-valuenow', String(val))
      const display = this.formatDisplay(val)
      if (display !== String(val)) i.setAttribute('aria-valuetext', display)
      else i.removeAttribute('aria-valuetext')
    } else {
      i.removeAttribute('aria-valuenow')
      i.removeAttribute('aria-valuetext')
    }
  }

  /** 边界按钮态：空值按 min（有 min 时）或 0 参与判定；readonly 全禁 */
  private syncControls(parsed?: number): void {
    if (!this.upBtn || !this.downBtn) return
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    const min = this.getAttr('min', '')
    const max = this.getAttr('max', '')
    const v =
      parsed !== undefined && parsed !== null && !Number.isNaN(parsed)
        ? parsed
        : (this.committedValue() ?? (min !== '' ? Number(min) : 0))
    this.upBtn.disabled = disabled || readonly || (max !== '' && v >= Number(max))
    this.downBtn.disabled = disabled || readonly || (min !== '' && v <= Number(min))
  }

  private syncClear(): void {
    if (!this.clearBtn || !this.input) return
    this.clearBtn.hidden = !this.shouldShowClear()
  }

  private shouldShowClear(): boolean {
    return (
      this.hasAttr('clearable') &&
      !this.injectDisabled() &&
      !this.hasAttr('readonly') &&
      this.input !== null &&
      this.parseText(this.input.value) !== null
    )
  }

  /** 内嵌前后缀：prefix/suffix 文案（attribute 写 slot fallback）+ slot 分发内容驱动显隐。
   *  slot 分发时给 host 打 data-slot-prefix/suffix（驱动 input 两侧让位选择器，与 oas-input 同构） */
  private syncAffixes(): void {
    const renderAffix = (part: string, text: string): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) return
      const slotEl = el.querySelector<HTMLSlotElement>('slot')
      const fallback = el.querySelector<HTMLElement>('[data-fallback]')
      if (fallback) fallback.textContent = text
      // 注意不能用 flatten:true——空 slot 的扁平化结果会包含 fallback 子节点，导致恒判有内容
      const slotHasContent =
        slotEl !== null &&
        slotEl.assignedNodes().some((n) => n.nodeType === 1 || (n.textContent ?? '').trim() !== '')
      el.hidden = text === '' && !slotHasContent
      if (part === 'suffix' || part === 'prefix') {
        const mark = `data-slot-${part}`
        if (slotHasContent) this.setAttribute(mark, '')
        else this.removeAttribute(mark)
      }
    }
    renderAffix('prefix', this.getAttr('prefix-text', ''))
    renderAffix('suffix', this.getAttr('suffix-text', ''))
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }
}
