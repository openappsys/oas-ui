import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASCalendar } from './oas-calendar.js'

if (!customElements.get('oas-calendar')) {
  customElements.define('oas-calendar', OASCalendar)
}

export { OASCalendar }
