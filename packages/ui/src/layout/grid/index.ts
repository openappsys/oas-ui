import { OASGrid } from './oas-grid.js'
import { OASGridItem } from './oas-grid-item.js'

if (!customElements.get('oas-grid')) {
  customElements.define('oas-grid', OASGrid)
}
if (!customElements.get('oas-grid-item')) {
  customElements.define('oas-grid-item', OASGridItem)
}

export { OASGrid, OASGridItem }
