import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASTimePicker } from './oas-time-picker.js'

if (!customElements.get('oas-time-picker')) {
  customElements.define('oas-time-picker', OASTimePicker)
}

export { OASTimePicker }
