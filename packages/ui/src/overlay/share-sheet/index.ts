import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { overlayMessages } from '@oas-ui/i18n/slices/overlay'
registerDefaultMessages(overlayMessages)
import '../../basic/icon/index.js'
import { OASShareSheet } from './oas-share-sheet.js'

if (!customElements.get('oas-share-sheet')) {
  customElements.define('oas-share-sheet', OASShareSheet)
}

export { OASShareSheet }
export type { ShareSheetChannel } from './oas-share-sheet.js'
