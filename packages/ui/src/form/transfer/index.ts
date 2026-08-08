import '@oas-ui/i18n'
import { OASTransfer } from './oas-transfer.js'

if (!customElements.get('oas-transfer')) {
  customElements.define('oas-transfer', OASTransfer)
}

export { OASTransfer }
export type { TransferItem } from './oas-transfer.js'
