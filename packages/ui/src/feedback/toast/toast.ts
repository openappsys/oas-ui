import { resolveMessageHost, getAppToastConfig } from '../../framework/app/app-host.js'
import type {
  OASToast,
  ToastType,
  ToastAction,
  ToastCloseTrigger,
} from './oas-toast.js'

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'left'
  | 'right'
  | 'center'

export interface ToastOptions {
  /** 标题：string 走属性吸收通道渲染进标题区；Node（富内容）由组件 append 进标题区 */
  title: string | Node
  description?: string
  /** 单操作按钮（等价 actions=[action]，兼容旧 API） */
  action?: ToastAction
  /** 多操作按钮：点击默认自动关闭；noDismiss 置 true 可点击不关 */
  actions?: ToastAction[]
  /** 默认 3000ms，0 表示不自动关闭 */
  duration?: number
  /** 默认 true，loading 态强制不可关 */
  closable?: boolean
  /** 默认 top-right */
  position?: ToastPosition
  /** 唯一标识：供 toast.update / toast.dismiss 定位；同 id 再次调用视为更新 */
  id?: string
  /** 关闭回调（自动关闭 / 关闭按钮 / action / dismiss / destroyAll 都会触发一次） */
  onClose?: () => void
  /** 优先级（默认 0）：与 max 队列配合，高优先级抢占低优先级可见位 */
  priority?: number
  /** 该位置栈最大可见数（默认 Infinity），超限排队，关闭后补位 */
  max?: number
  /** 屏幕阅读器敏感度：assertive / polite；缺省按类型（error=assertive，其余 polite） */
  politeness?: 'assertive' | 'polite'
  /** 剩余时间进度条（duration>0 时显示，轻量版） */
  showProgress?: boolean
  /** 进度条位置：bottom（默认）或 top */
  progressPosition?: 'top' | 'bottom'
  /** 进度环式关闭按钮（duration>0 时显示，可选视觉形态） */
  progressRing?: boolean
  /** 同内容去重：同位置栈内同内容合并并递增计数徽标 */
  grouping?: boolean
  /** 滑动关闭方向：both（默认）/ right / left / up / down */
  swipeDirection?: 'both' | 'right' | 'left' | 'up' | 'down'
  /** 折叠堆叠模式（同位置栈收纳为 +N，hover/聚焦展开） */
  stacked?: boolean
  /** 变体：solid（默认）/ plain / translucent */
  variant?: 'solid' | 'plain' | 'translucent'
  /** 挂载点控制：覆盖默认宿主（app 容器或 body） */
  container?: HTMLElement | (() => HTMLElement)
  /** hover 暂停计时（默认 true） */
  pauseOnHover?: boolean
  /** 聚焦暂停计时（默认 true） */
  pauseOnFocus?: boolean
  /** 窗口失焦暂停计时（默认 true） */
  pauseOnWindowBlur?: boolean
}

export interface ToastConfigOptions {
  duration?: number
  position?: ToastPosition
  closable?: boolean
  max?: number
  priority?: number
  politeness?: 'assertive' | 'polite'
  variant?: 'solid' | 'plain' | 'translucent'
  showProgress?: boolean
  progressPosition?: 'top' | 'bottom'
  progressRing?: boolean
  swipeDirection?: 'both' | 'right' | 'left' | 'up' | 'down'
  grouping?: boolean
  stacked?: boolean
  pauseOnHover?: boolean
  pauseOnFocus?: boolean
  pauseOnWindowBlur?: boolean
}

export interface ToastUpdateOptions {
  type?: ToastType
  title?: string | Node
  description?: string
  duration?: number
  action?: ToastAction
  actions?: ToastAction[]
  closable?: boolean
  onClose?: () => void
}

export interface ToastHandle {
  close: () => void
  /** 原位更新内容/类型/时长（id 定位或句柄持有者）；刷新后重置自动关闭计时 */
  update: (options: ToastUpdateOptions) => ToastHandle
}

export interface ToastPromiseOptions<T = unknown> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((err: unknown) => string)
}

