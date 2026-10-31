import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASFormList } from './oas-form-list.js'

if (!customElements.get('oas-form-list')) {
  customElements.define('oas-form-list', OASFormList)
}

export { OASFormList }
