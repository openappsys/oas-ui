import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASBackTop } from './oas-back-top.js'

if (!customElements.get('oas-back-top')) {
  customElements.define('oas-back-top', OASBackTop)
}

export { OASBackTop }
