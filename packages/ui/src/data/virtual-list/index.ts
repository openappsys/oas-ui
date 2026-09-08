import '@oas-ui/i18n'
import {
  OASVirtualList,
  computeVirtualWindow,
  type VirtualWindow,
  type ScrollToIndexAlign,
  type ScrollToIndexOptions,
} from './oas-virtual-list.js'

if (!customElements.get('oas-virtual-list')) {
  customElements.define('oas-virtual-list', OASVirtualList)
}

export {
  OASVirtualList,
  computeVirtualWindow,
  type VirtualWindow,
  type ScrollToIndexAlign,
  type ScrollToIndexOptions,
}
