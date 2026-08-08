import '@oas-ui/i18n'
import '../input/index.js'
import { OASDynamicInput } from './oas-dynamic-input.js'

if (!customElements.get('oas-dynamic-input')) {
  customElements.define('oas-dynamic-input', OASDynamicInput)
}

export { OASDynamicInput }
