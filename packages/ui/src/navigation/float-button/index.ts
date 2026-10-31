import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASFloatButton } from './oas-float-button.js'

if (!customElements.get('oas-float-button')) {
  customElements.define('oas-float-button', OASFloatButton)
}

export { OASFloatButton }
