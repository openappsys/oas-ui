import '@oas-ui/i18n'
import { OASTimePicker } from './oas-time-picker.js'

if (!customElements.get('oas-time-picker')) {
  customElements.define('oas-time-picker', OASTimePicker)
}

export { OASTimePicker }