/** 队列中等待的条目（尚未挂载，dismiss/update 直接操作队列） */
interface QueueItem {
  type: ToastType
  options: ToastOptions
  position: ToastPosition
  priority: number
}

/** 存活登记（element → entry），关闭时统一清理 */
interface EntryInfo {
  type: ToastType
  options: ToastOptions
  onClose?: () => void
  id?: string
  priority: number
  /** 同内容去重计数（grouping 命中 +1） */
  count: number
  /** 去重签名（type+title+description），grouping 开启时记录 */
  signature?: string
  stack: StackState
}

interface StackState {
  el: HTMLElement
  items: OASToast[]
  queue: QueueItem[]
  max: number
  stacked: boolean
  badge: HTMLElement | null
}

let stackStyleInjected = false

/** 栈容器堆叠/收纳样式（命令式创建，注入一次文档级样式） */
function injectStackStyle(): void {
  if (stackStyleInjected) return
  stackStyleInjected = true
  const style = document.createElement('style')
  style.textContent = `
.oas-toast-stack {
  position: relative;
}
.oas-toast-stack .oas-toast-stack-badge {
  align-self: center;
  margin-top: var(--oas-space-1);
  padding: 2px var(--oas-space-2);
  border-radius: 10px;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  cursor: pointer;
  user-select: none;
}
.oas-toast-stack .oas-toast-stack-badge[hidden] { display: none; }
/* 折叠堆叠：最新一条全显，其余 peek 层叠（hover/聚焦/+N 点击展开） */
.oas-toast-stack[data-stacked] > oas-toast {
  transition: transform var(--oas-toast-stack-anim-duration, 0.25s) ease,
    opacity var(--oas-toast-stack-anim-duration, 0.25s) ease;
}
.oas-toast-stack[data-stacked] > oas-toast:not(:last-child) {
  transform: scale(0.94) translateY(6px);
  opacity: 0.35;
  pointer-events: none;
}
.oas-toast-stack[data-stacked]:hover > oas-toast,
.oas-toast-stack[data-stacked]:focus-within > oas-toast,
.oas-toast-stack[data-stacked].is-expanded > oas-toast {
  transform: none;
  opacity: 1;
  pointer-events: auto;
}
`
  document.head.appendChild(style)
}

function positionCss(position: ToastPosition): string {
  switch (position) {
    case 'top-left':
      return 'top: 16px; left: 16px; align-items: flex-start;'
    case 'top-center':
      return 'top: 16px; left: 50%; transform: translateX(-50%); align-items: center;'
    case 'bottom-right':
      return 'bottom: 16px; right: 16px; flex-direction: column-reverse; align-items: flex-end;'
    case 'bottom-left':
      return 'bottom: 16px; left: 16px; flex-direction: column-reverse; align-items: flex-start;'
    case 'bottom-center':
      return 'bottom: 16px; left: 50%; transform: translateX(-50%); flex-direction: column-reverse; align-items: center;'
    case 'left':
      return 'top: 50%; left: 16px; transform: translateY(-50%); align-items: flex-start;'
    case 'right':
      return 'top: 50%; right: 16px; transform: translateY(-50%); align-items: flex-end;'
    case 'center':
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%); align-items: center;'
    case 'top-right':
    default:
      return 'top: 16px; right: 16px; align-items: flex-end;'
  }
}

/** 每个 toaster 实例一组独立栈（命名实例并行管理，默认 'default'） */
class Toaster {
  private stacks = new Map<ToastPosition, StackState>()
  private entries = new Map<OASToast, EntryInfo>()
  private keyMap = new Map<string, OASToast>()
  private defaults: ToastConfigOptions = {}

  config(options: ToastConfigOptions): void {
    this.defaults = { ...this.defaults, ...options }
  }

