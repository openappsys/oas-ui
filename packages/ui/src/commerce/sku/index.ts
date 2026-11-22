import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASSku } from './oas-sku.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-sku')) {
  customElements.define('oas-sku', OASSku)
}

export { OASSku }
export type { SkuChangeDetail, SkuItem, SkuSpecGroup, SkuSpecValue } from './oas-sku.js'
