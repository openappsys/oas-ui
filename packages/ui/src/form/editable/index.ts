import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASEditable } from './oas-editable.js'

if (!customElements.get('oas-editable')) {
  customElements.define('oas-editable', OASEditable)
}

export { OASEditable }
