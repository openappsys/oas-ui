import {
  OASWatermark,
  textTileDataUri,
  textTileCanvas,
  canvasAvailable,
  parseTextLines,
} from './oas-watermark.js'
import type { WatermarkTextOptions, WatermarkCanvasTextOptions } from './oas-watermark.js'

if (!customElements.get('oas-watermark')) {
  customElements.define('oas-watermark', OASWatermark)
}

export { OASWatermark, textTileDataUri, textTileCanvas, canvasAvailable, parseTextLines }
export type { WatermarkTextOptions, WatermarkCanvasTextOptions }
