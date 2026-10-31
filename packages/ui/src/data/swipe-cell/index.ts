import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASSwipeCell } from './oas-swipe-cell.js'

if (!customElements.get('oas-swipe-cell')) {
  customElements.define('oas-swipe-cell', OASSwipeCell)
}

export { OASSwipeCell }
