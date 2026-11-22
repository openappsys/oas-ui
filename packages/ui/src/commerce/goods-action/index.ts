import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASGoodsAction } from './oas-goods-action.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-goods-action')) {
  customElements.define('oas-goods-action', OASGoodsAction)
}

export { OASGoodsAction }
