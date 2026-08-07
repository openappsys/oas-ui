import { OASResult } from './oas-result.js'

if (!customElements.get('oas-result')) {
  customElements.define('oas-result', OASResult)
}

export { OASResult }
