import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASBackdrop } from './oas-backdrop.js'

if (!customElements.get('oas-backdrop')) {
  customElements.define('oas-backdrop', OASBackdrop)
}

export { OASBackdrop }
