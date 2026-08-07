import { OASSpace } from './oas-space.js'

if (!customElements.get('oas-space')) {
  customElements.define('oas-space', OASSpace)
}

export { OASSpace }
export type { SpaceDirection, SpaceSize, SpaceAlign } from './oas-space.js'
