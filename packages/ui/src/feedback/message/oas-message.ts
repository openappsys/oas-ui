import { OASElement } from '@oas-ui/core'
import { registerIcon, lookupIcon } from '../../basic/icon/oas-icon.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  pointer-events: auto;
  max-width: 360px;
  margin-bottom: var(--oas-space-2);
  /* 进出场动画时长开口（用户可覆盖） */
  --oas-message-anim-in: 220ms;
  --oas-message-anim-out: 180ms;
}
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
}
.mask[hidden] {
  display: none;
}
.box {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-msg-type-color, var(--oas-color-border));
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-size: var(--oas-font-size-md);
  color: var(--oas-msg-type-color, var(--oas-color-text-primary));
  cursor: pointer;
  animation: oas-msg-in var(--oas-message-anim-in) var(--oas-ease-out) both;
}
/* type 属性设在 host 上，颜色选择器从 host 属性命中；自定义注册类型走 --oas-msg-type-color */
:host([type='success']) .box {
  border-color: var(--oas-color-success);
  color: var(--oas-color-success);
}
:host([type='error']) .box {
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
:host([type='warning']) .box {
  border-color: var(--oas-color-warning);
  color: var(--oas-color-warning);
}
:host([type='question']) .box {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
:host([type='loading']) .box {
  cursor: default;
}
.avatar {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.avatar[hidden] {
  display: none;
}
.icon {
  flex-shrink: 0;
  display: inline-flex;
  line-height: 1.4;
  font-size: var(--oas-font-size-lg);
}
.icon svg {
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
}
.spinner {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 2px solid var(--oas-color-border-strong);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-msg-spin 0.8s linear infinite;
}
.spinner.spinner-custom {
  border: none;
  width: auto;
  height: auto;
  margin-top: 0;
}
.spinner.spinner-custom svg {
  display: block;
  width: 1em;
  height: 1em;
  animation: oas-msg-spin 0.8s linear infinite;
}
@keyframes oas-msg-spin {
  to { transform: rotate(360deg); }
}
.text {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  line-height: 1.6;
  word-break: break-word;
}
.text-suffix {
  flex-shrink: 0;
  margin-inline-start: var(--oas-space-1);
  font-weight: 600;
}
.close {
  flex-shrink: 0;
  cursor: pointer;
  opacity: 0.6;
  border: none;
  background: none;
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: inherit;
  font-family: inherit;
  border-radius: var(--oas-radius-xs);
}
.close:hover {
  opacity: 1;
}
.close:focus-visible {
  outline: 2px solid var(--oas-focus-ring);
  outline-offset: 1px;
}
.badge {
  position: absolute;
  top: -6px;
  inset-inline-end: -6px;
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-color-danger);
  color: var(--oas-color-bg);
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  text-align: center;
  font-weight: 600;
}
.badge[hidden] {
  display: none;
}
.progress {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 2px;
  border-radius: 0 0 var(--oas-radius-md) var(--oas-radius-md);
  overflow: hidden;
}
.progress[hidden] {
  display: none;
}
.progress-fill {
  height: 100%;
  background: var(--oas-color-primary);
  animation-name: oas-msg-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes oas-msg-progress {
  from { width: 100%; }
  to { width: 0; }
}
:host([paused]) .progress-fill {
  animation-play-state: paused;
}
/* 进出场：transform/opacity；bottom 朝向反向滑入 */
@keyframes oas-msg-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes oas-msg-in-bottom {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes oas-msg-out {
  to { opacity: 0; transform: translateY(-8px) scale(0.98); }
}
@keyframes oas-msg-out-bottom {
  to { opacity: 0; transform: translateY(8px) scale(0.98); }
}
:host([placement='bottom']) .box {
  animation-name: oas-msg-in-bottom;
}
.leaving .box {
  animation: oas-msg-out var(--oas-message-anim-out) var(--oas-ease-in) both;
}
:host([placement='bottom']) .leaving .box {
  animation-name: oas-msg-out-bottom;
}
@media (prefers-reduced-motion: reduce) {
  .box,
  .leaving .box,
  .spinner,
  .spinner.spinner-custom svg {
    animation: none;
  }
}
`

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'loading' | 'question'

/** 关闭来源：auto=计时到期；close=关闭按钮；destroy=命令式 destroy/handle.close/挤出；
 *  click=点击消息体；mask=点击遮罩 */
export type MessageCloseSource = 'auto' | 'close' | 'destroy' | 'click' | 'mask'

export type MessageContent = string | Node

export interface CustomMessageType {
  /** 图标名（lookupIcon 查表通道：registerIcon 自定义优先、内置 iconRegistry 兜底） */
  icon?: string
  /** 类型配色（任意 CSS 颜色，组件默认只走 CSS 变量 token，此值为用户显式注入） */
  color?: string
  /** 是否可手动关闭，默认 true */
  closable?: boolean
}

/** 内置类型 → 图标名（lookupIcon 键） */
const BUILTIN_ICONS: Partial<Record<string, string>> = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  error: 'error',
  question: 'question',
}

/** 自定义类型注册表（registerType 通道），元素声明式/命令式共用 */
const customTypes = new Map<string, CustomMessageType>()

/** 注册自定义消息类型：注册后 message.show(type, ...) 与 <oas-message type="..."> 均生效 */
export function registerMessageType(name: string, config: CustomMessageType): void {
  customTypes.set(name, config)
}

export function getCustomMessageType(name: string): CustomMessageType | undefined {
  return customTypes.get(name)
}

/** question 问号图标：@oas-ui/icons 无对应键，注册进共享查表通道（用户 registerIcon 同名覆盖优先） */
if (!lookupIcon('question')) {
  registerIcon(
    'question',
    '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M9.4 6.2 C9.4 4.7 6.6 4.7 6.6 6.2 C6.6 7.3 7.6 7.7 8 8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M8 10.9 H8.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  )
}

/** 出场动画兜底超时（animationend 未按时到达时的强制移除） */
export const MESSAGE_EXIT_FALLBACK = 250

export class OASMessage extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'type',
      'group',
      'duration',
      'count',
      'icon',
      'closable',
      'show-icon',
      'pause-on-hover',
      'placement',
      'show-progress',
      'repeat-num',
      'mask',
    ]
  }

  /** 命令式 Node 内容通道：options.content 传 Node 时注入，渲染进文本区（忽略文本路径） */
  contentNode: Node | null = null
  /** 命令式 avatar Node 通道：注入 avatar 区 */
  avatarNode: Node | null = null
  /** 自定义 spinner 图标名（lookupIcon 键） */
  spinnerIcon: string | null = null
  /** 自定义 spinner Node 通道 */
  spinnerNode: Node | null = null
  /** 点击消息体回调（options.onClick） */
  onClick: (() => void) | null = null

  private timer: ReturnType<typeof setTimeout> | null = null
  private exitTimer: ReturnType<typeof setTimeout> | null = null
  /** 关闭流程是否已进入（幂等防重入；max 挤出计数据此跳过已关闭元素） */
  private closedFlag = false
  /** 暂停状态：timer 已清除、剩余时长记账中 */
  private pausedFlag = false
  private remainingMs: number | null = null
  private durationMs = 0
  private startedAt = 0

  /** 是否已进入关闭流程 */
  get closed(): boolean {
    return this.closedFlag
  }

  private readonly onMouseEnter = (): void => {
    if (this.pauseOnHoverEnabled()) this.pause()
  }

  private readonly onMouseLeave = (): void => {
    if (this.pauseOnHoverEnabled()) this.resume()
  }

  private readonly onFocusIn = (): void => {
    if (this.pauseOnHoverEnabled()) this.pause()
  }

  private readonly onFocusOut = (): void => {
    if (this.pauseOnHoverEnabled()) this.resume()
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.pause()
    else this.resume()
  }

  private pauseOnHoverEnabled(): boolean {
    return this.getAttr('pause-on-hover', 'true') !== 'false'
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="mask" part="mask" aria-hidden="true" hidden></div>
      <div class="box" part="box" role="status">
        <span class="avatar" part="avatar"><slot name="avatar"><span class="avatar-fallback"></span></slot></span>
        <span class="spinner" part="spinner" aria-hidden="true"><span class="spinner-fallback"></span></span>
        <span class="icon" part="icon" aria-hidden="true"></span>
        <span class="text" part="text"><slot name="content"></slot><span class="text-inner"></span><span class="text-suffix"></span></span>
        <button class="close" part="close" aria-label="" type="button">✕</button>
        <span class="badge" part="badge" aria-hidden="true" hidden></span>
        <div class="progress" part="progress" aria-hidden="true" hidden>
          <div class="progress-fill"></div>
        </div>
      </div>
    `
    const box = this.shadow.querySelector<HTMLElement>('[part="box"]')
    const close = this.shadow.querySelector<HTMLButtonElement>('[part="close"]')
    const mask = this.shadow.querySelector<HTMLElement>('[part="mask"]')
    // 点击消息体：触发 onClick 并以 click 关闭；关闭按钮与遮罩各自独立来源（stopPropagation 隔离）
    box?.addEventListener('click', () => {
      if (this.getAttr('type', 'info') === 'loading') return
      this.onClick?.()
      this.close('click')
    })
    close?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.close('close')
    })
    mask?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.close('mask')
    })
    // 悬停/焦点暂停计时（默认开，pause-on-hover="false" 关闭）
    this.addEventListener('mouseenter', this.onMouseEnter)
    this.addEventListener('mouseleave', this.onMouseLeave)
    this.addEventListener('focusin', this.onFocusIn)
    this.addEventListener('focusout', this.onFocusOut)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    // avatar/content 插槽内容增减（slot 覆盖 Node/文本通道的兜底判空）时重刷
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="avatar"]')
      ?.addEventListener('slotchange', () => this.syncUi())
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="content"]')
      ?.addEventListener('slotchange', () => this.syncUi())
    this.onCleanup(() => {
      this.clearTimer()
      this.clearExitTimer()
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
    })
    this.syncUi()
    this.startTimer()
  }

  protected override update(): void {
    this.syncUi()
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('message.close'))
  }

  /**
   * 命令式层刷新入口：更新内容/类型/时长/合并计数并重置自动关闭计时。
   * content 支持 string（文本通道）与 Node（富内容通道）。
   */
  refresh(
    content: MessageContent,
    type?: MessageType,
    duration?: number,
    count?: number,
  ): void {
    this.applyContent(content)
    if (type) this.setAttribute('type', type)
    if (duration !== undefined) this.setAttribute('duration', String(duration))
    if (count !== undefined) this.setAttribute('count', String(count))
    this.syncText()
    this.startTimer()
  }

  /** 关闭：派发 oas-close（detail 携带 key 与来源）后出场动画移除（减动效时立即移除） */
  close(source: MessageCloseSource = 'close'): void {
    if (this.closedFlag) return
    this.closedFlag = true
    this.clearTimer()
    this.emit('close', { key: this.getAttr('key') || undefined, source })
    if (!this.prefersReducedMotion()) {
      const box = this.shadow.querySelector<HTMLElement>('[part="box"]')
      box?.classList.add('leaving')
      const finish = (): void => {
        this.clearExitTimer()
        this.remove()
      }
      box?.addEventListener('animationend', finish, { once: true })
      this.exitTimer = setTimeout(finish, MESSAGE_EXIT_FALLBACK)
    } else {
      this.remove()
    }
  }

  /** 暂停自动关闭计时（剩余时长记账；无计时器时为空操作） */
  pause(): void {
    if (this.closedFlag || this.pausedFlag || !this.timer) return
    this.remainingMs = this.durationMs - (Date.now() - this.startedAt)
    this.clearTimer()
    if (this.remainingMs <= 0) this.remainingMs = 0
    this.pausedFlag = true
    this.setAttribute('paused', '')
  }

  /** 恢复自动关闭计时（剩余时长续走；已过期则立即关闭） */
  resume(): void {
    if (this.closedFlag || !this.pausedFlag) return
    this.pausedFlag = false
    this.removeAttribute('paused')
    const remaining = this.remainingMs
    this.remainingMs = null
    if (remaining != null && remaining > 0) this.arm(remaining)
    else this.close('auto')
  }

  private prefersReducedMotion(): boolean {
    if (typeof window.matchMedia !== 'function') return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  private applyContent(content: MessageContent): void {
    if (typeof content === 'string') {
      this.contentNode = null
      this.textContent = content
    } else {
      this.contentNode = content
      this.textContent = ''
    }
  }

  private customType(): CustomMessageType | undefined {
    return customTypes.get(this.getAttr('type', 'info'))
  }

  private syncUi(): void {
    const type = this.getAttr('type', 'info') || 'info'
    const custom = this.customType()
    // role：error 用 alert，其余 status
    this.shadow
      .querySelector<HTMLElement>('[part="box"]')
      ?.setAttribute('role', type === 'error' ? 'alert' : 'status')
    // 自定义类型配色：宿主 CSS 变量穿透（--oas-msg-type-color），无则清除回落
    if (custom?.color) this.style.setProperty('--oas-msg-type-color', custom.color)
    else this.style.removeProperty('--oas-msg-type-color')
    // 图标：显式 icon 属性 > 自定义类型 icon > 内置类型图标（loading 无图标走 spinner）
    this.syncIcon(type, custom)
    this.syncSpinner(type)
    this.syncClose(type, custom)
    this.syncText()
    this.syncAvatar()
    this.syncBadge()
    this.syncProgress(type)
    this.syncMask()
  }

  private syncIcon(type: string, custom: CustomMessageType | undefined): void {
    const iconEl = this.shadow.querySelector<HTMLElement>('[part="icon"]')
    if (!iconEl) return
    const explicit = this.getAttr('icon', '')
    const iconName = explicit !== '' ? explicit : (custom?.icon ?? BUILTIN_ICONS[type] ?? '')
    const path = iconName ? lookupIcon(iconName) : undefined
    iconEl.innerHTML = ''
    if (path) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', '0 0 16 16')
      svg.setAttribute('width', '1em')
      svg.setAttribute('height', '1em')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('focusable', 'false')
      svg.innerHTML = path
      iconEl.appendChild(svg)
    }
    const showIcon = this.getAttr('show-icon', 'true') !== 'false'
    iconEl.style.display = showIcon && path && type !== 'loading' ? 'inline-flex' : 'none'
  }

  private syncSpinner(type: string): void {
    const spinner = this.shadow.querySelector<HTMLElement>('[part="spinner"]')
    if (!spinner) return
    const fallback = spinner.querySelector<HTMLElement>('.spinner-fallback')
    const hasCustom = this.spinnerIcon !== null || this.spinnerNode !== null
    spinner.classList.toggle('spinner-custom', hasCustom)
    if (fallback) {
      fallback.innerHTML = ''
      if (this.spinnerNode) fallback.appendChild(this.spinnerNode)
      else if (this.spinnerIcon) {
        const path = lookupIcon(this.spinnerIcon)
        if (path) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 16 16')
          svg.setAttribute('width', '1em')
          svg.setAttribute('height', '1em')
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('focusable', 'false')
          svg.innerHTML = path
          fallback.appendChild(svg)
        }
      }
    }
    spinner.style.display = type === 'loading' ? 'flex' : 'none'
  }

  private syncClose(type: string, custom: CustomMessageType | undefined): void {
    const closeEl = this.shadow.querySelector<HTMLElement>('[part="close"]')
    if (!closeEl) return
    const closable =
      this.getAttr('closable', 'true') !== 'false' &&
      type !== 'loading' &&
      custom?.closable !== false
    closeEl.style.display = closable ? '' : 'none'
  }

  private syncText(): void {
    const inner = this.shadow.querySelector<HTMLElement>('.text-inner')
    const suffix = this.shadow.querySelector<HTMLElement>('.text-suffix')
    const contentSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="content"]')
    if (contentSlot) {
      const hasSlot = contentSlot
        .assignedNodes()
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
      if (inner) inner.hidden = hasSlot
    }
    if (inner && !inner.hidden) {
      if (this.contentNode) {
        inner.textContent = ''
        inner.appendChild(this.contentNode)
      } else {
        inner.textContent = this.textContent ?? ''
      }
    }
    const count = Number(this.getAttr('count', '0'))
    if (suffix) suffix.textContent = count > 1 ? ` ×${count}` : ''
  }

  private syncAvatar(): void {
    const avatar = this.shadow.querySelector<HTMLElement>('[part="avatar"]')
    if (!avatar) return
    const fallback = avatar.querySelector<HTMLElement>('.avatar-fallback')
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="avatar"]')
    if (fallback) {
      fallback.textContent = ''
      if (this.avatarNode) fallback.appendChild(this.avatarNode)
    }
    const hasSlot =
      slot !== null &&
      slot
        .assignedNodes()
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
    avatar.hidden = !hasSlot && this.avatarNode === null
  }

  private syncBadge(): void {
    const badge = this.shadow.querySelector<HTMLElement>('[part="badge"]')
    if (!badge) return
    const raw = this.getAttr('repeat-num', '')
    if (raw === '') {
      badge.hidden = true
      return
    }
    const explicit = Number(raw)
    if (Number.isFinite(explicit) && raw.trim() !== '' && explicit >= 1) {
      badge.textContent = String(explicit)
      badge.hidden = false
      return
    }
    // repeat-num 非数字（如布尔开关）→ 跟随合并计数 count
    const count = Number(this.getAttr('count', '0'))
    if (count > 1) {
      badge.textContent = String(count)
      badge.hidden = false
    } else {
      badge.hidden = true
    }
  }

  private syncProgress(type: string): void {
    const progress = this.shadow.querySelector<HTMLElement>('[part="progress"]')
    if (!progress) return
    const duration = Number(this.getAttr('duration', '3000'))
    const fill = progress.querySelector<HTMLElement>('.progress-fill')
    if (fill) fill.style.animationDuration = `${duration}ms`
    progress.hidden = !(this.hasAttr('show-progress') && duration > 0 && type !== 'loading')
  }

  private syncMask(): void {
    const mask = this.shadow.querySelector<HTMLElement>('[part="mask"]')
    if (mask) mask.hidden = !this.hasAttr('mask')
  }

  private startTimer(): void {
    this.pausedFlag = false
    this.remainingMs = null
    this.removeAttribute('paused')
    const type = this.getAttr('type', 'info')
    const duration = Number(this.getAttr('duration', '3000'))
    if (type === 'loading' || duration <= 0) return
    this.arm(duration)
  }

  private arm(ms: number): void {
    this.clearTimer()
    this.durationMs = ms
    this.startedAt = Date.now()
    this.timer = setTimeout(() => this.close('auto'), ms)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private clearExitTimer(): void {
    if (this.exitTimer) {
      clearTimeout(this.exitTimer)
      this.exitTimer = null
    }
  }
}
