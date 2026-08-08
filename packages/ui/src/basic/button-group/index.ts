import { OASButtonGroup } from './oas-button-group.js'

if (!customElements.get('oas-button-group')) {
  customElements.define('oas-button-group', OASButtonGroup)
}

export { OASButtonGroup }
