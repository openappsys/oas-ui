import '@oas-ui/i18n'
import { OASBottomSheet } from './oas-bottom-sheet.js'

if (!customElements.get('oas-bottom-sheet')) {
  customElements.define('oas-bottom-sheet', OASBottomSheet)
}

export { OASBottomSheet }
