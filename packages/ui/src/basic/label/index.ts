import { OASLabel } from './oas-label.js'

if (!customElements.get('oas-label')) {
  customElements.define('oas-label', OASLabel)
}

export { OASLabel }
