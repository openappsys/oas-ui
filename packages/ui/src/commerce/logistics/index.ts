import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASLogistics } from './oas-logistics.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-logistics')) {
  customElements.define('oas-logistics', OASLogistics)
}

export { OASLogistics } from './oas-logistics.js'
export type { LogisticsStep, LogisticsStepState, LogisticsToggleDetail } from './oas-logistics.js'
