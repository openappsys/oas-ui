import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASCategory } from './oas-category.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-category')) {
  customElements.define('oas-category', OASCategory)
}

export { OASCategory }
export type { CategoryItem, CategoryNode } from './oas-category.js'
