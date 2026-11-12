import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASScanner } from './oas-scanner.js'

if (!customElements.get('oas-scanner')) {
  customElements.define('oas-scanner', OASScanner)
}

export { OASScanner }
export type { ScanErrorCode } from './oas-scanner.js'
