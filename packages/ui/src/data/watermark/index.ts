import { OASWatermark, textTileDataUri, parseTextLines } from './oas-watermark.js'
import type { WatermarkTextOptions } from './oas-watermark.js'

if (!customElements.get('oas-watermark')) {
  customElements.define('oas-watermark', OASWatermark)
}

export { OASWatermark, textTileDataUri, parseTextLines }
export type { WatermarkTextOptions }
