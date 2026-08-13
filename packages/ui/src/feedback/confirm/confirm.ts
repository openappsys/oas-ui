import { OASModal } from '../modal/oas-modal.js'
import { t } from '@oas-ui/i18n'

export interface ConfirmOptions {
  title?: string
  content?: string
  okText?: string
  cancelText?: string
  /**
   * 确定回调：返回 Promise 时确认框进入 loading 态（OK 按钮转圈、禁止重复触发），
   * resolve 后关闭并 resolve 外层 Promise；reject 时清除 loading 保持打开（可重试或取消），
   * 外层 Promise 不 settle。同步回调等同无异步，立即关闭。
   */
  onOk?: () => void | Promise<void>
}

const active: OASModal[] = []

export function confirm(options: ConfirmOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('oas-modal') as OASModal
    el.setAttribute('visible', '')
    if (options.title !== undefined) el.setAttribute('title', options.title)
    if (options.content !== undefined) {
      const p = document.createElement('p')
      p.textContent = options.content
      el.appendChild(p)
    }
    // 异步 onOk：确定点击不自动关闭，由本模块在 onOk resolve/reject 后决定关闭/保持
    if (options.onOk !== undefined) el.deferOkClose = true
    document.body.appendChild(el)
    // 按钮文案默认走 locale registry（属性 okText/cancelText 可覆盖）
    const okLabel = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"] .ok-label')
    if (okLabel) okLabel.textContent = options.okText ?? t('confirm.ok')
    const cancelBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')
    if (cancelBtn) cancelBtn.textContent = options.cancelText ?? t('confirm.cancel')

    let settled = false

    const cleanup = (): void => {
      el.remove()
      const idx = active.indexOf(el)
      if (idx >= 0) active.splice(idx, 1)
    }
    const onOk = (): void => {
      if (settled) return
      if (el.hasAttribute('loading')) return
      const handler = options.onOk
      if (!handler) {
        settled = true
        cleanup()
        resolve()
        return
      }
      el.setAttribute('loading', '')
      const result = handler()
      if (!isPromiseLike(result)) {
        // 同步回调：等同无异步，直接关闭
        settled = true
        cleanup()
        resolve()
        return
      }
      result.then(
        () => {
          if (settled) return
          settled = true
          cleanup()
          resolve()
        },
        () => {
          // 失败：清除 loading 保持打开，可重试或取消（外层不 settle）
          if (settled) return
          el.removeAttribute('loading')
        },
      )
    }
    const onCancel = (): void => {
      if (settled) return
      settled = true
      el.removeEventListener('oas-ok', onOk)
      el.removeEventListener('oas-cancel', onCancel)
      cleanup()
      reject(new Error('cancelled'))
    }
    el.addEventListener('oas-ok', onOk)
    el.addEventListener('oas-cancel', onCancel)
    active.push(el)
  })
}

function isPromiseLike(value: void | Promise<void>): value is Promise<void> {
  return value != null && typeof (value as Promise<void>).then === 'function'
}

export function destroyAll(): void {
  while (active.length > 0) {
    active[0]!.remove()
    active.shift()
  }
}
