import { OASSpace } from './oas-space.js'
import { OASCompact } from './oas-compact.js'

if (!customElements.get('oas-space')) {
  customElements.define('oas-space', OASSpace)
}
if (!customElements.get('oas-compact')) {
  customElements.define('oas-compact', OASCompact)
}

export { OASSpace, OASCompact }
export type { SpaceDirection, SpaceSize, SpaceAlign, SpaceJustify } from './oas-space.js'
