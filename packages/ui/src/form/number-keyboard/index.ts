import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASNumberKeyboard } from './oas-number-keyboard.js'

if (!customElements.get('oas-number-keyboard')) {
  customElements.define('oas-number-keyboard', OASNumberKeyboard)
}

export { OASNumberKeyboard }
