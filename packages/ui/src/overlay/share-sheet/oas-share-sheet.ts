import { OASElement } from '@oas-ui/core/oas-element'
import { closePath } from '@oas-ui/icons/icons/close'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-share-sheet —— 分享面板（底部弹出宫格渠道 + 取消/关闭）。
 *
 * 渠道由 `channels` JSON 属性声明（`[{ key, name, icon? }]`）：`icon` 为 `oas-icon`
 * 图标名（内置或宿主注册的图标）；缺省时用渠道名首字符占位。点击渠道派发
 * `oas-select`（detail `{ key, name, channel }`）后自动关闭并派发 `oas-close`。
 *
 * 属性（kebab-case）：
 * - `open`：受控显隐（在场=展开）
 * - `heading`：面板标题；缺省走 i18n `shareSheet.title`
 * - `cancel-text`：取消按钮文案；缺省走 i18n `shareSheet.cancel`
 * - `channels`：渠道 JSON 数组 `[{ key, name, icon? }]`；非法 JSON 忽略并告警一次
 *
 * 方法：
 * - `show()`：展开面板（写入 open）
 * - `close(reason = 'api')`：收起面板并派发 `oas-close`
 *
 * 事件（bubbles + composed）：
 * - `oas-select`：点击渠道，detail `{ key, name, channel }`
 * - `oas-close`：关闭，detail `{ reason, key? }`（reason: cancel / close / backdrop / esc / select / api）
 *
 * 无障碍：`role="dialog"` + `aria-modal="true"` + 标题作为可读名称；打开时焦点进入
 * 首个渠道、Tab 在面板内循环、Esc 关闭、关闭后焦点回到打开前的元素。
 */

const STYLE = `
:host {
  display: contents;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
  background: var(--oas-share-sheet-mask, var(--oas-color-overlay));
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear var(--oas-transition-base);
}
:host([open]) .backdrop {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s;
}
.sheet {
  position: fixed;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050) + 1);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: var(--oas-share-sheet-max-height, 80vh);
  padding-block-end: env(safe-area-inset-bottom, 0px);
  border-radius: var(--oas-radius-lg) var(--oas-radius-lg) 0 0;
  background: var(--oas-share-sheet-bg, var(--oas-color-bg));
  color: var(--oas-share-sheet-color, var(--oas-color-text-primary));
  box-shadow: 0 -4px 24px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  transform: translateY(100%);
  visibility: hidden;
  transition:
    transform var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear var(--oas-transition-base);
}
:host([open]) .sheet {
  transform: translateY(0);
  visibility: visible;
  transition:
    transform var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4) var(--oas-space-1);
}
.heading {
  margin: 0;
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.close-btn {
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
  background: var(--oas-color-bg-elevated);
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
.grid {
  display: grid;
  grid-template-columns: repeat(var(--oas-share-sheet-columns, 4), minmax(0, 1fr));
  gap: var(--oas-space-3) var(--oas-space-2);
  overflow-y: auto;
  padding: var(--oas-space-3) var(--oas-space-4);
  overscroll-behavior: contain;
}
.channel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-primary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.channel:hover {
  background: var(--oas-color-bg-elevated);
}
.channel:focus-visible {
  outline: 2px solid var(--oas-focus-ring);
  outline-offset: -2px;
}
.channel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--oas-radius-md);
  background: var(--oas-share-sheet-channel-bg, var(--oas-color-bg-elevated));
  color: var(--oas-share-sheet-channel-color, var(--oas-color-text-primary));
  font-size: var(--oas-font-size-lg);
}
.channel-icon oas-icon {
  font-size: var(--oas-font-size-lg);
}
.channel-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.cancel {
  flex-shrink: 0;
  margin-block-start: var(--oas-space-1);
  padding: var(--oas-space-3) var(--oas-space-4);
  border: none;
  border-block-start: 1px solid var(--oas-color-border);
  background: transparent;
  color: var(--oas-color-text-secondary);
  font: inherit;
  font-size: var(--oas-font-size-md);
  cursor: pointer;
}
.cancel:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-elevated);
}
.cancel:focus-visible {
  outline: 2px solid var(--oas-focus-ring);
  outline-offset: -2px;
}
.empty {
  padding: var(--oas-space-5);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  text-align: center;
}
`

export interface ShareSheetChannel {
  key: string
  name: string
  icon?: string
}

type CloseReason = 'cancel' | 'close' | 'backdrop' | 'esc' | 'select' | 'api'

const FOCUSABLE_RE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const warnedChannels = new Set<string>()

