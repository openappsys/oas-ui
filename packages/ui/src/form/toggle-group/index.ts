import '@oas-ui/i18n'
import { OASToggleGroup } from './oas-toggle-group.js'
import { OASToggleItem } from './oas-toggle-item.js'

if (!customElements.get('oas-toggle-group')) {
  customElements.define('oas-toggle-group', OASToggleGroup)
}
if (!customElements.get('oas-toggle-item')) {
  customElements.define('oas-toggle-item', OASToggleItem)
}

export { OASToggleGroup, OASToggleItem }
export type { ToggleItem } from './oas-toggle-group.js'
