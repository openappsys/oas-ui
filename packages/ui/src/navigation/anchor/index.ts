import '@oas-ui/i18n'
import { OASAnchor, type AnchorItem } from './oas-anchor.js'

if (!customElements.get('oas-anchor')) {
  customElements.define('oas-anchor', OASAnchor)
}

export { OASAnchor, type AnchorItem }
