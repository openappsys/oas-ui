import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'

registerDefaultMessages(dataMessages)

import { OASSignature } from './oas-signature.js'

if (!customElements.get('oas-signature')) {
  customElements.define('oas-signature', OASSignature)
}

export { OASSignature }
