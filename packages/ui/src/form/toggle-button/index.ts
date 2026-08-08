import '@oas-ui/i18n'
import { OASToggleButton } from './oas-toggle-button.js'

if (!customElements.get('oas-toggle-button')) {
  customElements.define('oas-toggle-button', OASToggleButton)
}

export { OASToggleButton }
