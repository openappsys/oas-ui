import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASOrderList } from './oas-order-list.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-order-list')) {
  customElements.define('oas-order-list', OASOrderList)
}

export { OASOrderList } from './oas-order-list.js'
export type { OrderTab, OrderTabChangeDetail } from './oas-order-list.js'
