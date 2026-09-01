import '@oas-ui/i18n'
import { OASToast, type ToastType, type ToastAction } from './oas-toast.js'
import {
  toast,
  destroyAll,
  type ToastHandle,
  type ToastOptions,
  type ToastConfigOptions,
  type ToastPosition,
  type ToastPromiseOptions,
  type ToastUpdateOptions,
} from './toast.js'

if (!customElements.get('oas-toast')) {
  customElements.define('oas-toast', OASToast)
}

export {
  OASToast,
  type ToastType,
  type ToastAction,
  toast,
  destroyAll,
  type ToastHandle,
  type ToastOptions,
  type ToastConfigOptions,
  type ToastPosition,
  type ToastPromiseOptions,
  type ToastUpdateOptions,
}
