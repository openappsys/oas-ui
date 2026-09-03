import '@oas-ui/i18n'
import { OASAspectRatio } from './oas-aspect-ratio.js'

if (!customElements.get('oas-aspect-ratio')) {
  customElements.define('oas-aspect-ratio', OASAspectRatio)
}

export { OASAspectRatio }
