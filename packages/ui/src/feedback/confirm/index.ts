import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASModal } from '../modal/index.js'
import { confirm, destroyAll, type ConfirmOptions } from './confirm.js'

if (!customElements.get('oas-modal')) {
  customElements.define('oas-modal', OASModal)
}

export { confirm, destroyAll, type ConfirmOptions }
