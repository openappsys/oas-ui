import { OASWatermark, textTileDataUri } from './oas-watermark.js'

if (!customElements.get('oas-watermark')) {
  customElements.define('oas-watermark', OASWatermark)
}

export { OASWatermark, textTileDataUri }
