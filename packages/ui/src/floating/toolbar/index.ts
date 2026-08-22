import { OASToolbar } from './oas-toolbar.js'
import { OASToolbarToggle } from './oas-toolbar-toggle.js'
import { OASToolbarSeparator } from './oas-toolbar-separator.js'
import { OASToolbarInput } from './oas-toolbar-input.js'

if (!customElements.get('oas-toolbar')) {
  customElements.define('oas-toolbar', OASToolbar)
}
if (!customElements.get('oas-toolbar-toggle')) {
  customElements.define('oas-toolbar-toggle', OASToolbarToggle)
}
if (!customElements.get('oas-toolbar-separator')) {
  customElements.define('oas-toolbar-separator', OASToolbarSeparator)
}
if (!customElements.get('oas-toolbar-input')) {
  customElements.define('oas-toolbar-input', OASToolbarInput)
}

export { OASToolbar, OASToolbarToggle, OASToolbarSeparator, OASToolbarInput }
export type { ToolbarToggleItem } from './oas-toolbar-toggle.js'
