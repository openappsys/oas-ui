import '@oas-ui/i18n'
import { OASPinInput } from './oas-pin-input.js'

if (!customElements.get('oas-pin-input')) {
  customElements.define('oas-pin-input', OASPinInput)
}

export { OASPinInput }
