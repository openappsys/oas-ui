import '@oas-ui/i18n'
import { OASDatePicker } from './oas-date-picker.js'

if (!customElements.get('oas-date-picker')) {
  customElements.define('oas-date-picker', OASDatePicker)
}

export { OASDatePicker }
