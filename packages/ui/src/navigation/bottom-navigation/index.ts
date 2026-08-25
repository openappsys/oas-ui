import { OASBottomNavigation } from './oas-bottom-navigation.js'
import { OASBottomNavigationItem } from './oas-bottom-navigation-item.js'

if (!customElements.get('oas-bottom-navigation')) {
  customElements.define('oas-bottom-navigation', OASBottomNavigation)
}
if (!customElements.get('oas-bottom-navigation-item')) {
  customElements.define('oas-bottom-navigation-item', OASBottomNavigationItem)
}

export { OASBottomNavigation, OASBottomNavigationItem }
export type { BottomNavItem } from './oas-bottom-navigation.js'
