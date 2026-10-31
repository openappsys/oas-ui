import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASPicker } from './oas-picker.js'

if (!customElements.get('oas-picker')) {
  customElements.define('oas-picker', OASPicker)
}

export { OASPicker }
export type { PickerItem, PickerColumn, PickerChangeDetail } from './oas-picker.js'
