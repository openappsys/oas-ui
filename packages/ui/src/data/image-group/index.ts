import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import '../image/index.js'
import { OASImageGroup } from './oas-image-group.js'

if (!customElements.get('oas-image-group')) {
  customElements.define('oas-image-group', OASImageGroup)
}

export { OASImageGroup }
