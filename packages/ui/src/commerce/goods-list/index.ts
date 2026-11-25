import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASGoodsList } from './oas-goods-list.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-goods-list')) {
  customElements.define('oas-goods-list', OASGoodsList)
}

export { OASGoodsList } from './oas-goods-list.js'
export type { GoodsItem, GoodsItemClickDetail, GoodsListLayout } from './oas-goods-list.js'
