import { resolveMessageHost, getAppNotificationConfig } from '../../floating/app/app-host.js'
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
    'position: fixed; top: 16px; right: 16px; display: flex; flex-direction: column; align-items: flex-end; pointer-events: none; z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-toast, 1070));'
  target.appendChild(stackEl)
  return stackEl
}

/**
 * 与最近 app 宿主注册的 notification 全局默认配置合并：调用参数优先，app 默认仅补缺省键。
 * 键集对齐 NotificationOptions 已有键中可作为默认的 duration/showProgress/progressPosition/
 * scrollable（title/description 是内容，不纳入）；app 配置由 <oas-app> 属性解析白名单兜底。
 */
function mergeAppConfig(options: NotificationOptions): NotificationOptions {
  const appConfig = getAppNotificationConfig()
  if (!appConfig) return options
  const merged: NotificationOptions = { ...options }
  if (merged.duration === undefined && typeof appConfig.duration === 'number') {
    merged.duration = appConfig.duration
  }
  if (merged.showProgress === undefined && typeof appConfig.showProgress === 'boolean') {
    merged.showProgress = appConfig.showProgress
  }
  if (
    merged.progressPosition === undefined &&
    (appConfig.progressPosition === 'top' || appConfig.progressPosition === 'bottom')
  ) {
    merged.progressPosition = appConfig.progressPosition
  }
  if (merged.scrollable === undefined && typeof appConfig.scrollable === 'boolean') {
    merged.scrollable = appConfig.scrollable
  }
  return merged
}

function show(type: NotificationType, options: NotificationOptions): void {
  const merged = mergeAppConfig(options)
  const el = document.createElement('oas-notification')
  el.setAttribute('type', type)
  el.setAttribute('title', merged.title)
  if (merged.description !== undefined) el.setAttribute('description', merged.description)
  el.setAttribute('duration', String(merged.duration ?? 4500))
  if (merged.showProgress) el.setAttribute('show-progress', '')
  if (merged.progressPosition !== undefined) {
    el.setAttribute('progress-position', merged.progressPosition)
  }
  if (merged.scrollable !== undefined) el.setAttribute('scrollable', String(merged.scrollable))
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
