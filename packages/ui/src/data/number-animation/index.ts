import '@oas-ui/i18n/registry'
import { OASNumberAnimation } from './oas-number-animation.js'

if (!customElements.get('oas-number-animation')) {
  customElements.define('oas-number-animation', OASNumberAnimation)
}

export { OASNumberAnimation }
