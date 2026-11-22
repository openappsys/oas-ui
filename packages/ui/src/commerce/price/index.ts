import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASPrice } from './oas-price.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-price')) {
  customElements.define('oas-price', OASPrice)
}

export { OASPrice }
