import '@oas-ui/i18n'
import { OASColorPicker } from './oas-color-picker.js'

if (!customElements.get('oas-color-picker')) {
  customElements.define('oas-color-picker', OASColorPicker)
}

export { OASColorPicker }
