import { OASSafeArea } from './oas-safe-area.js'

if (!customElements.get('oas-safe-area')) {
  customElements.define('oas-safe-area', OASSafeArea)
}

export { OASSafeArea }
