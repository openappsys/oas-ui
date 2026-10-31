import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASLog } from './oas-log.js'

if (!customElements.get('oas-log')) {
  customElements.define('oas-log', OASLog)
}

export { OASLog }
