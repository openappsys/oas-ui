import { OASDropdown } from './oas-dropdown.js'

if (!customElements.get('oas-dropdown')) {
  customElements.define('oas-dropdown', OASDropdown)
}

export { OASDropdown }
