import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASOrderCard } from './oas-order-card.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-order-card')) {
  customElements.define('oas-order-card', OASOrderCard)
}

export { OASOrderCard } from './oas-order-card.js'
export type {
  OrderCardItem,
  OrderStatusMap,
  OrderStatusStyle,
  OrderStatusTone,
  OrderToggleDetail,
} from './oas-order-card.js'
