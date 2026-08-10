import '@oas-ui/i18n'
import { OASCombobox } from './oas-combobox.js'

if (!customElements.get('oas-combobox')) {
  customElements.define('oas-combobox', OASCombobox)
}

export { OASCombobox }
