import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASCodeButton } from './oas-code-button.js'

if (!customElements.get('oas-code-button')) {
  customElements.define('oas-code-button', OASCodeButton)
}

export { OASCodeButton }
