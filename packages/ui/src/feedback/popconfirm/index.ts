import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASPopconfirm } from './oas-popconfirm.js'

if (!customElements.get('oas-popconfirm')) {
  customElements.define('oas-popconfirm', OASPopconfirm)
}

export { OASPopconfirm }