  /**
   * 与全局 config（toast.config）和 app 宿主配置合并：调用参数优先，
   * config 次之、app 配置兜底；仅补缺省键，运行时键（id/onClose/container/title 等）不参与。
   */
  private mergeOptions(options: ToastOptions): ToastOptions {
    const app = getAppToastConfig()
    const out: ToastOptions = { ...options }
    const pick = <K extends keyof ToastOptions>(k: K): ToastOptions[K] | undefined => {
      if (out[k] !== undefined) return out[k]
      const d = this.defaults as Record<string, unknown>
      if (d[k as string] !== undefined) return d[k as string] as ToastOptions[K]
      if (app && app[k as string] !== undefined) return app[k as string] as ToastOptions[K]
      return undefined
    }
    out.duration = pick('duration')
    out.position = pick('position')
    out.closable = pick('closable')
    out.politeness = pick('politeness')
    out.variant = pick('variant')
    out.priority = pick('priority')
    out.max = pick('max')
    out.showProgress = pick('showProgress')
    out.progressRing = pick('progressRing')
    out.swipeDirection = pick('swipeDirection')
    out.grouping = pick('grouping')
    out.stacked = pick('stacked')
    out.pauseOnHover = pick('pauseOnHover')
    out.pauseOnFocus = pick('pauseOnFocus')
    out.pauseOnWindowBlur = pick('pauseOnWindowBlur')
    return out
  }

  show(type: ToastType, options: ToastOptions): ToastHandle {
    injectStackStyle()
    const merged = this.mergeOptions(options)
    const position = merged.position ?? 'top-right'
    const priority = merged.priority ?? 0

    // id 命中 → 更新现有（可见或排队中）
    if (merged.id) {
      const existing = this.keyMap.get(merged.id)
      if (existing && existing.isConnected) {
        return this.updateEntry(existing, {
          type,
          title: merged.title,
          description: merged.description,
          duration: merged.duration,
          actions: merged.actions,
          closable: merged.closable,
          onClose: merged.onClose,
        })
      }
      const qi = this.findQueued(merged.id)
      if (qi) {
        qi.type = type
        qi.options = { ...qi.options, ...merged }
        qi.priority = priority
        return this.queuedHandle(qi)
      }
    }

    const stack = this.ensureStack(position, merged.container)
    if (merged.max !== undefined) stack.max = merged.max
    else if (this.defaults.max !== undefined) stack.max = this.defaults.max

    // 同内容去重：同栈同签名合并，递增计数徽标并重置计时
    if (merged.grouping) {
      const sig = this.signature(type, merged)
      const hit = stack.items.find((el) => this.entries.get(el)?.signature === sig)
      if (hit) {
        const entry = this.entries.get(hit)!
        entry.count += 1
        entry.onClose = merged.onClose ?? entry.onClose
        hit.setAttribute('count', String(entry.count))
        hit.refresh({ duration: merged.duration })
        return this.handleFor(hit)
      }
    }
    // max 队列：满时高优先级抢占可见低位，否则入队
    if (stack.items.length >= stack.max) {
      const lowest = this.lowestPriorityItem(stack)
      if (lowest && priority > lowest.priority) {
        // 抢占：关闭被挤掉的 toast（oas-close 同步触发补位）
        this.closeEl(lowest.el, 'preempt')
        // 抢占后槽位可能已被队列补位占用（items 仍满）→ 重新走队列判定，避免超 max 挂新
        if (stack.items.length >= stack.max) {
          const qi: QueueItem = { type, options: merged, position, priority }
          stack.queue.push(qi)
          return this.queuedHandle(qi)
        }
      } else {
        const qi: QueueItem = { type, options: merged, position, priority }
        stack.queue.push(qi)
        return this.queuedHandle(qi)
      }
    }

    return this.createAndShow(stack, type, merged)
  }

  /** 按 id 原位更新（keyMap 定位）；不存在则新建 */
  update(id: string, options: ToastUpdateOptions): ToastHandle {
    const existing = this.keyMap.get(id)
    if (existing && existing.isConnected) return this.updateEntry(existing, options)
    const qi = this.findQueued(id)
    if (qi) {
      qi.type = options.type ?? qi.type
      qi.options = { ...qi.options, ...options }
      if (options.title !== undefined) qi.options.title = options.title
      return this.queuedHandle(qi)
    }
    const type = options.type ?? 'info'
    return this.show(type, {
      title: options.title ?? options.description ?? '',
      description: options.description,
      duration: options.duration,
      actions: options.actions ?? (options.action ? [options.action] : undefined),
      closable: options.closable,
      id,
    })
  }

