import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { basicMessages } from '@oas-ui/i18n/slices/basic'
registerDefaultMessages(basicMessages)
import { OASBadge } from './oas-badge.js'

if (!customElements.get('oas-badge')) {
  customElements.define('oas-badge', OASBadge)
}

export { OASBadge }
