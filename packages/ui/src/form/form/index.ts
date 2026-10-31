import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASForm, registerFormControl, parseNamePath } from './oas-form.js'

if (!customElements.get('oas-form')) {
  customElements.define('oas-form', OASForm)
}

export { OASForm, registerFormControl, parseNamePath }
export type { Rule, Rules, ValidateTrigger } from './oas-form.js'