  /** 按 id 关闭（可见或排队中）；不存在则静默无操作 */
  dismiss(id: string): void {
    const existing = this.keyMap.get(id)
    if (existing && existing.isConnected) {
      this.closeEl(existing, 'manual')
      return
    }
    const qi = this.findQueued(id)
    if (qi) this.removeQueued(qi)
  }

  destroyAll(): void {
    this.entries.clear()
    this.keyMap.clear()
    for (const stack of this.stacks.values()) {
      // 直接移除容器：子 toast 经 disconnectedCallback 补发 oas-close（触发 onClose）+ oas-destroy
      stack.el.remove()
    }
    this.stacks.clear()
  }

  private signature(type: ToastType, options: ToastOptions): string {
    const title =
      typeof options.title === 'string'
        ? options.title
        : (options.title?.textContent ?? '')
    return `${type}|${title}|${options.description ?? ''}`
  }

  private findQueued(id: string): QueueItem | null {
    for (const stack of this.stacks.values()) {
      const hit = stack.queue.find((q) => q.options.id === id)
      if (hit) return hit
    }
    return null
  }

  private queuedHandle(qi: QueueItem): ToastHandle {
    return {
      close: () => this.removeQueued(qi),
      update: (options: ToastUpdateOptions): ToastHandle => {
        qi.type = options.type ?? qi.type
        qi.options = { ...qi.options, ...options }
        if (options.title !== undefined) qi.options.title = options.title
        return this.queuedHandle(qi)
      },
    }
  }

  private removeQueued(qi: QueueItem): void {
    const stack = this.stacks.get(qi.position)
    if (!stack) return
    const idx = stack.queue.indexOf(qi)
    if (idx < 0) return
    stack.queue.splice(idx, 1)
    qi.options.onClose?.()
  }

  private updateEntry(el: OASToast, options: ToastUpdateOptions): ToastHandle {
    const entry = this.entries.get(el)
    if (entry) entry.onClose = options.onClose ?? entry.onClose
    el.refresh({
      type: options.type,
      title: options.title,
      description: options.description,
      duration: options.duration,
      actions: options.actions ?? (options.action ? [options.action] : undefined),
      closable: options.closable,
    })
    return this.handleFor(el)
  }

  private createAndShow(stack: StackState, type: ToastType, merged: ToastOptions): ToastHandle {
    const el = document.createElement('oas-toast') as OASToast
    this.applyAttributes(el, type, merged)
    const entry: EntryInfo = {
      type,
      options: merged,
      onClose: merged.onClose,
      id: merged.id,
      priority: merged.priority ?? 0,
      count: 1,
      signature: merged.grouping ? this.signature(type, merged) : undefined,
      stack,
    }
    this.bindClose(el, entry)
    this.entries.set(el, entry)
    if (merged.id) this.keyMap.set(merged.id, el)
    if (merged.stacked) stack.stacked = true
    stack.items.push(el)
    stack.el.appendChild(el)
    this.syncStacked(stack)
    return this.handleFor(el)
  }

