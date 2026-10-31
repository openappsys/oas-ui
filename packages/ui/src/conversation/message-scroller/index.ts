import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { conversationMessages } from '@oas-ui/i18n/slices/conversation'
registerDefaultMessages(conversationMessages)
import { OASMessageScroller } from './oas-message-scroller.js'

if (!customElements.get('oas-message-scroller')) {
  customElements.define('oas-message-scroller', OASMessageScroller)
}

export { OASMessageScroller }
