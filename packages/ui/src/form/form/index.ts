import '@oas-ui/i18n'
import { OASForm, registerFormControl } from './oas-form.js'

if (!customElements.get('oas-form')) {
  customElements.define('oas-form', OASForm)
}

export { OASForm, registerFormControl }
export type { Rule, Rules, ValidateTrigger } from './oas-form.js'
