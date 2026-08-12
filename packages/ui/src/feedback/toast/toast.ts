import { resolveMessageHost } from '../../floating/app/app-host.js'
import type { OASToast, ToastType } from './oas-toast.js'

export type ToastPosition =
  'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title: string
  description?: string
  action?: ToastAction
  /** 默认 3000ms，0 表示不自动关闭 */
  duration?: number
  /** 默认 true，loading 态强制不可关 */
  closable?: boolean
  /** 默认 top-right */
  position?: ToastPosition
}

export interface ToastHandle {
  close: () => void
}

interface ToastHandleInternal extends ToastHandle {
  element: OASToast
}

/** 每个 position 一个独立栈容器，多开复用单容器 */
const stacks = new Map<ToastPosition, HTMLElement>()

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
    case 'top-right':
    default:
      return 'top: 16px; right: 16px; align-items: flex-end;'
  }
}

function ensureStack(position: ToastPosition): HTMLElement {
  const target = resolveMessageHost()
  const cached = stacks.get(position)
  if (cached && target.contains(cached)) return cached
  const stack = document.createElement('div')
  stack.style.cssText = `position: fixed; display: flex; flex-direction: column; pointer-events: none; z-index: var(--oas-z-toast, 1070); ${positionCss(position)}`
  target.appendChild(stack)
  stacks.set(position, stack)
  return stack
}

function show(type: ToastType, options: ToastOptions): ToastHandleInternal {
  const el = document.createElement('oas-toast') as OASToast
  el.setAttribute('type', type)
  el.setAttribute('title', options.title)
  if (options.description !== undefined) el.setAttribute('description', options.description)
  el.setAttribute('duration', String(options.duration ?? 3000))
  if (options.closable !== false && type !== 'loading') el.setAttribute('closable', '')
  if (options.action) el.action = options.action
  const position = options.position ?? 'top-right'
  ensureStack(position).appendChild(el)
  const close = (): void => {
    el.remove()
  }
  return { close, element: el }
}

export interface ToastPromiseOptions<T = unknown> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((err: unknown) => string)
}

export const toast = {
  info: (options: ToastOptions): ToastHandle => show('info', options),
  success: (options: ToastOptions): ToastHandle => show('success', options),
  warning: (options: ToastOptions): ToastHandle => show('warning', options),
  error: (options: ToastOptions): ToastHandle => show('error', options),
  loading: (options: ToastOptions): ToastHandle => show('loading', options),

  /** promise 链：loading → 成功后切 success（3s 自动关）/ 失败后切 error */
  promise: <T>(p: Promise<T>, options: ToastPromiseOptions<T>): ToastHandle => {
    const handle = show('loading', { title: options.loading, duration: 0, closable: false })
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
}

export function destroyAll(): void {
  for (const stack of stacks.values()) stack.remove()
  stacks.clear()
}
