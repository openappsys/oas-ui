import { OASContextMenu } from './oas-context-menu.js'

if (!customElements.get('oas-context-menu')) {
  customElements.define('oas-context-menu', OASContextMenu)
}

export { OASContextMenu }
