import { resolveMessageHost } from '../../floating/app/app-host.js'
import type { OASMessage, MessageType } from './oas-message.js'

let stackEl: HTMLElement | null = null

function ensureStack(): HTMLElement {
  const target = resolveMessageHost()
  if (stackEl && target.contains(stackEl)) return stackEl
  stackEl = document.createElement('div')
  stackEl.style.cssText =
    'position: fixed; top: 16px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; z-index: var(--oas-z-message, 1060);'
  target.appendChild(stackEl)
  return stackEl
}

export interface MessageOptions {
  /** 自定义时长；默认 3000ms，0 表示不自动关闭 */
  duration?: number
  /** 分组标识：同 group 消息合并为一条，重复触发递增计数 */
  group?: string
  /** 唯一标识：供 message.update / message.destroy 定位；同 key 再次调用视为更新 */
  key?: string
  /** 关闭回调（自动关闭 / 关闭按钮 / destroy 都会触发一次） */
  onClose?: () => void
}

export interface MessageUpdateOptions {
  content: string
  type?: MessageType
  duration?: number
  onClose?: () => void
}

export interface MessageHandle {
  close: () => void
}

interface MessageEntry {
  el: OASMessage
  content: string
  count: number
  key?: string
  group?: string
  onClose?: () => void
}

/** 存活消息登记（element → entry），关闭时统一清理 */
const entries = new Map<OASMessage, MessageEntry>()
const keyMap = new Map<string, OASMessage>()
const groupMap = new Map<string, OASMessage>()

/** 第二参数兼容数字时长（旧 API message.info(content, duration)）与 options 对象 */
function normalizeOptions(durationOrOptions?: number | MessageOptions): MessageOptions {
  if (typeof durationOrOptions === 'number') return { duration: durationOrOptions }
  return durationOrOptions ?? {}
}

function handle(el: OASMessage): MessageHandle {
  return { close: () => el.close() }
}

/** 监听 oas-close：清理登记并触发 onClose（组件自动关闭/关闭按钮/命令式 close 统一收口） */
function track(el: OASMessage, entry: MessageEntry): void {
  el.addEventListener('oas-close', () => {
    if (entry.key) keyMap.delete(entry.key)
    if (entry.group) groupMap.delete(entry.group)
    entries.delete(el)
    entry.onClose?.()
  })
}

/** key 命中：刷新内容/类型/时长，计数重置为 1，按需迁移 group */
function updateByKey(
  entry: MessageEntry,
  type: MessageType,
  content: string,
  options: MessageOptions,
): MessageHandle {
  const { el } = entry
  entry.content = content
  entry.onClose = options.onClose ?? entry.onClose
  if (options.group && options.group !== entry.group) {
    if (entry.group) groupMap.delete(entry.group)
    entry.group = options.group
    groupMap.set(options.group, el)
    el.setAttribute('group', options.group)
  }
  el.refresh(content, type, options.duration, 1)
  return handle(el)
}

/** group 命中：内容相同计数 +1，否则替换内容并重置计数 */
function mergeByGroup(
  entry: MessageEntry,
  type: MessageType,
  content: string,
  options: MessageOptions,
): MessageHandle {
  const { el } = entry
  const count = entry.content === content ? entry.count + 1 : 1
  entry.content = content
  entry.count = count
  entry.onClose = options.onClose ?? entry.onClose
  if (options.key && options.key !== entry.key) {
    if (entry.key) keyMap.delete(entry.key)
    entry.key = options.key
    keyMap.set(options.key, el)
    el.setAttribute('key', options.key)
  }
  el.refresh(content, type, options.duration, count)
  return handle(el)
}

function show(
  type: MessageType,
  content: string,
  durationOrOptions?: number | MessageOptions,
): MessageHandle {
  const options = normalizeOptions(durationOrOptions)
  // key 命中 → 更新现有消息（内容/类型替换，计数重置）
  if (options.key) {
    const existing = keyMap.get(options.key)
    if (existing && existing.isConnected) {
      return updateByKey(entries.get(existing)!, type, content, options)
    }
  }
  // group 命中 → 合并（内容相同递增计数，否则替换）
  if (options.group) {
    const existing = groupMap.get(options.group)
    if (existing && existing.isConnected) {
      return mergeByGroup(entries.get(existing)!, type, content, options)
    }
  }
  const el = document.createElement('oas-message') as OASMessage
  el.setAttribute('type', type)
  el.setAttribute('duration', String(options.duration ?? 3000))
  if (options.group) el.setAttribute('group', options.group)
  if (options.key) el.setAttribute('key', options.key)
  el.textContent = content
  const entry: MessageEntry = {
    el,
    content,
    count: 1,
    key: options.key,
    group: options.group,
    onClose: options.onClose,
  }
  track(el, entry)
  entries.set(el, entry)
  if (entry.key) keyMap.set(entry.key, el)
  if (entry.group) groupMap.set(entry.group, el)
  ensureStack().appendChild(el)
  return handle(el)
}

export const message = {
  info: (content: string, options?: number | MessageOptions): MessageHandle =>
    show('info', content, options),
  success: (content: string, options?: number | MessageOptions): MessageHandle =>
    show('success', content, options),
  warning: (content: string, options?: number | MessageOptions): MessageHandle =>
    show('warning', content, options),
  error: (content: string, options?: number | MessageOptions): MessageHandle =>
    show('error', content, options),

  /** 更新已存在消息的内容/类型/时长（key 定位，计数重置）；key 不存在则新建 */
  update: (key: string, options: MessageUpdateOptions): MessageHandle => {
    const existing = keyMap.get(key)
    if (existing && existing.isConnected) {
      const entry = entries.get(existing)!
      entry.content = options.content
      entry.onClose = options.onClose ?? entry.onClose
      existing.refresh(options.content, options.type, options.duration, 1)
      return handle(existing)
    }
    return show(options.type ?? 'info', options.content, { key, duration: options.duration })
  },

  /** 关闭指定 key 的消息；不存在则静默无操作 */
  destroy: (key: string): void => {
    const existing = keyMap.get(key)
    if (existing && existing.isConnected) existing.close()
  },
}

export function destroyAll(): void {
  entries.clear()
  keyMap.clear()
  groupMap.clear()
  if (stackEl) stackEl.remove()
  stackEl = null
}
