import '@oas-ui/i18n'
import { OASEditable } from './oas-editable.js'

if (!customElements.get('oas-editable')) {
  customElements.define('oas-editable', OASEditable)
}

export { OASEditable }
