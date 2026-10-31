import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASInputNumber } from './oas-input-number.js'

if (!customElements.get('oas-input-number')) {
  customElements.define('oas-input-number', OASInputNumber)
}

export { OASInputNumber }
