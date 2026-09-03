import { resolveMessageHost, getAppNotificationConfig } from '../../framework/app/app-host.js'
import type { OASNotification, NotificationType } from './oas-notification.js'

export type NotificationSize = 'small' | 'medium' | 'large'
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type NotificationPriority = 'normal' | 'high'
export type NotificationStackMode = 'collapsible' | 'peek'

export interface NotificationOptions {
  /** 标题：string 走属性吸收通道渲染进标题区；Node（富内容）由组件 append 进标题区 */
  title: string | Node
  description?: string
  /** 描述富内容通道：Node（代码块等场景）注入描述区，覆盖 description 属性文本 */
  content?: Node
  duration?: number
  /** 显示自动关闭倒计时进度条 */
  showProgress?: boolean
  /** 进度条位置：`bottom`（默认）或 `top` */
  progressPosition?: 'top' | 'bottom'
  /** 描述内容超长时可滚动，默认开启；传 `false` 关闭 */
  scrollable?: boolean
  /** 通知位置（栈按 position 独立管理），默认 `top-right` */
  position?: NotificationPosition
  /** 同栈数量上限，超限丢最老（低优先先被挤出）；默认 `0` 不限 */
  max?: number
  /** 栈容器距视口边偏移（px），作用于当前 position 方向，默认 `16` */
  offset?: number
  /** 自定义挂载容器（覆盖默认 app 宿主/document.body 解析） */
  container?: HTMLElement
  /** 优先级：`normal`（默认）/ `high`——高优恒占最新侧；超限时低优先先被挤出 */
  priority?: NotificationPriority
  /** 栈治理模式：`collapsible`（超过 threshold 折叠 + "+N" 徽章点击展开）/ `peek`（层叠收起，hover 展开） */
  stackMode?: NotificationStackMode
  /** collapsible 模式折叠阈值（超过才折叠），默认 `3` */
  stackThreshold?: number
  /** 唯一标识：供 notification.update / notification.destroy 定位；同 key 再次调用视为更新 */
  key?: string
  /** 关闭回调（自动关闭 / 关闭按钮 / 命令式销毁 / 超上限挤出统一触发一次） */
  onClose?: () => void
  /** 通知体点击回调（"查看详情"场景）；设置后卡片显示可点击光标 */
  onClick?: () => void
  /** 默认 true；传 `false` 隐藏关闭按钮（loading 态强制不可关） */
  closable?: boolean
  /** 悬停暂停自动关闭计时与进度条，默认开启；传 `false` 关闭 */
  pauseOnHover?: boolean
  /** 卡片尺寸档：`small` / `medium`（默认）/ `large` */
  size?: NotificationSize
  /** 图标 Node 通道：覆盖类型默认图标（声明式用 slot="icon"） */
  icon?: Node
  /** 关闭图标 Node 通道：覆盖默认 ✕（声明式用 slot="close-icon"） */
  closeIcon?: Node
  /** footer 操作区 Node 通道（"查看详情/撤销"场景；数组自动聚合为片段；声明式用 slot="footer"） */
  footer?: Node | Node[]
}

export interface NotificationHandle {
  close: () => void
}

/** 命令式内部句柄：promise 链需要 element 引用做 transition */
interface NotificationHandleInternal extends NotificationHandle {
  element: OASNotification
}

function handleOf(el: OASNotification): NotificationHandleInternal {
  return { close: () => el.close('destroy'), element: el }
}

/** notification.update 可更新字段（全可选，未传保持原值） */
export interface NotificationUpdateOptions {
  title?: string | Node
  description?: string
  content?: Node
  duration?: number
  type?: NotificationType
}

/** 存活通知登记：优先级/回调由命令式层管理（priority 抢占与挤出策略读取） */
interface NotificationEntry {
  priority: NotificationPriority
  onClose?: () => void
}

const entries = new Map<OASNotification, NotificationEntry>()
/** key 定位登记：同 key 再次调用视为更新；关闭/挤出时清理 */
const keyMap = new Map<string, OASNotification>()

