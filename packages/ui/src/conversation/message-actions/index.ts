import { OASMessageActions } from './oas-message-actions.js'

if (!customElements.get('oas-message-actions')) {
  customElements.define('oas-message-actions', OASMessageActions)
}

export { OASMessageActions }
export type { MessageAction, MessageActionDetail, MessageActionTone } from './oas-message-actions.js'
