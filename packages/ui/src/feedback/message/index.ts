import { OASMessage, type MessageType } from './oas-message.js'
import { message, destroyAll, type MessageHandle } from './message.js'

if (!customElements.get('oas-message')) {
  customElements.define('oas-message', OASMessage)
}

export { OASMessage, type MessageType, message, destroyAll, type MessageHandle }
