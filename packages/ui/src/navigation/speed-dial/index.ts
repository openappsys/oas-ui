import '@oas-ui/i18n'
import { OASSpeedDial } from './oas-speed-dial.js'

if (!customElements.get('oas-speed-dial')) {
  customElements.define('oas-speed-dial', OASSpeedDial)
}

export { OASSpeedDial }
export type { SpeedDialAction } from './oas-speed-dial.js'
