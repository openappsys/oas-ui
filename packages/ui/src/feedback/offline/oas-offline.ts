import { OASElement } from '@oas-ui/core/oas-element'
import { alertCirclePath } from '@oas-ui/icons/icons/alert-circle'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-offline —— 断网提示条 / 提示块。
 *
 * 监听浏览器 `online` / `offline` 事件同步网络状态：断网时显示提示，恢复后自动消失。
 * 首帧按 `navigator.onLine` 直接决定显隐（不在首帧先显示再改判，避免「初始离线闪一下」）。
 *
 * 属性（kebab-case）：
 * - `variant`：`bar`（默认，固定在视口顶部、铺满宽度）/ `block`（跟随文档流的提示块）
 * - `message`：提示文案覆盖；缺省走 i18n `offline.message`
 *
 * 事件（bubbles + composed）：
 * - `oas-offline`：进入断网态时派发
 * - `oas-online`：网络恢复时派发
 *
 * 无障碍：提示条为 `role="status"` + `aria-live="polite"`；在线时宿主整体 display:none，
 * 不在可访问性树中残留。
 */

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
/* 在线时整体不渲染（display:none 同时移出可访问性树）；离线标记由 update 同步 */
:host(:not([data-offline])) {
  display: none;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding-block: var(--oas-space-2);
  padding-inline: var(--oas-space-3);
  background: var(--oas-offline-bg, var(--oas-color-danger));
  color: var(--oas-offline-color, var(--oas-color-text-on-danger));
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
}
:host([variant='bar']) .bar {
  position: fixed;
  inset-inline: 0;
  inset-block-start: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-toast, 1070));
  box-shadow: 0 1px 0 color-mix(in srgb, var(--oas-color-overlay) 18%, transparent);
}
:host([variant='block']) .bar {
  position: static;
  border-radius: var(--oas-radius-md);
}
.icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}
.icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.text {
  min-width: 0;
}
`

export type OfflineVariant = 'bar' | 'block'

function navigatorOnline(): boolean {
  try {
    return typeof navigator === 'undefined' || navigator.onLine !== false
  } catch {
    return true
  }
}

const warnedVariants = new Set<string>()

export class OASOffline extends OASElement {
  static override get observedAttributes(): string[] {
    return ['variant', 'message']
  }

  /** 当前网络状态；bind() 首帧按 navigator.onLine 初始化，之后由 online/offline 事件驱动 */
  private online = true
  /** 当前连接周期内是否已注册 window 监听清理（避免重连叠加清理回调） */
  private windowBound = false
  private textEl: HTMLElement | null = null

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="status" aria-live="polite" aria-atomic="true">
        <span class="icon" part="icon" aria-hidden="true"><svg viewBox="0 0 16 16">${alertCirclePath}</svg></span>
        <span class="text" part="text"></span>
      </div>
    `
  }

  private bind(): void {
    this.textEl = this.shadow.querySelector<HTMLElement>('.text')
    this.online = navigatorOnline()
    this.bindWindow()
  }

  /** window 监听随重连重挂；清理回调在同一连接周期内只注册一次（onReconnect 重入不叠加） */
  private bindWindow(): void {
    window.addEventListener('online', this.onNetworkChange)
    window.addEventListener('offline', this.onNetworkChange)
    if (this.windowBound) return
    this.windowBound = true
    this.onCleanup(() => {
      this.windowBound = false
      window.removeEventListener('online', this.onNetworkChange)
      window.removeEventListener('offline', this.onNetworkChange)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bindWindow()
  }

  private readonly onNetworkChange = (): void => {
    const next = navigatorOnline()
    if (next === this.online) return
    this.online = next
    this.update()
    if (next) this.emit('online')
    else this.emit('offline')
  }

  protected override update(): void {
    const text = this.getAttr('message', '').trim() || this.t('offline.message')
    if (this.textEl) this.textEl.textContent = text
    if (this.online) this.removeAttribute('data-offline')
    else this.setAttribute('data-offline', '')

    const variant = this.getAttr('variant', '').trim()
    if (variant !== '' && variant !== 'bar' && variant !== 'block' && !warnedVariants.has(variant)) {
      warnedVariants.add(variant)
      devWarn(`[oas-offline] 未知 variant "${variant}"，已按默认 bar 渲染；可选 bar / block`)
    }
  }
}
