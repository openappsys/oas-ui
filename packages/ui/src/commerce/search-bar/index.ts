import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASSearchBar } from './oas-search-bar.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-search-bar')) {
  customElements.define('oas-search-bar', OASSearchBar)
}

export { OASSearchBar } from './oas-search-bar.js'
export type { SearchDetail, CancelDetail } from './oas-search-bar.js'
