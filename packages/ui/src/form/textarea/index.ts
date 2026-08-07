import { OASTextarea } from './oas-textarea.js'

if (!customElements.get('oas-textarea')) {
  customElements.define('oas-textarea', OASTextarea)
}

export { OASTextarea }
