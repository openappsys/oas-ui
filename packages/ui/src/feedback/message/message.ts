import { resolveMessageHost, getAppMessageConfig } from '../../floating/app/app-host.js'
import type {
  OASMessage,
  MessageType,
  MessageContent,
  CustomMessageType,
} from './oas-message.js'
import { registerMessageType, getCustomMessageType } from './oas-message.js'

export type MessagePlacement = 'top' | 'bottom'

export interface MessageOptions {
  /** 自定义时长；默认 3000ms，0 表示不自动关闭（loading 类型默认 0 不自动关） */
  duration?: number
  /** 分组标识：同 group 消息合并为一条，重复触发递增计数 */
  group?: string
  /** 唯一标识：供 message.update / message.destroy 定位；同 key 再次调用视为更新 */
  key?: string
  /** 关闭回调（自动关闭 / 关闭按钮 / destroy / 挤出都会触发一次） */
  onClose?: () => void
  /** 是否可手动关闭，默认 true（loading 恒不可关） */
  closable?: boolean
  /** 悬停/焦点暂停自动关闭计时，默认 true */
  pauseOnHover?: boolean
  /** 消息位置：top（默认）或 bottom；center/角落归 toast 形态 */
  placement?: MessagePlacement
  /** 栈偏移量（px），默认 16 */
  offset?: number
  /** 栈上限：超出时丢最旧派（首个消息先关闭），默认不限 */
  max?: number
  /** 类型图标名（lookupIcon 查表通道），覆盖类型默认图标 */
  icon?: string
  /** 是否显示类型图标，默认 true */
  showIcon?: boolean
  /** 显示自动关闭倒计时进度条 */
  showProgress?: boolean
  /** 重复计数徽标：true 跟随合并计数展示；数字为静态徽标值 */
  repeatNum?: boolean | number
  /** 遮罩：全屏遮罩 + 点击遮罩关闭 */
  mask?: boolean
  /** 点击消息体回调（触发后以 click 来源关闭） */
  onClick?: () => void
  /** 头像 Node（渲染进 avatar 区；声明式走 slot="avatar"） */
  avatar?: Node
  /** 自定义 spinner：图标名（查表）或 Node；仅 loading 类型生效 */
  spinner?: string | Node
}

export interface MessageUpdateOptions {
  content: MessageContent
  type?: MessageType
  duration?: number
  onClose?: () => void
}

export interface MessageHandle {
  close: () => void
  /** 暂停自动关闭计时（剩余时长记账） */
  pause: () => void
  /** 恢复自动关闭计时（剩余时长续走） */
  resume: () => void
}

export interface MessagePromiseOptions<T = unknown> {
  loading: MessageContent
  success: MessageContent | ((data: T) => MessageContent)
  error: MessageContent | ((err: unknown) => MessageContent)
}

interface MessageEntry {
  el: OASMessage
  content: MessageContent
  count: number
  key?: string
  group?: string
  onClose?: () => void
  /** repeatNum 原始选项：true=徽标跟随合并计数；number=静态徽标 */
  repeatNum?: boolean | number
}

/** 存活消息登记（element → entry），关闭时统一清理 */
const entries = new Map<OASMessage, MessageEntry>()
const keyMap = new Map<string, OASMessage>()
const groupMap = new Map<string, OASMessage>()

/** 每个 placement 一个独立栈容器，多开复用单容器 */
const stacks = new Map<MessagePlacement, HTMLElement>()

/** 第二参数兼容数字时长（旧 API message.info(content, duration)）与 options 对象 */
function normalizeOptions(durationOrOptions?: number | MessageOptions): MessageOptions {
  if (typeof durationOrOptions === 'number') return { duration: durationOrOptions }
  return durationOrOptions ?? {}
}

