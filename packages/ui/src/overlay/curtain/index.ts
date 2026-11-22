import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { overlayMessages } from '@oas-ui/i18n/slices/overlay'
registerDefaultMessages(overlayMessages)
import { OASCurtain } from './oas-curtain.js'

if (!customElements.get('oas-curtain')) {
  customElements.define('oas-curtain', OASCurtain)
}

export { OASCurtain }
