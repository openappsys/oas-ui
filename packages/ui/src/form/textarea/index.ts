import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASTextarea } from './oas-textarea.js'

if (!customElements.get('oas-textarea')) {
  customElements.define('oas-textarea', OASTextarea)
}

export { OASTextarea }
