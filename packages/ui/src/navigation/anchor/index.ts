import '@oas-ui/i18n'
import { OASAnchor, OASAnchorTarget, type AnchorItem } from './oas-anchor.js'
import { OASAnchorItem } from './oas-anchor-item.js'

if (!customElements.get('oas-anchor')) {
  customElements.define('oas-anchor', OASAnchor)
}
if (!customElements.get('oas-anchor-target')) {
  customElements.define('oas-anchor-target', OASAnchorTarget)
}
if (!customElements.get('oas-anchor-item')) {
  customElements.define('oas-anchor-item', OASAnchorItem)
}

export { OASAnchor, OASAnchorItem, OASAnchorTarget, type AnchorItem }
