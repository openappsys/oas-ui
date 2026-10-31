import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASBarcode } from './oas-barcode.js'

if (!customElements.get('oas-barcode')) {
  customElements.define('oas-barcode', OASBarcode)
}

export { OASBarcode }
export { encodeBarcode, gs1CheckDigit, BarcodeEncodeError, BARCODE_FORMATS } from './encoders.js'
export type { BarcodeFormat, InvalidReason, EncodeResult, TextSegment } from './encoders.js'
