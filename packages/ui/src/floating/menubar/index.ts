import { OASMenubar, type MenubarItem } from './oas-menubar.js'

if (!customElements.get('oas-menubar')) {
  customElements.define('oas-menubar', OASMenubar)
}

export { OASMenubar, type MenubarItem }
