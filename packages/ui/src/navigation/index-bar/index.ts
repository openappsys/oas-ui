import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASIndexBar } from './oas-index-bar.js'

if (!customElements.get('oas-index-bar')) {
  customElements.define('oas-index-bar', OASIndexBar)
}

export { OASIndexBar, type IndexBarItem, type IndexBarSection } from './oas-index-bar.js'
