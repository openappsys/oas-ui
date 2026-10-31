import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASAppBar } from './oas-app-bar.js'

if (!customElements.get('oas-app-bar')) {
  customElements.define('oas-app-bar', OASAppBar)
}

export { OASAppBar }
export type { AppBarPosition } from './oas-app-bar.js'
