import {
  OASWatermark,
  textTileDataUri,
  textTileCanvas,
  canvasAvailable,
  parseTextLines,
  resolveTileSize,
} from './oas-watermark.js'
import type { WatermarkTextOptions, WatermarkCanvasTextOptions } from './oas-watermark.js'

if (!customElements.get('oas-watermark')) {
  customElements.define('oas-watermark', OASWatermark)
}

export { OASWatermark, textTileDataUri, textTileCanvas, canvasAvailable, parseTextLines, resolveTileSize }
export type { WatermarkTextOptions, WatermarkCanvasTextOptions }
