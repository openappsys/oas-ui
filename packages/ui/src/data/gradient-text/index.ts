import '@oas-ui/i18n'
import { OASGradientText } from './oas-gradient-text.js'

if (!customElements.get('oas-gradient-text')) {
  customElements.define('oas-gradient-text', OASGradientText)
}

export { OASGradientText }
