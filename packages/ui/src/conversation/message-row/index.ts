import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { conversationMessages } from '@oas-ui/i18n/slices/conversation'
registerDefaultMessages(conversationMessages)
import { OASMessageRow } from './oas-message-row.js'

if (!customElements.get('oas-message-row')) {
  customElements.define('oas-message-row', OASMessageRow)
}

export { OASMessageRow }
