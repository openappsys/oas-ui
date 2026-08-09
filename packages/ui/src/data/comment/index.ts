import '@oas-ui/i18n'
import { OASComment } from './oas-comment.js'

if (!customElements.get('oas-comment')) {
  customElements.define('oas-comment', OASComment)
}

export { OASComment }
