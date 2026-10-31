import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASAlert } from './oas-alert.js'

if (!customElements.get('oas-alert')) {
  customElements.define('oas-alert', OASAlert)
}

export { OASAlert }
