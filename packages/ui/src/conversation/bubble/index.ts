import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { conversationMessages } from '@oas-ui/i18n/slices/conversation'
registerDefaultMessages(conversationMessages)
import { OASBubble } from './oas-bubble.js'

if (!customElements.get('oas-bubble')) {
  customElements.define('oas-bubble', OASBubble)
}

export { OASBubble }
