import '@oas-ui/i18n'
import { OASLog } from './oas-log.js'

if (!customElements.get('oas-log')) {
  customElements.define('oas-log', OASLog)
}

export { OASLog }
