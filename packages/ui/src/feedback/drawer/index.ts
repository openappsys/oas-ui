import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
registerDefaultMessages(feedbackMessages)
import { OASDrawer } from './oas-drawer.js'
import { drawer, destroyAll, type DrawerHandle, type DrawerOptions } from './drawer.js'

if (!customElements.get('oas-drawer')) {
  customElements.define('oas-drawer', OASDrawer)
}

export { OASDrawer, drawer, destroyAll, type DrawerHandle, type DrawerOptions }
