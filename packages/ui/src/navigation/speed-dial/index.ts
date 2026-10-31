import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASSpeedDial } from './oas-speed-dial.js'

if (!customElements.get('oas-speed-dial')) {
  customElements.define('oas-speed-dial', OASSpeedDial)
}

export { OASSpeedDial }
export type { SpeedDialAction } from './oas-speed-dial.js'
