import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import '../input/index.js'
import { OASDynamicInput } from './oas-dynamic-input.js'

if (!customElements.get('oas-dynamic-input')) {
  customElements.define('oas-dynamic-input', OASDynamicInput)
}

export { OASDynamicInput }
