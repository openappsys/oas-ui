import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASAvatar } from './oas-avatar.js'

if (!customElements.get('oas-avatar')) {
  customElements.define('oas-avatar', OASAvatar)
}

export { OASAvatar }