/** 挂载容器 → 栈缓存键（position/offset/stackMode）→ 栈容器 */
const stacks = new Map<HTMLElement, Map<string, HTMLElement>>()

/** 栈容器与通知的登记清理（oas-close 统一收口：auto/button/destroy/evict） */
function trackClose(el: OASNotification, key: string | undefined, onClose?: () => void): void {
  el.addEventListener('oas-close', () => {
    if (key) keyMap.delete(key)
    entries.delete(el)
    onClose?.()
  })
}

function positionCss(position: NotificationPosition, offset: number): string {
  const o = `${offset}px`
  switch (position) {
    case 'top-left':
      return `top: ${o}; left: ${o}; align-items: flex-start;`
    case 'bottom-right':
      return `bottom: ${o}; right: ${o}; flex-direction: column-reverse; align-items: flex-end;`
    case 'bottom-left':
      return `bottom: ${o}; left: ${o}; flex-direction: column-reverse; align-items: flex-start;`
    case 'top-right':
    default:
      return `top: ${o}; right: ${o}; align-items: flex-end;`
  }
}

/** 栈治理全局样式（栈容器是普通 div，无 shadow；注入一次到 document.head） */
const STACK_STYLE = `
.oas-notification-stack { pointer-events: none; }
.oas-notification-stack .oas-notification-collapsed { display: none; }
.oas-notification-stack .stack-badge {
  pointer-events: auto;
  align-self: center;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-rounded);
  background: var(--oas-color-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: 1;
  padding: var(--oas-space-2);
  cursor: pointer;
  font-family: inherit;
}
.oas-notification-stack .stack-badge:hover { color: var(--oas-color-text-primary); }
.oas-notification-stack .stack-badge[hidden] { display: none; }
.oas-notification-stack.stack-peek oas-notification:not(:last-of-type) {
  max-height: 12px;
  overflow: hidden;
  opacity: 0.55;
  transition: max-height 0.25s ease, opacity 0.25s ease;
}
.oas-notification-stack.stack-peek:hover oas-notification:not(:last-of-type) {
  max-height: 60vh;
  overflow: visible;
  opacity: 1;
}
`

function ensureStackStyles(): void {
  if (document.querySelector('style[data-oas-notification-stack]')) return
  const style = document.createElement('style')
  style.setAttribute('data-oas-notification-stack', '')
  style.textContent = STACK_STYLE
  document.head.appendChild(style)
}

function ensureStack(options: NotificationOptions): HTMLElement {
  ensureStackStyles()
  const target = options.container ?? resolveMessageHost()
  const position = options.position ?? 'top-right'
  const offset = options.offset ?? 16
  const stackMode = options.stackMode ?? ''
  const key = `${position}/${offset}/${stackMode}`
  let byKey = stacks.get(target)
  if (!byKey || ![...byKey.values()].every((s) => s.isConnected)) {
    byKey = new Map()
    stacks.set(target, byKey)
  }
  const cached = byKey.get(key)
  if (cached && cached.isConnected) return cached
  const stack = document.createElement('div')
  stack.className = `oas-notification-stack${stackMode ? ` stack-${stackMode}` : ''}`
  stack.style.cssText = `position: fixed; display: flex; flex-direction: column; z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-toast, 1070)); ${positionCss(position, offset)}`
  byKey.set(key, stack)
  target.appendChild(stack)
  return stack
}

/** 栈内存活通知（DOM 序 = 时间序，最老在前） */
function liveNotifications(stack: HTMLElement): OASNotification[] {
  return [...stack.querySelectorAll('oas-notification')].filter((el) => el.isConnected) as OASNotification[]
}

/** P2/P13 max 裁剪：超限丢最老——优先丢最老的 normal，全 high 才丢最老 high */
function enforceMax(stack: HTMLElement, max: number): void {
  if (!max || max <= 0) return
  let items = liveNotifications(stack)
  while (items.length > max) {
    const victim = items.find((el) => entries.get(el)?.priority !== 'high') ?? items[0]!
    victim.close('evict')
    items = liveNotifications(stack)
  }
}

