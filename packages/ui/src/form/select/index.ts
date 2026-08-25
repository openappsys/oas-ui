import '@oas-ui/i18n'
import { OASSelect } from './oas-select.js'
import { OASOption } from './oas-option.js'

if (!customElements.get('oas-select')) {
  customElements.define('oas-select', OASSelect)
}
if (!customElements.get('oas-option')) {
  customElements.define('oas-option', OASOption)
}

export { OASSelect, OASOption }
export type { Option } from './oas-select.js'
