import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASTransfer } from './oas-transfer.js'

if (!customElements.get('oas-transfer')) {
  customElements.define('oas-transfer', OASTransfer)
}

export { OASTransfer }
export type { TransferItem } from './oas-transfer.js'
