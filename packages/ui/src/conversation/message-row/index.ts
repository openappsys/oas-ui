import '@oas-ui/i18n'
import { OASMessageRow } from './oas-message-row.js'

if (!customElements.get('oas-message-row')) {
  customElements.define('oas-message-row', OASMessageRow)
}

export { OASMessageRow }
