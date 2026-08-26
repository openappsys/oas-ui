import { OASContextMenu } from './oas-context-menu.js'
import { OASContextMenuItem } from './oas-context-menu-item.js'
import { OASContextMenuGroup } from './oas-context-menu-group.js'
import { OASContextMenuDivider } from './oas-context-menu-divider.js'

if (!customElements.get('oas-context-menu')) {
  customElements.define('oas-context-menu', OASContextMenu)
}
if (!customElements.get('oas-context-menu-item')) {
  customElements.define('oas-context-menu-item', OASContextMenuItem)
}
if (!customElements.get('oas-context-menu-group')) {
  customElements.define('oas-context-menu-group', OASContextMenuGroup)
}
if (!customElements.get('oas-context-menu-divider')) {
  customElements.define('oas-context-menu-divider', OASContextMenuDivider)
}

export { OASContextMenu, OASContextMenuItem, OASContextMenuGroup, OASContextMenuDivider }
