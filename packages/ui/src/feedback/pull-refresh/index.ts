import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASPullRefresh } from './oas-pull-refresh.js'

if (!customElements.get('oas-pull-refresh')) {
  customElements.define('oas-pull-refresh', OASPullRefresh)
}

export { OASPullRefresh } from './oas-pull-refresh.js'
