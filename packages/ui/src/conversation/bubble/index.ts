import '@oas-ui/i18n'
import { OASBubble } from './oas-bubble.js'

if (!customElements.get('oas-bubble')) {
  customElements.define('oas-bubble', OASBubble)
}

export { OASBubble }
