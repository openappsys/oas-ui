import { OASList } from './oas-list.js'
import { OASListItem } from './oas-list-item.js'

if (!customElements.get('oas-list')) {
  customElements.define('oas-list', OASList)
}
if (!customElements.get('oas-list-item')) {
  customElements.define('oas-list-item', OASListItem)
}

export { OASList, OASListItem }
