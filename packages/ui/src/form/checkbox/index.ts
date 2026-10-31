import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASCheckbox } from './oas-checkbox.js'
import { OASCheckboxGroup } from './oas-checkbox-group.js'

if (!customElements.get('oas-checkbox')) {
  customElements.define('oas-checkbox', OASCheckbox)
}
if (!customElements.get('oas-checkbox-group')) {
  customElements.define('oas-checkbox-group', OASCheckboxGroup)
}

export { OASCheckbox, OASCheckboxGroup }
export type { CheckboxOption } from './oas-checkbox-group.js'
