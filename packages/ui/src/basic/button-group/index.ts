import { OASButtonGroup } from './oas-button-group.js'
import { OASButtonGroupSeparator } from './oas-button-group-separator.js'

if (!customElements.get('oas-button-group')) {
  customElements.define('oas-button-group', OASButtonGroup)
}
if (!customElements.get('oas-button-group-separator')) {
  customElements.define('oas-button-group-separator', OASButtonGroupSeparator)
}

export { OASButtonGroup, OASButtonGroupSeparator }
