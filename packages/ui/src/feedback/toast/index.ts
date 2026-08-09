import '@oas-ui/i18n'
import { OASToast, type ToastType } from './oas-toast.js'
import {
  toast,
  destroyAll,
  type ToastHandle,
  type ToastOptions,
  type ToastPosition,
  type ToastPromiseOptions,
  type ToastAction,
} from './toast.js'

if (!customElements.get('oas-toast')) {
  customElements.define('oas-toast', OASToast)
}

export {
  OASToast,
  type ToastType,
  toast,
  destroyAll,
  type ToastHandle,
  type ToastOptions,
  type ToastPosition,
  type ToastPromiseOptions,
  type ToastAction,
}
