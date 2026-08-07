import { OASDescriptions } from './oas-descriptions.js'
import { OASDescriptionsItem } from './oas-descriptions-item.js'

if (!customElements.get('oas-descriptions')) {
  customElements.define('oas-descriptions', OASDescriptions)
}
if (!customElements.get('oas-descriptions-item')) {
  customElements.define('oas-descriptions-item', OASDescriptionsItem)
}

export { OASDescriptions, OASDescriptionsItem }
