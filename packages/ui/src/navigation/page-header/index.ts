import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASPageHeader } from './oas-page-header.js'

if (!customElements.get('oas-page-header')) {
  customElements.define('oas-page-header', OASPageHeader)
}

export { OASPageHeader }
