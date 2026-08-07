import { OASSkeleton } from './oas-skeleton.js'

if (!customElements.get('oas-skeleton')) {
  customElements.define('oas-skeleton', OASSkeleton)
}

export { OASSkeleton }
