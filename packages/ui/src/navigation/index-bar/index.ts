import '@oas-ui/i18n'
import { OASIndexBar } from './oas-index-bar.js'

if (!customElements.get('oas-index-bar')) {
  customElements.define('oas-index-bar', OASIndexBar)
}

export { OASIndexBar, type IndexBarItem, type IndexBarSection } from './oas-index-bar.js'
