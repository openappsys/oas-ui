import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASPasswordStrength, scorePassword } from './oas-password-strength.js'

if (!customElements.get('oas-password-strength')) {
  customElements.define('oas-password-strength', OASPasswordStrength)
}

export { OASPasswordStrength, scorePassword }
