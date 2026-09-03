import { resolveMessageHost } from '../../framework/app/app-host.js'
import { OASDrawer, type DrawerPlacement } from './oas-drawer.js'

export interface DrawerOptions {
  /** 标题文案（缺省则不显示标题） */
  title?: string
  /** 正文内容（纯文本，textContent 写入杜绝 HTML 注入） */
  content?: string
  /** 滑出方向；缺省 right */
  placement?: DrawerPlacement
  /** 主轴尺寸（横向管宽、纵向管高），如 '512px'、'40%' */
  width?: string
  /** 预设档位 small/medium/large 或具体值 */
  size?: string
  /** 确定按钮文案；缺省走 locale `drawer.ok` */
  okText?: string
  /** 取消按钮文案；缺省走 locale `drawer.cancel` */
  cancelText?: string
  /** 隐藏底部操作按钮 */
  noFooter?: boolean
  /** 挂载节点（选择器或 'body'） */
  appendTo?: string
  /**
   * 确定回调：返回 Promise 时确定按钮进入 loading（转圈、禁止重复触发），
   * resolve 后关闭抽屉；reject 清除 loading、抽屉保持打开（可重试或取消）。
   * 同步回调（void）等同无异步，点击确定立即关闭。
   */
  onOk?: () => void | Promise<unknown>
  /** 取消回调：取消按钮 / ✕ / 遮罩点击 / Esc 触发后调用；编程关闭（handle.close / destroyAll）不触发 */
  onCancel?: () => void
}

export interface DrawerHandle {
  /** 编程关闭当前抽屉（不触发 onOk / onCancel，绕过 before-close 拦截；播放关闭动画后销毁） */
  close: () => void
}

interface ActiveEntry {
  el: OASDrawer
  dispose: () => void
}

/** 存活命令式抽屉登记，destroyAll 统一收口 */
const active: ActiveEntry[] = []

/** 非法参数容错：非对象（null / undefined / 原始值 / 数组）一律视为空 options，不抛错 */
function normalizeOptions(options: DrawerOptions | null | undefined | unknown): DrawerOptions {
  if (options != null && typeof options === 'object' && !Array.isArray(options)) {
    return options as DrawerOptions
  }
  return {}
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return value != null && typeof (value as { then?: unknown }).then === 'function'
}

/** 命令式开启抽屉：创建 oas-drawer 并挂载（最近 oas-app 容器，无则回退 document.body） */
export function drawer(rawOptions?: DrawerOptions): DrawerHandle {
  const options = normalizeOptions(rawOptions)
  const el = document.createElement('oas-drawer') as OASDrawer
  el.setAttribute('visible', '')
  if (options.title !== undefined) el.setAttribute('title', options.title)
  if (options.placement !== undefined) el.setAttribute('placement', options.placement)
  if (options.width !== undefined) el.setAttribute('width', options.width)
  if (options.size !== undefined) el.setAttribute('size', options.size)
  if (options.okText !== undefined) el.setAttribute('ok-text', options.okText)
  if (options.cancelText !== undefined) el.setAttribute('cancel-text', options.cancelText)
  if (options.noFooter) el.setAttribute('no-footer', '')
  if (options.appendTo !== undefined) el.setAttribute('append-to', options.appendTo)
  if (options.content !== undefined) {
    const p = document.createElement('p')
    p.textContent = options.content
    el.appendChild(p)
  }
  // 异步 onOk：确定点击不自动关闭，由本模块在 resolve/reject 后决定关闭/保持
  if (options.onOk !== undefined) el.deferOkClose = true
  resolveMessageHost().appendChild(el)

  let disposed = false
  /** 销毁：先走组件关闭路径（移除 visible → 关闭动画 → oas-closed），动画结束再移除 DOM */
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    const doRemove = (): void => {
      el.remove()
      const idx = active.findIndex((e) => e.el === el)
      if (idx >= 0) active.splice(idx, 1)
    }
    // 从未打开 / 已完全关闭：无动画可播，直接移除
    if (!el.hasAttribute('visible') && !el.opened && !el.closing) {
      doRemove()
      return
    }
    if (el.hasAttribute('visible')) el.removeAttribute('visible')
    el.addEventListener('oas-closed', doRemove, { once: true })
  }

  const onOk = (): void => {
    if (disposed) return
    if (el.hasAttribute('ok-loading')) return
    const handler = options.onOk
    if (!handler) {
      dispose()
      return
    }
    el.setAttribute('ok-loading', '')
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
        if (!disposed) el.removeAttribute('ok-loading')
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
  el.addEventListener('oas-close', onCancel)
  active.push({ el, dispose })

  return {
    close: (): void => {
      if (disposed) return
      programmaticClose = true
      el.close()
      // 走 dispose 收尾：等关闭动画结束（oas-closed）后移除 DOM 与登记
      dispose()
    },
  }
}

/** 关闭并销毁全部命令式抽屉实例 */
export function destroyAll(): void {
  while (active.length > 0) {
    active.pop()!.dispose()
  }
}
