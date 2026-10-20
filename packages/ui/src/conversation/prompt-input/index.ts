import '@oas-ui/i18n'
import { OASPromptInput } from './oas-prompt-input.js'

if (!customElements.get('oas-prompt-input')) {
  customElements.define('oas-prompt-input', OASPromptInput)
}

export { OASPromptInput }
export type { PromptInputSuggestion, PromptInputSubmitDetail, PromptInputSuggestionDetail } from './oas-prompt-input.js'
