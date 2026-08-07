import { OASAutoComplete } from './oas-auto-complete.js'

if (!customElements.get('oas-auto-complete')) {
  customElements.define('oas-auto-complete', OASAutoComplete)
}

export { OASAutoComplete }
