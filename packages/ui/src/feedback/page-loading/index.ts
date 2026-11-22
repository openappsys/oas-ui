import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASPageLoading } from './oas-page-loading.js'

if (!customElements.get('oas-page-loading')) {
  customElements.define('oas-page-loading', OASPageLoading)
}

export { OASPageLoading }
export type { PageLoadingMode } from './oas-page-loading.js'
