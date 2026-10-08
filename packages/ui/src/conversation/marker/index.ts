import '@oas-ui/i18n'
import { OASMarker } from './oas-marker.js'

if (!customElements.get('oas-marker')) {
  customElements.define('oas-marker', OASMarker)
}

export { OASMarker }
