import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASSteps, type StepItem } from './oas-steps.js'

if (!customElements.get('oas-steps')) {
  customElements.define('oas-steps', OASSteps)
}

export { OASSteps, type StepItem }
