import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASImage } from './oas-image.js'

if (!customElements.get('oas-image')) {
  customElements.define('oas-image', OASImage)
}

export { OASImage }
