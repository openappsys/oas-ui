import { OASCheckbox } from './oas-checkbox.js'
import { OASCheckboxGroup } from './oas-checkbox-group.js'

if (!customElements.get('oas-checkbox')) {
  customElements.define('oas-checkbox', OASCheckbox)
}
if (!customElements.get('oas-checkbox-group')) {
  customElements.define('oas-checkbox-group', OASCheckboxGroup)
}

export { OASCheckbox, OASCheckboxGroup }
