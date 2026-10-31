import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASDatePicker } from './oas-date-picker.js'

if (!customElements.get('oas-date-picker')) {
  customElements.define('oas-date-picker', OASDatePicker)
}

export { OASDatePicker }
