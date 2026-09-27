import '@oas-ui/i18n'
import { OASFormList } from './oas-form-list.js'

if (!customElements.get('oas-form-list')) {
  customElements.define('oas-form-list', OASFormList)
}

export { OASFormList }
