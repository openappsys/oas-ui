import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASOffline } from './oas-offline.js'

if (!customElements.get('oas-offline')) {
  customElements.define('oas-offline', OASOffline)
}

export { OASOffline }
export type { OfflineVariant } from './oas-offline.js'
