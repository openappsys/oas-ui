import '@oas-ui/i18n/registry'
import { OASComment } from './oas-comment.js'

if (!customElements.get('oas-comment')) {
  customElements.define('oas-comment', OASComment)
}

export { OASComment }
