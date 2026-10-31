import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASAutoComplete } from './oas-auto-complete.js'

if (!customElements.get('oas-auto-complete')) {
  customElements.define('oas-auto-complete', OASAutoComplete)
}

export { OASAutoComplete }
