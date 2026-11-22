import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-code-button —— 验证码发送按钮（form 族）。
 *
 * 承担「获取验证码」的全流程前端部分：点击派发事件 → 内置倒计时冷却 → 冷却结束可重发。
 * 真正发请求由宿主完成（`oas-send` 可拦截，请求成功后再 `start()` 启动冷却）。
 *
 * 属性（kebab-case）：
 * - `cooldown`：冷却秒数，默认 60；非法/非正数回落默认并告警
 * - `disabled`：禁用
 * - `loading`：请求进行中（spinner + aria-busy + 阻止重复点击）
 *
 * 插槽：
 * - 默认插槽：自定义按钮内容（覆盖内置文案；倒计时期间仍显示内置倒计时文案）
 *
 * 事件（bubbles + composed）：
 * - `oas-send`：可点击时点击派发，`detail: { cooldown }`；`cancelable`——被 `preventDefault()`
 *   时不自动进入冷却（宿主请求成功后再调 `start()`）
 *
 * 方法：
 * - `start(seconds?)`：启动冷却（缺省用 `cooldown`）
 * - `reset()`：立即结束冷却
 *
 * 只读属性：`counting`（是否冷却中）、`remaining`（剩余秒数）。
 *
 * a11y：原生 `<button>`；冷却文案与按钮可读名称同步；发送/可重发送经 sr-only
 * `aria-live="polite"` 区域播报（逐秒倒计时不进 live 区域，避免读屏噪音）。
 */

const DEFAULT_COOLDOWN = 60

