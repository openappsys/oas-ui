import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASChipsInput } from './oas-chips-input.js'

if (!customElements.get('oas-chips-input')) {
  customElements.define('oas-chips-input', OASChipsInput)
}

export { OASChipsInput }
