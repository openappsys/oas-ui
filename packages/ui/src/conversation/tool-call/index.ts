import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { conversationMessages } from '@oas-ui/i18n/slices/conversation'
registerDefaultMessages(conversationMessages)
import { OASToolCall } from './oas-tool-call.js'

if (!customElements.get('oas-tool-call')) {
  customElements.define('oas-tool-call', OASToolCall)
}

export { OASToolCall }
export type { ToolCallStatus, ToolCallToggleDetail } from './oas-tool-call.js'
