import { OASInput } from './oas-input.js'

if (!customElements.get('oas-input')) {
  customElements.define('oas-input', OASInput)
}

export { OASInput }