/** P14 collapsible 折叠计数 reconcile：超过 threshold 折叠旧通知留最新一条 + "+N" 徽章 */
function reconcileCollapsible(stack: HTMLElement, threshold: number): void {
  const items = liveNotifications(stack)
  let badge = stack.querySelector<HTMLButtonElement>('.stack-badge')
  if (!badge) {
    badge = document.createElement('button')
    badge.type = 'button'
    badge.className = 'stack-badge'
    badge.addEventListener('click', () => {
      stack.dataset.expanded = stack.dataset.expanded === 'true' ? 'false' : 'true'
      reconcileCollapsible(stack, threshold)
    })
    stack.appendChild(badge)
  }
  // 徽章恒居栈尾（DOM 最后 = 最新侧之后，不参与通知排序）
  if (badge !== stack.lastElementChild) stack.appendChild(badge)
  const expanded = stack.dataset.expanded === 'true'
  const overflow = items.length - 1
  if (expanded) {
    for (const el of items) el.classList.remove('oas-notification-collapsed')
    badge.textContent = '−'
    if (items.length <= threshold) {
      badge.hidden = true
      stack.dataset.expanded = 'false'
    }
    return
  }
  if (items.length > threshold && overflow > 0) {
    for (const el of items.slice(0, overflow)) el.classList.add('oas-notification-collapsed')
    for (const el of items.slice(overflow)) el.classList.remove('oas-notification-collapsed')
    badge.textContent = `+${overflow}`
    badge.hidden = false
  } else {
    for (const el of items) el.classList.remove('oas-notification-collapsed')
    badge.hidden = true
  }
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

function show(type: NotificationType, options: NotificationOptions): NotificationHandleInternal {
  const merged = mergeAppConfig(options)
  // key 命中 → 更新现有通知（类型/内容/时长刷新，见 updateExisting）
  if (merged.key) {
    const existing = keyMap.get(merged.key)
    if (existing && existing.isConnected) {
      return updateExisting(existing, type, merged)
    }
  }
  const el = document.createElement('oas-notification') as OASNotification
  el.setAttribute('type', type)
  if (typeof merged.title === 'string') {
    el.setAttribute('title', merged.title)
  } else {
    // Node 通道：append 前注入 titleNode，渲染时移入标题区（忽略 titleCache 文本路径）
    el.titleNode = merged.title
  }
  if (merged.description !== undefined) el.setAttribute('description', merged.description)
  if (merged.content !== undefined) el.contentNode = merged.content
  el.setAttribute('duration', String(merged.duration ?? 4500))
  if (merged.showProgress) el.setAttribute('show-progress', '')
  if (merged.progressPosition !== undefined) {
    el.setAttribute('progress-position', merged.progressPosition)
  }
  if (merged.scrollable !== undefined) el.setAttribute('scrollable', String(merged.scrollable))
  if (merged.closable !== undefined) el.setAttribute('closable', String(merged.closable))
  if (merged.pauseOnHover !== undefined) {
    el.setAttribute('pause-on-hover', String(merged.pauseOnHover))
  }
  if (merged.size !== undefined) el.setAttribute('size', merged.size)
  if (merged.icon !== undefined) el.iconNode = merged.icon
  if (merged.closeIcon !== undefined) el.closeIconNode = merged.closeIcon
  if (merged.footer !== undefined) {
    el.footerNode = Array.isArray(merged.footer)
      ? merged.footer.reduce((frag, n) => {
          frag.appendChild(n)
          return frag
        }, document.createDocumentFragment())
      : merged.footer
  }
  if (merged.onClick) el.setAttribute('clickable', '')
  entries.set(el, { priority: merged.priority ?? 'normal', onClose: merged.onClose })
  trackClose(el, merged.key, merged.onClose)
  if (merged.key) keyMap.set(merged.key, el)
  // 通知体点击回调（"查看详情"场景）
  el.addEventListener('oas-click', () => merged.onClick?.())

  const stack = ensureStack(merged)
  // P13 高优插入：normal 插到首条 high 之前（high 恒占最新侧）；high 直接入最新位
  const priority = merged.priority ?? 'normal'
  if (priority === 'normal') {
    const firstHigh = liveNotifications(stack).find((n) => entries.get(n)?.priority === 'high')
    stack.insertBefore(el, firstHigh ?? null)
  } else {
    // 徽章恒居栈尾，通知插到徽章之前
    const badge = stack.querySelector('.stack-badge')
    stack.insertBefore(el, badge ?? null)
  }

  // 栈治理 reconcile：max 裁剪 + collapsible 折叠计数
  enforceMax(stack, merged.max ?? 0)
  if (merged.stackMode === 'collapsible') {
    reconcileCollapsible(stack, merged.stackThreshold ?? 3)
  }
  return handleOf(el)
}

/** key 命中的在位更新：类型/标题/描述/富内容/时长刷新（未传保持原值），计时重置 */
function updateExisting(
  el: OASNotification,
  type: NotificationType,
  options: NotificationUpdateOptions & { key?: string },
): NotificationHandleInternal {
  el.setAttribute('type', type)
  if (options.title !== undefined) {
    if (typeof options.title === 'string') {
      el.titleNode = null
      el.setAttribute('title', options.title)
    } else {
      el.titleNode = options.title
      el.setAttribute('title', '')
    }
  }
  if (options.description !== undefined) el.setAttribute('description', options.description)
  if (options.content !== undefined) el.contentNode = options.content
  // duration 变化经 attributeChangedCallback 重置计时与进度动画
  if (options.duration !== undefined) {
    el.setAttribute('duration', String(options.duration))
  }
  // title/description/content 非观察属性，显式刷新 shadow 内容
  el.refresh()
  return handleOf(el)
}

export interface NotificationPromiseOptions<T = unknown> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((err: unknown) => string)
}

