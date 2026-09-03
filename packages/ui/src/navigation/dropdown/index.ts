import { OASDropdown } from './oas-dropdown.js'
import { OASDropdownItem } from './oas-dropdown-item.js'
import { OASDropdownGroup } from './oas-dropdown-group.js'
import { OASDropdownDivider } from './oas-dropdown-divider.js'

if (!customElements.get('oas-dropdown')) {
  customElements.define('oas-dropdown', OASDropdown)
}
if (!customElements.get('oas-dropdown-item')) {
  customElements.define('oas-dropdown-item', OASDropdownItem)
}
if (!customElements.get('oas-dropdown-group')) {
  customElements.define('oas-dropdown-group', OASDropdownGroup)
}
if (!customElements.get('oas-dropdown-divider')) {
  customElements.define('oas-dropdown-divider', OASDropdownDivider)
}

export { OASDropdown, OASDropdownItem, OASDropdownGroup, OASDropdownDivider }
