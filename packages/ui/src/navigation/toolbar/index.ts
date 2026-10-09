import { OASToolbar } from './oas-toolbar.js'
import { OASToolbarToggle } from './oas-toolbar-toggle.js'
import { OASToolbarToggleItem } from './oas-toolbar-toggle-item.js'
import { OASToolbarSeparator } from './oas-toolbar-separator.js'
import { OASToolbarInput } from './oas-toolbar-input.js'
import { OASScopeBar } from './oas-scope-bar.js'

if (!customElements.get('oas-toolbar')) {
  customElements.define('oas-toolbar', OASToolbar)
}
if (!customElements.get('oas-toolbar-toggle')) {
  customElements.define('oas-toolbar-toggle', OASToolbarToggle)
}
if (!customElements.get('oas-toolbar-toggle-item')) {
  customElements.define('oas-toolbar-toggle-item', OASToolbarToggleItem)
}
if (!customElements.get('oas-toolbar-separator')) {
  customElements.define('oas-toolbar-separator', OASToolbarSeparator)
}
if (!customElements.get('oas-toolbar-input')) {
  customElements.define('oas-toolbar-input', OASToolbarInput)
}
if (!customElements.get('oas-scope-bar')) {
  customElements.define('oas-scope-bar', OASScopeBar)
}

export { OASToolbar, OASToolbarToggle, OASToolbarToggleItem, OASToolbarSeparator, OASToolbarInput, OASScopeBar }
export type { ToolbarToggleItem } from './oas-toolbar-toggle.js'
export type { ScopeBarItem } from './oas-scope-bar.js'
