import '@oas-ui/i18n'
import { OASAnchor, OASAnchorTarget, type AnchorItem } from './oas-anchor.js'

if (!customElements.get('oas-anchor')) {
  customElements.define('oas-anchor', OASAnchor)
}
if (!customElements.get('oas-anchor-target')) {
  customElements.define('oas-anchor-target', OASAnchorTarget)
}

export { OASAnchor, OASAnchorTarget, type AnchorItem }
