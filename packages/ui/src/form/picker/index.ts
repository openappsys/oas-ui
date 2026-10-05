import '@oas-ui/i18n'
import { OASPicker } from './oas-picker.js'

if (!customElements.get('oas-picker')) {
  customElements.define('oas-picker', OASPicker)
}

export { OASPicker }
export type { PickerItem, PickerColumn, PickerChangeDetail } from './oas-picker.js'
