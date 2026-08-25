import { OASNavigationMenu, type NavItem } from './oas-navigation-menu.js'
import { OASNavigationMenuItem } from './oas-navigation-menu-item.js'
import { OASNavigationMenuGroup } from './oas-navigation-menu-group.js'

if (!customElements.get('oas-navigation-menu')) {
  customElements.define('oas-navigation-menu', OASNavigationMenu)
}
if (!customElements.get('oas-navigation-menu-item')) {
  customElements.define('oas-navigation-menu-item', OASNavigationMenuItem)
}
if (!customElements.get('oas-navigation-menu-group')) {
  customElements.define('oas-navigation-menu-group', OASNavigationMenuGroup)
}

export {
  OASNavigationMenu,
  OASNavigationMenuItem,
  OASNavigationMenuGroup,
  type NavItem,
}
