import '@oas-ui/i18n'
import { OASToggleGroup } from './oas-toggle-group.js'

if (!customElements.get('oas-toggle-group')) {
  customElements.define('oas-toggle-group', OASToggleGroup)
}

export { OASToggleGroup }
export type { ToggleItem } from './oas-toggle-group.js'
