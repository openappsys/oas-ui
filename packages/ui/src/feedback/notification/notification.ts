import { resolveMessageHost } from '../../floating/app/app-host.js'
import type { NotificationType } from './index.js'

export interface NotificationOptions {
  title: string
  description?: string
  duration?: number
  /** 显示自动关闭倒计时进度条 */
  showProgress?: boolean
  /** 进度条位置：`bottom`（默认）或 `top` */
  progressPosition?: 'top' | 'bottom'
  /** 描述内容超长时可滚动，默认开启；传 `false` 关闭 */
  scrollable?: boolean
}

let stackEl: HTMLElement | null = null

function ensureStack(): HTMLElement {
  const target = resolveMessageHost()
  if (stackEl && target.contains(stackEl)) return stackEl
  stackEl = document.createElement('div')
  stackEl.style.cssText =
    'position: fixed; top: 16px; right: 16px; display: flex; flex-direction: column; align-items: flex-end; pointer-events: none; z-index: var(--oas-z-toast, 1070);'
  target.appendChild(stackEl)
  return stackEl
}

function show(type: NotificationType, options: NotificationOptions): void {
  const el = document.createElement('oas-notification')
  el.setAttribute('type', type)
  el.setAttribute('title', options.title)
  if (options.description !== undefined) el.setAttribute('description', options.description)
  el.setAttribute('duration', String(options.duration ?? 4500))
  if (options.showProgress) el.setAttribute('show-progress', '')
  if (options.progressPosition !== undefined) {
    el.setAttribute('progress-position', options.progressPosition)
  }
  if (options.scrollable !== undefined) el.setAttribute('scrollable', String(options.scrollable))
  ensureStack().appendChild(el)
}

export const notification = {
  info: (options: NotificationOptions): void => show('info', options),
  success: (options: NotificationOptions): void => show('success', options),
  warning: (options: NotificationOptions): void => show('warning', options),
  error: (options: NotificationOptions): void => show('error', options),
}

export function destroyAll(): void {
  if (stackEl) stackEl.innerHTML = ''
  stackEl = null
}
