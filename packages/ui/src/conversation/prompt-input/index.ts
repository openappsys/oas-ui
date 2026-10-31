import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { conversationMessages } from '@oas-ui/i18n/slices/conversation'
registerDefaultMessages(conversationMessages)
import { OASPromptInput } from './oas-prompt-input.js'

if (!customElements.get('oas-prompt-input')) {
  customElements.define('oas-prompt-input', OASPromptInput)
}

export { OASPromptInput }
export type { PromptInputSuggestion, PromptInputSubmitDetail, PromptInputSuggestionDetail } from './oas-prompt-input.js'
