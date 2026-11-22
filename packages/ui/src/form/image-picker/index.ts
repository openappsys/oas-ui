import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASImagePicker } from './oas-image-picker.js'

if (!customElements.get('oas-image-picker')) {
  customElements.define('oas-image-picker', OASImagePicker)
}

export { OASImagePicker }
