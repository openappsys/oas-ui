import { OASMenu, type MenuItem } from './oas-menu.js'

if (!customElements.get('oas-menu')) {
  customElements.define('oas-menu', OASMenu)
}

export { OASMenu, type MenuItem }
