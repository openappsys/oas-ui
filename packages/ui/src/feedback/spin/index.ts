import { OASSpin } from './oas-spin.js'

if (!customElements.get('oas-spin')) {
  customElements.define('oas-spin', OASSpin)
}

export { OASSpin }
