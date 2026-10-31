import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASSpin } from './oas-spin.js'

if (!customElements.get('oas-spin')) {
  customElements.define('oas-spin', OASSpin)
}

export { OASSpin }
