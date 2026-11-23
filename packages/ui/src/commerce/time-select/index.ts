import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASTimeSelect } from './oas-time-select.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-time-select')) {
  customElements.define('oas-time-select', OASTimeSelect)
}

export { OASTimeSelect }
export type { TimeSlot, TimeSelectMode, TimeSelectValue } from './oas-time-select.js'
