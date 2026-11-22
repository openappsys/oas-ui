import { OASElement } from '@oas-ui/core/oas-element'
import { closePath } from '@oas-ui/icons/icons/close'

/**
 * oas-curtain —— 幕帘（进入后一次性全屏浮层）。
 *
 * 首次挂载时读取本地记忆：未关闭过则自动展开；用户关闭后写入记忆，后续进入不再弹出。
 * 宿主也可直接用 `open` 属性控制显隐（受控通道优先于自动判定）。
 *
 * 属性（kebab-case）：
 * - `open`：受控显隐（在场=展开；宿主写入时静默，不派发事件）
 * - `storage-key`：本地记忆键（默认 `oas-curtain`）；同一 key 多个实例共享「已关闭」状态
 * - `persist`：值布尔，缺省/任意非 `"false"` 值 = 记住关闭；`"false"` = 不写本地记忆、每次进入都弹
 * - `heading`：标题；缺省为空（用默认插槽承载自定义内容）
 * - `mask-closable`：布尔，存在时点击内容区外的遮罩可关闭（默认只能点关闭按钮 / Esc）
 *
 * 方法：
 * - `show()`：强制展开（不清理本地记忆）
 * - `close(reason = 'api')`：关闭并写入本地记忆（persist 生效时），派发 `oas-close`
 * - `reset()`：清除本地记忆（下次进入重新弹出；不改变当前显隐）
 *
 * 事件（bubbles + composed）：
 * - `oas-close`：关闭，detail `{ reason }`（button / esc / backdrop / api）
 *
 * 无障碍：`role="dialog"` + `aria-modal="true"` + 标题或 i18n 兜底可读名称；
 * 打开时焦点进入关闭按钮、Tab 在面板内循环、Esc 关闭、关闭后焦点回到原处。
 */

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
:host(:not([open])) {
  display: none;
}
.curtain {
  position: fixed;
  inset: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050) + 2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-4);
  background: var(--oas-curtain-bg, var(--oas-color-bg));
  color: var(--oas-curtain-color, var(--oas-color-text-primary));
  overflow-y: auto;
  animation: oas-curtain-in var(--oas-curtain-duration, var(--oas-transition-base)) var(--oas-ease-out) both;
}
@keyframes oas-curtain-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.panel {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: var(--oas-curtain-max-width, 420px);
  padding: var(--oas-space-6) var(--oas-space-4) var(--oas-space-4);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-curtain-panel-bg, var(--oas-color-bg-elevated));
  color: var(--oas-curtain-color, var(--oas-color-text-primary));
  box-shadow: 0 8px 32px color-mix(in srgb, var(--oas-color-overlay) 28%, transparent);
}
.heading {
  margin: 0 0 var(--oas-space-3);
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-curtain-color, var(--oas-color-text-primary));
}
.heading[hidden] {
  display: none;
}
.body {
  color: var(--oas-curtain-color, var(--oas-color-text-primary));
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
.close-btn {
  position: absolute;
  inset-block-start: var(--oas-space-2);
  inset-inline-end: var(--oas-space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
}
.close-btn:hover {
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
}
.close-btn:focus-visible {
  outline: 2px solid var(--oas-focus-ring);
  outline-offset: 2px;
}
.close-btn svg {
  display: block;
  width: 1em;
  height: 1em;
}
@media (prefers-reduced-motion: reduce) {
  .curtain {
    animation: none;
  }
}
`

type CloseReason = 'button' | 'esc' | 'backdrop' | 'api'

const FOCUSABLE_RE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export class OASCurtain extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'storage-key', 'persist', 'auto', 'heading', 'mask-closable']
  }

  private curtainEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private headingEl: HTMLElement | null = null
  private closeEl: HTMLButtonElement | null = null
  private evaluated = false
  private wasOpen = false
  private returnFocus: HTMLElement | null = null

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="curtain" part="curtain">
        <div class="panel" part="panel" role="dialog" aria-modal="true">
          <button class="close-btn" part="close" type="button"><svg viewBox="0 0 16 16" aria-hidden="true">${closePath}</svg></button>
          <h2 class="heading" part="heading" hidden></h2>
          <div class="body" part="body"><slot></slot></div>
        </div>
      </div>
    `
  }

  private bind(): void {
    this.curtainEl = this.shadow.querySelector<HTMLElement>('.curtain')
    this.panelEl = this.shadow.querySelector<HTMLElement>('.panel')
    this.headingEl = this.shadow.querySelector<HTMLElement>('.heading')
    this.closeEl = this.shadow.querySelector<HTMLButtonElement>('.close-btn')
    this.closeEl?.addEventListener('click', () => this.requestClose('button'))
    this.curtainEl?.addEventListener('click', (e) => {
      if (!this.hasAttribute('mask-closable')) return
      const target = e.target as Node | null
      if (target && this.panelEl && this.panelEl.contains(target)) return
      this.requestClose('backdrop')
    })
    this.shadow.addEventListener('keydown', (e) => this.onKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 本地记忆键（空值回落默认键） */
  private storageKey(): string {
    return this.getAttr('storage-key', '').trim() || 'oas-curtain'
  }

  /** persist 值布尔：缺省为真，"false" 为关 */
  private shouldPersist(): boolean {
    if (!this.hasAttribute('persist')) return true
    return this.getAttr('persist', '') !== 'false'
  }

  private wasDismissed(): boolean {
    if (!this.shouldPersist()) return false
    try {
      return window.localStorage.getItem(this.storageKey()) === '1'
    } catch {
      return false
    }
  }

  private rememberDismissed(): void {
    if (!this.shouldPersist()) return
    try {
      window.localStorage.setItem(this.storageKey(), '1')
    } catch {
      // 隐私模式 / 禁用存储：忽略持久化失败，不影响本次关闭
    }
  }

  /** 首次挂载自动判定（本地记忆未关闭则展开）；之后的开关完全由 open 属性驱动 */
  private evaluateAutoOpen(): void {
    if (this.evaluated) return
    this.evaluated = true
    if (this.hasAttribute('open')) return
    if (this.getAttr('auto', '') === 'false') return
    if (this.wasDismissed()) return
    this.setAttribute('open', '')
  }

  /** 命令式展开（不清理本地记忆） */
  show(): void {
    this.setAttribute('open', '')
  }

  /** 命令式关闭：写本地记忆并派发 oas-close */
  close(reason: CloseReason = 'api'): void {
    this.requestClose(reason)
  }

  /** 清除本地记忆（下次进入重新弹出）；不改变当前显隐 */
  reset(): void {
    try {
      window.localStorage.removeItem(this.storageKey())
    } catch {
      // 同 rememberDismissed：存储不可用不影响当前状态
    }
  }

  private requestClose(reason: CloseReason): void {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.rememberDismissed()
    this.emit('close', { reason })
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.hasAttribute('open')) return
    if (e.key === 'Escape') {
      e.preventDefault()
      this.requestClose('esc')
      return
    }
    if (e.key === 'Tab') this.trapFocus(e)
  }

  private getFocusables(): HTMLElement[] {
    const panel = this.panelEl
    if (!panel) return []
    return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_RE)]
  }

  private trapFocus(e: KeyboardEvent): void {
    const focusables = this.getFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const root = this.getRootNode()
    const active = root instanceof ShadowRoot ? (root.activeElement as HTMLElement | null) : document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
      return
    }
    if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  protected override update(): void {
    this.evaluateAutoOpen()

    const heading = this.getAttr('heading', '').trim()
    if (this.headingEl) {
      this.headingEl.textContent = heading
      this.headingEl.hidden = heading === ''
    }
    if (this.panelEl) this.panelEl.setAttribute('aria-label', heading || this.t('curtain.label'))
    if (this.closeEl) this.closeEl.setAttribute('aria-label', this.t('curtain.close'))

    const open = this.hasAttribute('open')
    if (open && !this.wasOpen) {
      const active = document.activeElement
      this.returnFocus = active instanceof HTMLElement && active !== this ? active : null
      this.closeEl?.focus()
    } else if (!open && this.wasOpen) {
      const target = this.returnFocus
      this.returnFocus = null
      if (target && target.isConnected) target.focus()
    }
    this.wasOpen = open
  }
}
