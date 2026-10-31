import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASCombobox } from './oas-combobox.js'

if (!customElements.get('oas-combobox')) {
  customElements.define('oas-combobox', OASCombobox)
}

export { OASCombobox }
