import { OASDivider } from './oas-divider.js'

if (!customElements.get('oas-divider')) {
  customElements.define('oas-divider', OASDivider)
}

export { OASDivider }
export type { DividerDirection, DividerPosition } from './oas-divider.js'
