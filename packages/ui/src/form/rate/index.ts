import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASRate } from './oas-rate.js'

if (!customElements.get('oas-rate')) {
  customElements.define('oas-rate', OASRate)
}

export { OASRate }
