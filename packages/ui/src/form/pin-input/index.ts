import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASPinInput } from './oas-pin-input.js'

if (!customElements.get('oas-pin-input')) {
  customElements.define('oas-pin-input', OASPinInput)
}

export { OASPinInput }