function handle(el: OASMessage): MessageHandle {
  return {
    close: () => el.close('destroy'),
    pause: () => el.pause(),
    resume: () => el.resume(),
  }
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

function ensureStack(placement: MessagePlacement, offset: number): HTMLElement {
  const target = resolveMessageHost()
  const cached = stacks.get(placement)
  if (cached && target.contains(cached)) {
    // 复用容器：偏移/朝向变化幂等刷新（同 placement 语义一致时无副作用）
    const side = placement === 'top' ? 'top' : 'bottom'
    cached.style.setProperty(side, `${offset}px`)
    cached.style.flexDirection = placement === 'top' ? 'column' : 'column-reverse'
    return cached
  }
  const stack = document.createElement('div')
  const side = placement === 'top' ? 'top' : 'bottom'
  stack.style.cssText = `position: fixed; ${side}: ${offset}px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: ${placement === 'top' ? 'column' : 'column-reverse'}; align-items: center; pointer-events: none; z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-message, 1060));`
  target.appendChild(stack)
  stacks.set(placement, stack)
  return stack
}

/** max 上限：栈内活跃（未进入关闭流程）消息数超出时丢最旧派 */
function enforceMax(stack: HTMLElement, max?: number): void {
  if (!max || max < 1) return
  const active = Array.from(stack.querySelectorAll<OASMessage>('oas-message')).filter(
    (el) => !el.closed,
  )
  while (active.length > max) {
    active.shift()!.close('destroy')
  }
}

/**
 * 与最近 app 宿主注册的 message 全局默认配置合并：调用参数优先，app 默认仅补缺省键。
 * 键集对齐 MessageOptions 中可作为全局默认的键（group/key 是运行时标识、onClose/onClick
 * 是函数、avatar/spinner/content 是内容，JSON 无法表达，不纳入）；
 * app 配置由 <oas-app> 属性解析白名单兜底。
 */
function mergeAppConfig(options: MessageOptions): MessageOptions {
  const appConfig = getAppMessageConfig()
  if (!appConfig) return options
  const merged: MessageOptions = { ...options }
  if (merged.duration === undefined && typeof appConfig.duration === 'number') {
    merged.duration = appConfig.duration
  }
  if (merged.closable === undefined && typeof appConfig.closable === 'boolean') {
    merged.closable = appConfig.closable
  }
  if (merged.pauseOnHover === undefined && typeof appConfig.pauseOnHover === 'boolean') {
    merged.pauseOnHover = appConfig.pauseOnHover
  }
  if (
    merged.placement === undefined &&
    (appConfig.placement === 'top' || appConfig.placement === 'bottom')
  ) {
    merged.placement = appConfig.placement
  }
  if (merged.offset === undefined && typeof appConfig.offset === 'number') {
    merged.offset = appConfig.offset
  }
  if (merged.max === undefined && typeof appConfig.max === 'number') {
    merged.max = appConfig.max
  }
  if (merged.showProgress === undefined && typeof appConfig.showProgress === 'boolean') {
    merged.showProgress = appConfig.showProgress
  }
  if (merged.showIcon === undefined && typeof appConfig.showIcon === 'boolean') {
    merged.showIcon = appConfig.showIcon
  }
  if (merged.mask === undefined && typeof appConfig.mask === 'boolean') {
    merged.mask = appConfig.mask
  }
  if (merged.repeatNum === undefined && typeof appConfig.repeatNum === 'number') {
    merged.repeatNum = appConfig.repeatNum
  }
  return merged
}

/** key 命中：刷新内容/类型/时长，计数重置为 1，按需迁移 group */
function updateByKey(
  entry: MessageEntry,
  type: MessageType,
  content: MessageContent,
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
  content: MessageContent,
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
  // repeatNum=true（徽标跟随合并计数）时徽标随 count 更新
  if (entry.repeatNum === true) el.setAttribute('repeat-num', String(count))
  el.refresh(content, type, options.duration, count)
  return handle(el)
}

function show(
  type: string,
  content: MessageContent,
  durationOrOptions?: number | MessageOptions,
): MessageHandle {
  const options = mergeAppConfig(normalizeOptions(durationOrOptions))
  // key 命中 → 更新现有消息（内容/类型替换，计数重置）
  if (options.key) {
    const existing = keyMap.get(options.key)
    if (existing && existing.isConnected) {
      return updateByKey(entries.get(existing)!, type as MessageType, content, options)
    }
  }
  // group 命中 → 合并（内容相同递增计数，否则替换）
  if (options.group) {
    const existing = groupMap.get(options.group)
    if (existing && existing.isConnected) {
      return mergeByGroup(entries.get(existing)!, type as MessageType, content, options)
    }
  }
  // 未注册的自定义类型：dev 告警 + 按 info 兜底渲染（元素侧无图标/配色配置）
  const isBuiltin = new Set(['info', 'success', 'warning', 'error', 'loading', 'question'])
  if (!isBuiltin.has(type) && !getCustomMessageType(type)) {
    console.warn(`[oas-message] 未注册的消息类型 "${type}"，将以 info 兜底渲染；请先 message.registerType`)
  }
  const el = document.createElement('oas-message') as OASMessage
  el.setAttribute('type', type)
  el.setAttribute(
    'duration',
    String(options.duration ?? (type === 'loading' ? 0 : 3000)),
  )
  if (options.closable === false) el.setAttribute('closable', 'false')
  if (options.group) el.setAttribute('group', options.group)
  if (options.key) el.setAttribute('key', options.key)
  if (options.icon) el.setAttribute('icon', options.icon)
  if (options.showIcon === false) el.setAttribute('show-icon', 'false')
  if (options.pauseOnHover === false) el.setAttribute('pause-on-hover', 'false')
  const placement = options.placement ?? 'top'
  el.setAttribute('placement', placement)
  if (options.showProgress) el.setAttribute('show-progress', '')
  if (options.repeatNum !== undefined) {
    el.setAttribute('repeat-num', options.repeatNum === true ? '' : String(options.repeatNum))
  }
  if (options.mask) el.setAttribute('mask', '')
  if (typeof content === 'string') {
    el.textContent = content
    el.contentNode = null
  } else {
    el.contentNode = content
    el.textContent = ''
  }
  if (options.avatar) el.avatarNode = options.avatar
  if (typeof options.spinner === 'string') el.spinnerIcon = options.spinner
  else if (options.spinner) el.spinnerNode = options.spinner
  el.onClick = options.onClick ?? null
  const entry: MessageEntry = {
    el,
    content,
    count: 1,
    key: options.key,
    group: options.group,
    onClose: options.onClose,
    repeatNum: options.repeatNum,
  }
  track(el, entry)
  entries.set(el, entry)
  if (entry.key) keyMap.set(entry.key, el)
  if (entry.group) groupMap.set(entry.group, el)
  const stack = ensureStack(placement, options.offset ?? 16)
  stack.appendChild(el)
  enforceMax(stack, options.max)
  return handle(el)
}

export const message = {
  info: (content: MessageContent, options?: number | MessageOptions): MessageHandle =>
    show('info', content, options),
  success: (content: MessageContent, options?: number | MessageOptions): MessageHandle =>
    show('success', content, options),
  warning: (content: MessageContent, options?: number | MessageOptions): MessageHandle =>
    show('warning', content, options),
  error: (content: MessageContent, options?: number | MessageOptions): MessageHandle =>
    show('error', content, options),
  /** 疑问类型（问号图标 + primary 配色） */
  question: (content: MessageContent, options?: number | MessageOptions): MessageHandle =>
    show('question', content, options),
  /** 加载态（默认不自动关、不可关），配 update/destroy 收尾组成轻量异步流 */
  loading: (content: MessageContent, options?: number | MessageOptions): MessageHandle =>
    show('loading', content, options),
  /** 通用入口：type 可为内置类型或 registerType 注册的自定义类型 */
  show: (type: string, content: MessageContent, options?: number | MessageOptions): MessageHandle =>
    show(type, content, options),

  /** 更新已存在消息的内容/类型/时长（key 定位，计数重置）；key 不存在则新建 */
  update: (key: string, options: MessageUpdateOptions): MessageHandle => {
    const existing = keyMap.get(key)
    if (existing && existing.isConnected) {
      const entry = entries.get(existing)!
      entry.content = options.content
      entry.onClose = options.onClose ?? entry.onClose
      existing.refresh(
        options.content,
        options.type,
        options.duration,
        1,
      )
      return handle(existing)
    }
    return show(options.type ?? 'info', options.content, {
      key,
      duration: options.duration,
    })
  },

  /** 关闭指定 key 的消息；不存在则静默无操作 */
  destroy: (key: string): void => {
    const existing = keyMap.get(key)
    if (existing && existing.isConnected) existing.close('destroy')
  },

  /** promise 链：loading（key 定位）→ 成功后切 success（3s 自动关）/ 失败后切 error */
  promise: <T>(p: Promise<T>, options: MessagePromiseOptions<T>): MessageHandle => {
    const key = `oas-msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    const handle = show('loading', options.loading, { key, duration: 0 })
    p.then(
      (data) => {
        const content =
          typeof options.success === 'function' ? options.success(data) : options.success
        message.update(key, { content, type: 'success', duration: 3000 })
      },
      (err) => {
        const content =
          typeof options.error === 'function' ? options.error(err) : options.error
        message.update(key, { content, type: 'error', duration: 3000 })
      },
    )
    return handle
  },

  /** 注册自定义消息类型（图标/配色/可关性），注册后 show(type) 与声明式均生效 */
  registerType: (name: string, config: CustomMessageType): void =>
    registerMessageType(name, config),
}

export function destroyAll(): void {
  entries.clear()
  keyMap.clear()
  groupMap.clear()
  for (const stack of stacks.values()) stack.remove()
  stacks.clear()
}
