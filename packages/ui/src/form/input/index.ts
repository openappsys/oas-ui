import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASInput } from './oas-input.js'

if (!customElements.get('oas-input')) {
  customElements.define('oas-input', OASInput)
}

export { OASInput }
