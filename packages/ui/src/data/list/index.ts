import '@oas-ui/i18n'
import '../virtual-list/index.js' // 副作用：确保 oas-virtual-list 已注册（height 虚拟模式内嵌）
import { OASList } from './oas-list.js'
import { OASListItem } from './oas-list-item.js'

if (!customElements.get('oas-list')) {
  customElements.define('oas-list', OASList)
}
if (!customElements.get('oas-list-item')) {
  customElements.define('oas-list-item', OASListItem)
}

export { OASList, OASListItem }
