import { OASDrawer } from './oas-drawer.js'

if (!customElements.get('oas-drawer')) {
  customElements.define('oas-drawer', OASDrawer)
}

export { OASDrawer }
