import { OASMenu, type MenuItem, type MenuItemKind } from './oas-menu.js'
import { OASMenuItem } from './oas-menu-item.js'
import { OASMenuGroup } from './oas-menu-group.js'
import { OASMenuDivider } from './oas-menu-divider.js'

if (!customElements.get('oas-menu')) {
  customElements.define('oas-menu', OASMenu)
}
if (!customElements.get('oas-menu-item')) {
  customElements.define('oas-menu-item', OASMenuItem)
}
if (!customElements.get('oas-menu-group')) {
  customElements.define('oas-menu-group', OASMenuGroup)
}
if (!customElements.get('oas-menu-divider')) {
  customElements.define('oas-menu-divider', OASMenuDivider)
}

export { OASMenu, OASMenuItem, OASMenuGroup, OASMenuDivider, type MenuItem, type MenuItemKind }
