import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASEllipsis } from './oas-ellipsis.js'

if (!customElements.get('oas-ellipsis')) {
  customElements.define('oas-ellipsis', OASEllipsis)
}

export { OASEllipsis }
