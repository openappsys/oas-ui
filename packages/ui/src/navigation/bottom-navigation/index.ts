import { OASBottomNavigation } from './oas-bottom-navigation.js'

if (!customElements.get('oas-bottom-navigation')) {
  customElements.define('oas-bottom-navigation', OASBottomNavigation)
}

export { OASBottomNavigation }
export type { BottomNavItem } from './oas-bottom-navigation.js'
