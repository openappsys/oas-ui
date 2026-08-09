import { OASToolbar } from './oas-toolbar.js'

if (!customElements.get('oas-toolbar')) {
  customElements.define('oas-toolbar', OASToolbar)
}

export { OASToolbar }
