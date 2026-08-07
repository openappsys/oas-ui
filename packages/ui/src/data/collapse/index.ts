import { OASCollapse } from './oas-collapse.js'
import { OASCollapseItem } from './oas-collapse-item.js'

if (!customElements.get('oas-collapse')) {
  customElements.define('oas-collapse', OASCollapse)
}
if (!customElements.get('oas-collapse-item')) {
  customElements.define('oas-collapse-item', OASCollapseItem)
}

export { OASCollapse, OASCollapseItem }