export const notification = {
  info: (options: NotificationOptions): NotificationHandle => show('info', options),
  success: (options: NotificationOptions): NotificationHandle => show('success', options),
  warning: (options: NotificationOptions): NotificationHandle => show('warning', options),
  error: (options: NotificationOptions): NotificationHandle => show('error', options),
  /** loading 态：spinner 图标、不自动关、不可手动关（等待 transition 流转）。
   *  不可关由组件按 type=loading 强制判定，不落 closable 属性（transition 后自动恢复可关） */
  loading: (options: NotificationOptions): NotificationHandle =>
    show('loading', { ...options, duration: 0, closable: undefined }),

  /** promise 链：loading → 成功后切 success（4500ms 自动关）/ 失败后切 error */
  promise: <T>(p: Promise<T>, options: NotificationPromiseOptions<T>): NotificationHandle => {
    const handle = show('loading', { title: options.loading, duration: 0, closable: undefined })
    p.then(
      (data) => {
        const title =
          typeof options.success === 'function' ? options.success(data) : options.success
        handle.element.transition('success', title)
      },
      (err) => {
        const title = typeof options.error === 'function' ? options.error(err) : options.error
        handle.element.transition('error', title)
      },
    )
    return handle
  },

  /** 更新已存在通知的类型/标题/描述/富内容/时长（key 定位）；key 不存在则静默新建 */
  update: (key: string, options: NotificationUpdateOptions): NotificationHandle => {
    const existing = keyMap.get(key)
    if (existing && existing.isConnected) {
      return updateExisting(existing, options.type ?? 'info', { ...options, key })
    }
    return show(options.type ?? 'info', { ...options, key, title: options.title ?? '' })
  },

  /** 关闭指定 key 的通知；不存在则静默无操作 */
  destroy: (key: string): void => {
    const existing = keyMap.get(key)
    if (existing && existing.isConnected) existing.close('destroy')
  },
}

export function destroyAll(): void {
  entries.clear()
  keyMap.clear()
  for (const byKey of stacks.values()) {
    for (const stack of byKey.values()) stack.remove()
    byKey.clear()
  }
  stacks.clear()
}
