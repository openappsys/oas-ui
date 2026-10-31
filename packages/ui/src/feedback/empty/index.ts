import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASEmpty } from './oas-empty.js'

if (!customElements.get('oas-empty')) {
  customElements.define('oas-empty', OASEmpty)
}

export { OASEmpty }
export type { EmptySize, EmptyAlign, EmptyVariant } from './oas-empty.js'
