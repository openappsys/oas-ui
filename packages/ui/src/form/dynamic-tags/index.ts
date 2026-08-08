import '@oas-ui/i18n'
import { OASDynamicTags } from './oas-dynamic-tags.js'

if (!customElements.get('oas-dynamic-tags')) {
  customElements.define('oas-dynamic-tags', OASDynamicTags)
}

export { OASDynamicTags }
