import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASTour, type TourStep } from './oas-tour.js'

if (!customElements.get('oas-tour')) {
  customElements.define('oas-tour', OASTour)
}

export { OASTour, type TourStep }
