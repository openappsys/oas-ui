import { OASNotification, type NotificationType } from './oas-notification.js'
import { notification, destroyAll, type NotificationOptions } from './notification.js'

if (!customElements.get('oas-notification')) {
  customElements.define('oas-notification', OASNotification)
}

export { OASNotification, type NotificationType, notification, destroyAll, type NotificationOptions }
