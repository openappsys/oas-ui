import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASPagination } from './oas-pagination.js'

if (!customElements.get('oas-pagination')) {
  customElements.define('oas-pagination', OASPagination)
}

export { OASPagination }
