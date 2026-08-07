import { OASInputNumber } from './oas-input-number.js'

if (!customElements.get('oas-input-number')) {
  customElements.define('oas-input-number', OASInputNumber)
}

export { OASInputNumber }
