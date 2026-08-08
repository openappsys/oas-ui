import '@oas-ui/i18n'
import { OASEmpty } from './oas-empty.js'

if (!customElements.get('oas-empty')) {
  customElements.define('oas-empty', OASEmpty)
}

export { OASEmpty }