const warned = new Set<string>()
function warnOnce(msg: string): void {
  if (!warned.has(msg)) {
    warned.add(msg)
    devWarn(msg)
  }
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none !important;
}
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  box-sizing: border-box;
  min-width: 96px;
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-primary);
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-primary-text);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.btn:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.btn:active:not(:disabled) {
  border-color: var(--oas-color-primary-active);
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.btn:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  border-color: var(--oas-color-border);
}
.label {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-variant-numeric: tabular-nums;
}
/* 倒计时期间隐藏自定义插槽内容，只显示内置倒计时文案（避免自定义文案掩盖剩余时间） */
:host([data-counting]) slot {
  display: none;
}
/* 有插槽内容时空闲态用插槽文案，内置文案以 hidden 退场 */
.fallback[hidden] {
  display: none;
}
.spinner {
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  animation: oas-code-button-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-code-button-spin {
  to {
    transform: rotate(360deg);
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 3s;
  }
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .btn:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

export class OASCodeButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['cooldown', 'disabled', 'loading']
  }

  private btnEl: HTMLButtonElement | null = null
  private spinnerEl: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null
  private fallbackEl: HTMLElement | null = null
  private announcerEl: HTMLElement | null = null

  /** 剩余冷却秒数（0 = 不在冷却） */
  private remainingSeconds = 0
  private timer: ReturnType<typeof setInterval> | null = null
  /** 是否已发送过（决定空闲文案用「获取验证码」还是「重新获取」） */
  private sentOnce = false

  /** @apiProperty 是否处于冷却中（只读） */
  get counting(): boolean {
    return this.remainingSeconds > 0
  }

  /** @apiProperty 剩余冷却秒数（只读） */
  get remaining(): number {
    return this.remainingSeconds
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <button class="btn" part="button" type="button"><span class="spinner" part="spinner" aria-hidden="true" hidden></span><span class="label" part="label"><slot></slot><span class="fallback"></span></span></button>
      <span class="sr-only" part="announcer" aria-live="polite"></span>
    `
  }

  private bind(): void {
    this.btnEl = this.shadow.querySelector<HTMLButtonElement>('[part="button"]')
    this.spinnerEl = this.shadow.querySelector<HTMLElement>('[part="spinner"]')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot')
    this.fallbackEl = this.shadow.querySelector<HTMLElement>('.fallback')
    this.announcerEl = this.shadow.querySelector<HTMLElement>('[part="announcer"]')
    this.btnEl?.addEventListener('click', this.onClick)
    // 插槽内容后置注入（宿主先连元素后填内容）时同步内置文案显隐
    this.slotEl?.addEventListener('slotchange', this.onSlotChange)
    // start() 可能在首连前被调用（宿主预启动冷却）：渲染后补起计时器
    if (this.remainingSeconds > 0) this.startTimer()
    this.ensureCleanup()
  }

  private onSlotChange = (): void => {
    this.refresh()
  }

  /** 是否有实际插槽内容（忽略空白文本节点：模板格式化产生的空白不算自定义文案） */
  private hasSlotted(): boolean {
    const nodes = this.slotEl?.assignedNodes({ flatten: true }) ?? []
    return nodes.some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE ||
        (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
    )
  }

  /** 断开清理（幂等：重连后需重新登记） */
  private ensureCleanup(): void {
    this.onCleanup(() => this.stopTimer())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
    // 断开时计时器已清理，剩余秒数仍有效：重连后恢复倒计时
    if (this.remainingSeconds > 0) this.startTimer()
  }

  protected override update(): void {
    if (!this.btnEl) return
    this.refresh()
  }

  /** 同步按钮态（禁用 / spinner / 文案 / aria） */
  private refresh(): void {
    const btn = this.btnEl
    if (!btn) return
    const disabled = this.injectDisabled()
    const loading = this.hasAttr('loading')
    const counting = this.counting

    btn.disabled = disabled || loading || counting
    if (loading) btn.setAttribute('aria-busy', 'true')
    else btn.removeAttribute('aria-busy')

    if (this.spinnerEl) this.spinnerEl.hidden = !loading

    // 倒计时期间：自定义插槽内容隐藏（:host([data-counting]) slot），内置倒计时文案显示
    if (counting) this.setAttribute('data-counting', '')
    else this.removeAttribute('data-counting')
    if (this.slotEl) this.slotEl.hidden = counting
    if (this.fallbackEl) {
      this.fallbackEl.textContent = this.labelText()
      this.fallbackEl.hidden = !counting && this.hasSlotted()
    }
  }

  /** 当前按钮文案：冷却中显示倒计时，否则按是否发送过区分获取/重新获取 */
  private labelText(): string {
    if (this.counting) return this.t('codeButton.countdown', { seconds: this.remainingSeconds })
    return this.sentOnce ? this.t('codeButton.resend') : this.t('codeButton.send')
  }

  private onClick = (): void => {
    if (this.injectDisabled() || this.hasAttr('loading') || this.counting) return
    const cooldown = this.cooldownSeconds()
    const proceed = this.emit('send', { cooldown }, { cancelable: true })
    if (!proceed) return
    this.sentOnce = true
    this.announce(this.t('codeButton.sent'))
    this.start(cooldown)
  }

  /** 启动冷却（秒）；缺省取 cooldown 属性。命令式启动也算「已发送」——冷却结束后文案为「重新获取」 */
  start(seconds?: number): void {
    const total = seconds ?? this.cooldownSeconds()
    if (!Number.isFinite(total) || total <= 0) return
    this.sentOnce = true
    this.remainingSeconds = Math.round(total)
    this.startTimer()
    this.refresh()
  }

  /** 结束冷却并复位为空闲态（文案回到「获取验证码」） */
  reset(): void {
    this.stopTimer()
    this.remainingSeconds = 0
    this.sentOnce = false
    this.refresh()
  }

  private startTimer(): void {
    this.stopTimer()
    this.timer = setInterval(() => this.tick(), 1000)
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private tick(): void {
    this.remainingSeconds = Math.max(0, this.remainingSeconds - 1)
    if (this.remainingSeconds === 0) {
      this.stopTimer()
      this.announce(this.t('codeButton.resendReady'))
    }
    this.refresh()
  }

  /**
   * 冷却结束的秒数；非法/非正数回落默认值并单次告警。
   * 冷却中先读取新值的场景只影响下一次 `start()`（不打断当前倒计时）。
   */
  private cooldownSeconds(): number {
    const raw = this.getAttr('cooldown', '')
    if (raw === '') return DEFAULT_COOLDOWN
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) {
      warnOnce(`[oas-code-button] 非法 cooldown "${raw}"，已回落 ${DEFAULT_COOLDOWN}；应为正数秒`)
      return DEFAULT_COOLDOWN
    }
    return n
  }

  /** 读屏播报（live 区域；逐秒倒计时不进这里） */
  private announce(text: string): void {
    if (this.announcerEl) this.announcerEl.textContent = text
  }
}
