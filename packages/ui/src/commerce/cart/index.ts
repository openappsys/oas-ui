import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASCart } from './oas-cart.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-cart')) {
  customElements.define('oas-cart', OASCart)
}

export { OASCart } from './oas-cart.js'
export type {
  CartChangeDetail,
  CartDeleteMode,
  CartItem,
  CartItemClickDetail,
  CartItemsSnapshot,
  CartRemoveDetail,
} from './oas-cart.js'
