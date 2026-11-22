import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASSubmitBar } from './oas-submit-bar.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-submit-bar')) {
  customElements.define('oas-submit-bar', OASSubmitBar)
}

export { OASSubmitBar }
