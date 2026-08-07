import { OASSelect } from './oas-select.js'

if (!customElements.get('oas-select')) {
  customElements.define('oas-select', OASSelect)
}

export { OASSelect }
