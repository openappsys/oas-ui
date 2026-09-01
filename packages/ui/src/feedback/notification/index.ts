import '@oas-ui/i18n'
import { OASNotification, type NotificationType } from './oas-notification.js'
import {
  notification,
  destroyAll,
  type NotificationOptions,
  type NotificationUpdateOptions,
  type NotificationHandle,
  type NotificationPromiseOptions,
  type NotificationPosition,
  type NotificationPriority,
  type NotificationStackMode,
  type NotificationSize,
} from './notification.js'

if (!customElements.get('oas-notification')) {
  customElements.define('oas-notification', OASNotification)
}

export {
  OASNotification,
  type NotificationType,
  notification,
  destroyAll,
  type NotificationOptions,
  type NotificationUpdateOptions,
  type NotificationHandle,
  type NotificationPromiseOptions,
  type NotificationPosition,
  type NotificationPriority,
  type NotificationStackMode,
  type NotificationSize,
}
