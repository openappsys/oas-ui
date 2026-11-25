import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { overlayMessages } from '@oas-ui/i18n/slices/overlay'
import { OASDrag } from './oas-drag.js'

registerDefaultMessages(overlayMessages)

if (!customElements.get('oas-drag')) {
  customElements.define('oas-drag', OASDrag)
}

export { OASDrag }
export type { DragAxis, DragEndDetail, DragEndPhase, DragPosition } from './oas-drag.js'
