import { OASFlex } from './oas-flex.js'

if (!customElements.get('oas-flex')) {
  customElements.define('oas-flex', OASFlex)
}

export { OASFlex }
