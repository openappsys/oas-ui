import '@oas-ui/i18n'
import { OASBackdrop } from './oas-backdrop.js'

if (!customElements.get('oas-backdrop')) {
  customElements.define('oas-backdrop', OASBackdrop)
}

export { OASBackdrop }
