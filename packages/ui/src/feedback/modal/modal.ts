import { resolveMessageHost } from '../../floating/app/app-host.js'
import { OASModal, type ModalVariant } from './oas-modal.js'

export interface ModalOptions {
  /** 标题文案（缺省则不显示标题） */
  title?: string
  /** 正文内容（纯文本，textContent 写入杜绝 HTML 注入） */
  content?: string
  /** 确定按钮文案；缺省走 locale `modal.ok` */
  okText?: string
  /** 取消按钮文案；缺省走 locale `modal.cancel` */
  cancelText?: string
  /**
   * 确定回调：返回 Promise 时 OK 按钮进入 loading（转圈、禁止重复触发），
   * resolve 后关闭对话框；reject 清除 loading、对话框保持打开（可重试或取消）。
   * 同步回调（void）等同无异步，点击确定立即关闭。
   */
  onOk?: () => void | Promise<unknown>
  /** 取消回调：取消按钮 / ✕ / 遮罩点击 / Esc 触发后调用；编程关闭（handle.close / destroyAllModal）不触发 */
  onCancel?: () => void
}

export interface ModalHandle {
  /** 编程关闭当前确认框（不触发 onOk / onCancel） */
  close: () => void
}

interface ActiveEntry {
  el: OASModal
  dispose: () => void
}

/** 存活命令式确认框登记，destroyAllModal 统一收口 */
const active: ActiveEntry[] = []

/** 非法参数容错：非对象（null / undefined / 原始值 / 数组）一律视为空 options，不抛错 */
function normalizeOptions(options: ModalOptions | null | undefined | unknown): ModalOptions {
  if (options != null && typeof options === 'object' && !Array.isArray(options)) {
    return options as ModalOptions
  }
  return {}
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return value != null && typeof (value as { then?: unknown }).then === 'function'
}

function open(variant: ModalVariant | '', rawOptions?: ModalOptions): ModalHandle {
  const options = normalizeOptions(rawOptions)
  const el = document.createElement('oas-modal') as OASModal
  el.setAttribute('visible', '')
  // 语义变体：对应图标 + 单「确定」按钮（取消按钮隐藏）
  if (variant) {
    el.setAttribute('type', variant)
    el.setAttribute('no-cancel', '')
  }
  // 命令式确认框：打开聚焦「确定」按钮（语义变体的唯一按钮）
  el.setAttribute('focus-ok', '')
  if (options.title !== undefined) el.setAttribute('title', options.title)
  if (options.okText !== undefined) el.setAttribute('ok-text', options.okText)
  if (options.cancelText !== undefined) el.setAttribute('cancel-text', options.cancelText)
  if (options.content !== undefined) {
    const p = document.createElement('p')
    p.textContent = options.content
    el.appendChild(p)
  }
  // 异步 onOk：确定点击不自动关闭，由本模块在 resolve/reject 后决定关闭/保持
  if (options.onOk !== undefined) el.deferOkClose = true
  // 挂最近 oas-app 容器（与消息族同通道），无则回退 document.body
  resolveMessageHost().appendChild(el)

  let disposed = false
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    // 仍可见时先移除 visible：触发组件 update() 还原来源焦点，再销毁 DOM
    if (el.hasAttribute('visible')) el.removeAttribute('visible')
    el.remove()
    const idx = active.findIndex((e) => e.el === el)
    if (idx >= 0) active.splice(idx, 1)
  }

  const onOk = (): void => {
    if (disposed) return
    if (el.hasAttribute('loading')) return
    const handler = options.onOk
    if (!handler) {
      dispose()
      return
    }
    el.setAttribute('loading', '')
    const result = handler()
    if (!isPromiseLike(result)) {
      // 同步回调：等同无异步，立即关闭
      dispose()
      return
    }
    result.then(
      () => dispose(),
      () => {
        // 失败：清除 loading 保持打开，可重试或取消
        if (!disposed) el.removeAttribute('loading')
      },
    )
  }

  let programmaticClose = false
  const onCancel = (): void => {
    if (disposed) return
    if (!programmaticClose) options.onCancel?.()
    dispose()
  }

  el.addEventListener('oas-ok', onOk)
  el.addEventListener('oas-cancel', onCancel)
  active.push({ el, dispose })

  return {
    close: (): void => {
      if (disposed) return
      programmaticClose = true
      // 走组件 close 路径：移除 visible（还原来源焦点）→ 派发 oas-cancel → 清理
      el.close('cancel')
    },
  }
}

export const modal = {
  /** 确认框：标题 + 内容 + 确定/取消双按钮 */
  confirm: (options?: ModalOptions): ModalHandle => open('', options),
  /** 信息确认框：info 图标 + 单「确定」按钮 */
  info: (options?: ModalOptions): ModalHandle => open('info', options),
  /** 成功确认框：success 图标 + 单「确定」按钮 */
  success: (options?: ModalOptions): ModalHandle => open('success', options),
  /** 警告确认框：warning 图标 + 单「确定」按钮 */
  warning: (options?: ModalOptions): ModalHandle => open('warning', options),
  /** 错误确认框：error 图标 + 单「确定」按钮 */
  error: (options?: ModalOptions): ModalHandle => open('error', options),
}

/** 关闭并销毁全部命令式确认框实例 */
export function destroyAll(): void {
  while (active.length > 0) {
    active.pop()!.dispose()
  }
}
