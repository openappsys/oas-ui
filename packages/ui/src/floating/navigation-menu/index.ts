import { OASNavigationMenu, type NavItem } from './oas-navigation-menu.js'

if (!customElements.get('oas-navigation-menu')) {
  customElements.define('oas-navigation-menu', OASNavigationMenu)
}

export { OASNavigationMenu, type NavItem }
