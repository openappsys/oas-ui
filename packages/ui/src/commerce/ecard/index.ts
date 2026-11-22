import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASECard } from './oas-ecard.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-ecard')) {
  customElements.define('oas-ecard', OASECard)
}

export { OASECard }
export type { ECard, ECardSelection } from './oas-ecard.js'