  private applyAttributes(el: OASToast, type: ToastType, o: ToastOptions): void {
    el.setAttribute('type', type)
    if (typeof o.title === 'string') {
      el.setAttribute('title', o.title)
    } else {
      // Node 通道：append 前注入 titleNode，渲染时移入标题区（忽略 titleCache 文本路径）
      el.titleNode = o.title
    }
    if (o.description !== undefined) el.setAttribute('description', o.description)
    el.setAttribute('duration', String(o.duration ?? 3000))
    if (o.closable !== false && type !== 'loading') el.setAttribute('closable', '')
    if (o.id) el.setAttribute('id', o.id)
    if (o.politeness) el.setAttribute('politeness', o.politeness)
    if (o.variant && o.variant !== 'solid') el.setAttribute('variant', o.variant)
    if (o.showProgress) el.setAttribute('show-progress', '')
    if (o.progressPosition) el.setAttribute('progress-position', o.progressPosition)
    if (o.progressRing) el.setAttribute('progress-ring', '')
    if (o.swipeDirection && o.swipeDirection !== 'both') {
      el.setAttribute('swipe-direction', o.swipeDirection)
    }
    if (o.pauseOnHover === false) el.setAttribute('pause-on-hover', 'false')
    if (o.pauseOnFocus === false) el.setAttribute('pause-on-focus', 'false')
    if (o.pauseOnWindowBlur === false) el.setAttribute('pause-on-window-blur', 'false')
    if (o.actions) el.actions = o.actions
    else if (o.action) el.actions = [o.action]
  }

  /** 监听 oas-close：清理登记、触发 onClose、补位出队（自动关闭/按钮/命令式/外部移除统一收口） */
  private bindClose(el: OASToast, entry: EntryInfo): void {
    el.addEventListener('oas-close', () => {
      if (this.entries.get(el) === entry) this.entries.delete(el)
      if (entry.id) this.keyMap.delete(entry.id)
      const stack = entry.stack
      const idx = stack.items.indexOf(el)
      if (idx >= 0) stack.items.splice(idx, 1)
      entry.onClose?.()
      if (stack.items.length === 0) {
        stack.stacked = false
        stack.el.removeAttribute('data-stacked')
        stack.el.classList.remove('is-expanded')
        if (stack.badge) stack.badge.hidden = true
      } else {
        this.syncStacked(stack)
      }
      this.dequeue(stack)
    })
  }

  /** 关闭一个可见 toast（命令式句柄/抢占/dismiss 统一入口） */
  private closeEl(el: OASToast, trigger: ToastCloseTrigger): void {
    el.close(trigger)
  }

  /** 补位出队：最高优先级优先，同级 FIFO */
  private dequeue(stack: StackState): void {
    if (stack.items.length >= stack.max) return
    if (stack.queue.length === 0) return
    if (!stack.el.isConnected) return
    let best = 0
    for (let i = 1; i < stack.queue.length; i++) {
      if (stack.queue[i]!.priority > stack.queue[best]!.priority) best = i
    }
    const qi = stack.queue.splice(best, 1)[0]!
    this.createAndShow(stack, qi.type, qi.options)
  }

  private lowestPriorityItem(stack: StackState): { el: OASToast; priority: number } | null {
    let lowest: { el: OASToast; priority: number } | null = null
    for (const el of stack.items) {
      const entry = this.entries.get(el)
      if (!entry) continue
      if (!lowest || entry.priority < lowest.priority) {
        lowest = { el, priority: entry.priority }
      }
    }
    return lowest
  }

  private handleFor(el: OASToast): ToastHandle {
    return {
      close: () => this.closeEl(el, 'manual'),
      update: (options: ToastUpdateOptions): ToastHandle => this.updateEntry(el, options),
    }
  }

  private ensureStack(
    position: ToastPosition,
    container?: HTMLElement | (() => HTMLElement),
  ): StackState {
    const target = container
      ? typeof container === 'function'
        ? container()
        : container
      : resolveMessageHost()
    const cached = this.stacks.get(position)
    if (cached && target.contains(cached.el)) return cached
    const el = document.createElement('div')
    el.className = 'oas-toast-stack'
    el.style.cssText = `position: fixed; display: flex; flex-direction: column; pointer-events: none; z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-toast, 1070)); ${positionCss(position)}`
    target.appendChild(el)
    const stack: StackState = {
      el,
      items: [],
      queue: [],
      max: this.defaults.max ?? Infinity,
      stacked: false,
      badge: null,
    }
    this.stacks.set(position, stack)
    return stack
  }

