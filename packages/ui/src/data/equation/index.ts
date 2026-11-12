import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
import { OASEquation } from './oas-equation.js'

registerDefaultMessages(dataMessages)

if (!customElements.get('oas-equation')) {
  customElements.define('oas-equation', OASEquation)
}

export { OASEquation, renderLatex } from './oas-equation.js'
