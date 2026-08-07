import { OASRate } from './oas-rate.js'

if (!customElements.get('oas-rate')) {
  customElements.define('oas-rate', OASRate)
}

export { OASRate }