  /** 折叠堆叠同步：data-stacked + +N 徽标（点击徽标持久展开） */
  private syncStacked(stack: StackState): void {
    const stacked = stack.stacked && stack.items.length > 1
    if (stacked) stack.el.setAttribute('data-stacked', 'true')
    else stack.el.removeAttribute('data-stacked')
    if (stacked && !stack.badge) {
      const badge = document.createElement('div')
      badge.className = 'oas-toast-stack-badge'
      badge.addEventListener('click', () => {
        stack.el.classList.toggle('is-expanded')
        this.syncStacked(stack)
      })
      stack.el.appendChild(badge)
      stack.badge = badge
    }
    if (stack.badge) {
      const expanded = stack.el.classList.contains('is-expanded')
      const n = stack.items.length - 1
      stack.badge.textContent = `+${n}`
      stack.badge.hidden = n <= 0 || expanded
    }
  }
}

const toasters = new Map<string, Toaster>()

function getToaster(name: string): Toaster {
  let instance = toasters.get(name)
  if (!instance) {
    instance = new Toaster()
    toasters.set(name, instance)
  }
  return instance
}

const defaultToaster = getToaster('default')

export const toast = {
  info: (options: ToastOptions): ToastHandle => defaultToaster.show('info', options),
  success: (options: ToastOptions): ToastHandle => defaultToaster.show('success', options),
  warning: (options: ToastOptions): ToastHandle => defaultToaster.show('warning', options),
  error: (options: ToastOptions): ToastHandle => defaultToaster.show('error', options),
  loading: (options: ToastOptions): ToastHandle => defaultToaster.show('loading', options),

  /** promise 链：loading → 成功后切 success（3s 自动关）/ 失败后切 error */
  promise: <T>(p: Promise<T>, options: ToastPromiseOptions<T>): ToastHandle => {
    const handle = defaultToaster.show('loading', {
      title: options.loading,
      duration: 0,
      closable: false,
    })
    p.then(
      (data) => {
        const title =
          typeof options.success === 'function' ? options.success(data) : options.success
        handle.update({ type: 'success', title, duration: 3000 })
      },
      (err) => {
        const title = typeof options.error === 'function' ? options.error(err) : options.error
        handle.update({ type: 'error', title, duration: 3000 })
      },
    )
    return handle
  },

  /** 按 id 原位更新已显示/排队中的 toast（key 不存在则新建） */
  update: (id: string, options: ToastUpdateOptions): ToastHandle =>
    defaultToaster.update(id, options),

  /** 按 id 关闭 toast（可见或排队中）；不存在则静默无操作 */
  dismiss: (id: string): void => defaultToaster.dismiss(id),

  /** 全局默认配置：调用参数优先，config 补缺省键（app 白名单配置兜底） */
  config: (options: ToastConfigOptions): void => defaultToaster.config(options),

  /** 命名 toaster 实例：独立栈/队列/配置并行管理（默认 'default' 共享全局 toast） */
  toaster: (name: string): {
    info: (options: ToastOptions) => ToastHandle
    success: (options: ToastOptions) => ToastHandle
    warning: (options: ToastOptions) => ToastHandle
    error: (options: ToastOptions) => ToastHandle
    loading: (options: ToastOptions) => ToastHandle
    update: (id: string, options: ToastUpdateOptions) => ToastHandle
    dismiss: (id: string) => void
    config: (options: ToastConfigOptions) => void
    destroyAll: () => void
  } => {
    const instance = getToaster(name)
    return {
      info: (o) => instance.show('info', o),
      success: (o) => instance.show('success', o),
      warning: (o) => instance.show('warning', o),
      error: (o) => instance.show('error', o),
      loading: (o) => instance.show('loading', o),
      update: (id, o) => instance.update(id, o),
      dismiss: (id) => instance.dismiss(id),
      config: (o) => instance.config(o),
      destroyAll: () => instance.destroyAll(),
    }
  },
}

/** 清空全部实例（默认 + 所有命名实例） */
export function destroyAll(): void {
  for (const instance of toasters.values()) instance.destroyAll()
}
