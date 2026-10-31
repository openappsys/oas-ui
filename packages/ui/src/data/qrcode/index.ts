import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASQRCode } from './oas-qrcode.js'

if (!customElements.get('oas-qrcode')) {
  customElements.define('oas-qrcode', OASQRCode)
}

export { OASQRCode }
export { encodeQR, matrixToPath, encodeDataCodewords, rsEncode, QR_TOO_LONG_ERROR } from './qr.js'
export type { QRResult, QrMode, QrErrorCorrection } from './qr.js'
