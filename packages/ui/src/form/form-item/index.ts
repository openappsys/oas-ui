import '@oas-ui/i18n'
import { OASFormItem } from './oas-form-item.js'

if (!customElements.get('oas-form-item')) {
  customElements.define('oas-form-item', OASFormItem)
}

export { OASFormItem }
