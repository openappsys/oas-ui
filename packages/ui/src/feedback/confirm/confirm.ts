import { OASModal } from '../modal/oas-modal.js'
import { t } from '@oas-ui/i18n'

export interface ConfirmOptions {
  title?: string
  content?: string
  okText?: string
  cancelText?: string
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
    document.body.appendChild(el)
    // 按钮文案默认走 locale registry（属性 okText/cancelText 可覆盖）
    const okBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="ok"]')
    if (okBtn) okBtn.textContent = options.okText ?? t('confirm.ok')
    const cancelBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="cancel"]')
    if (cancelBtn) cancelBtn.textContent = options.cancelText ?? t('confirm.cancel')

    const cleanup = (): void => {
      el.remove()
      const idx = active.indexOf(el)
      if (idx >= 0) active.splice(idx, 1)
    }
    const onOk = (): void => {
      el.removeEventListener('oas-ok', onOk)
      el.removeEventListener('oas-cancel', onCancel)
      cleanup()
      resolve()
    }
    const onCancel = (): void => {
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

export function destroyAll(): void {
  while (active.length > 0) {
    active[0]!.remove()
    active.shift()
  }
}
