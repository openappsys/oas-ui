import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASProductCard } from './oas-product-card.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-product-card')) {
  customElements.define('oas-product-card', OASProductCard)
}

export { OASProductCard } from './oas-product-card.js'
export type { ProductCardLayout } from './oas-product-card.js'
