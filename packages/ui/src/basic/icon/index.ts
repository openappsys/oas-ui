import { OASIcon } from './oas-icon.js'

if (!customElements.get('oas-icon')) {
  customElements.define('oas-icon', OASIcon)
}

export { OASIcon }