export class OASShareSheet extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'heading', 'cancel-text', 'channels']
  }

  private sheetEl: HTMLElement | null = null
  private headingEl: HTMLElement | null = null
  private gridEl: HTMLElement | null = null
  private cancelEl: HTMLButtonElement | null = null
  private closeEl: HTMLButtonElement | null = null
  private channels: ShareSheetChannel[] = []
  private lastChannelsRaw: string | null = null
  private wasOpen = false
  private returnFocus: HTMLElement | null = null

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="backdrop" part="backdrop" aria-hidden="true"></div>
      <div class="sheet" part="sheet" role="dialog" aria-modal="true">
        <div class="header">
          <h2 class="heading" part="heading"></h2>
          <button class="close-btn" part="close" type="button"><svg viewBox="0 0 16 16" aria-hidden="true">${closePath}</svg></button>
        </div>
        <div class="grid" part="grid" role="group"></div>
        <button class="cancel" part="cancel" type="button"></button>
      </div>
    `
  }

  private bind(): void {
    this.sheetEl = this.shadow.querySelector<HTMLElement>('.sheet')
    this.headingEl = this.shadow.querySelector<HTMLElement>('.heading')
    this.gridEl = this.shadow.querySelector<HTMLElement>('.grid')
    this.cancelEl = this.shadow.querySelector<HTMLButtonElement>('.cancel')
    this.closeEl = this.shadow.querySelector<HTMLButtonElement>('.close-btn')

    this.shadow.querySelector('.backdrop')?.addEventListener('click', () => this.requestClose('backdrop'))
    this.closeEl?.addEventListener('click', () => this.requestClose('close'))
    this.cancelEl?.addEventListener('click', () => this.requestClose('cancel'))
    this.gridEl?.addEventListener('click', (e) => this.onGridClick(e))
    this.shadow.addEventListener('keydown', (e) => this.onKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 命令式展开（与写入 open 属性等价） */
  show(): void {
    this.setAttribute('open', '')
  }

  /** 命令式收起；reason 透出到 oas-close，便于宿主区分来源 */
  close(reason: CloseReason = 'api'): void {
    this.requestClose(reason)
  }

  private requestClose(reason: CloseReason, key?: string): void {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.emit('close', key === undefined ? { reason } : { reason, key })
  }

  private onGridClick(e: Event): void {
    const target = (e.target as HTMLElement | null)?.closest?.('button.channel') as HTMLButtonElement | null
    if (!target) return
    const index = Number(target.dataset.index)
    const channel = this.channels[index]
    if (!channel) return
    this.emit('select', { key: channel.key, name: channel.name, channel })
    this.requestClose('select', channel.key)
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
    const sheet = this.sheetEl
    if (!sheet) return []
    return [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE_RE)]
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

  /** 解析 channels JSON：数组、每项 key/name 为非空字符串；非法项跳过 */
  private resolveChannels(): ShareSheetChannel[] {
    const raw = this.getAttr('channels', '')
    if (raw === this.lastChannelsRaw) return this.channels
    this.lastChannelsRaw = raw
    if (raw.trim() === '') return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      if (!warnedChannels.has(raw)) {
        warnedChannels.add(raw)
        devWarn(
          '[oas-share-sheet] channels 不是合法 JSON 数组，已忽略；示例：[{"key":"copy","name":"复制链接","icon":"copy"}]',
        )
      }
      return []
    }
    if (!Array.isArray(parsed)) {
      if (!warnedChannels.has(raw)) {
        warnedChannels.add(raw)
        devWarn('[oas-share-sheet] channels 必须是数组，已忽略')
      }
      return []
    }
    const out: ShareSheetChannel[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const value = item as Record<string, unknown>
      const key = typeof value.key === 'string' ? value.key.trim() : ''
      const name = typeof value.name === 'string' ? value.name.trim() : ''
      if (key === '' || name === '') continue
      const icon = typeof value.icon === 'string' && value.icon.trim() !== '' ? value.icon.trim() : undefined
      out.push(icon === undefined ? { key, name } : { key, name, icon })
    }
    return out
  }

  private renderChannels(): void {
    const grid = this.gridEl
    if (!grid) return
    grid.replaceChildren()
    if (this.channels.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('shareSheet.empty')
      grid.appendChild(empty)
      return
    }
    this.channels.forEach((channel, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'channel'
      button.setAttribute('part', 'channel')
      button.dataset.index = String(index)
      button.dataset.key = channel.key

      const iconWrap = document.createElement('span')
      iconWrap.className = 'channel-icon'
      iconWrap.setAttribute('aria-hidden', 'true')
      if (channel.icon) {
        const icon = document.createElement('oas-icon')
        icon.setAttribute('name', channel.icon)
        icon.setAttribute('size', '24')
        iconWrap.appendChild(icon)
      } else {
        iconWrap.textContent = channel.name.slice(0, 1)
      }

      const label = document.createElement('span')
      label.className = 'channel-name'
      label.textContent = channel.name

      button.append(iconWrap, label)
      grid.appendChild(button)
    })
  }

  protected override update(): void {
    const heading = this.getAttr('heading', '').trim() || this.t('shareSheet.title')
    if (this.headingEl) this.headingEl.textContent = heading
    if (this.sheetEl) this.sheetEl.setAttribute('aria-label', heading)
    if (this.gridEl) this.gridEl.setAttribute('aria-label', heading)
    if (this.cancelEl) {
      this.cancelEl.textContent = this.getAttr('cancel-text', '').trim() || this.t('shareSheet.cancel')
    }
    if (this.closeEl) this.closeEl.setAttribute('aria-label', this.t('shareSheet.close'))

    this.channels = this.resolveChannels()
    this.renderChannels()

    const open = this.hasAttribute('open')
    if (open && !this.wasOpen) {
      const active = document.activeElement
      this.returnFocus = active instanceof HTMLElement && active !== this ? active : null
      const first = this.gridEl?.querySelector<HTMLElement>('button.channel')
      ;(first ?? this.closeEl)?.focus()
    } else if (!open && this.wasOpen) {
      const target = this.returnFocus
      this.returnFocus = null
      if (target && target.isConnected) target.focus()
    }
    this.wasOpen = open
  }
}
