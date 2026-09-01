import '@oas-ui/i18n'
import { OASMessage, type MessageType } from './oas-message.js'
import {
  message,
  destroyAll,
  type MessageHandle,
  type MessageOptions,
  type MessageUpdateOptions,
} from './message.js'
import type { MessageCloseSource, MessageContent, CustomMessageType } from './oas-message.js'
import type { MessagePlacement, MessagePromiseOptions } from './message.js'

if (!customElements.get('oas-message')) {
  customElements.define('oas-message', OASMessage)
}

export {
  OASMessage,
  type MessageType,
  message,
  destroyAll,
  type MessageHandle,
  type MessageOptions,
  type MessageUpdateOptions,
  type MessageCloseSource,
  type MessageContent,
  type MessagePlacement,
  type MessagePromiseOptions,
  type CustomMessageType,
}
