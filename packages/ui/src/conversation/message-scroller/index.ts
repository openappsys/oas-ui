import '@oas-ui/i18n'
import { OASMessageScroller } from './oas-message-scroller.js'

if (!customElements.get('oas-message-scroller')) {
  customElements.define('oas-message-scroller', OASMessageScroller)
}

export { OASMessageScroller }
