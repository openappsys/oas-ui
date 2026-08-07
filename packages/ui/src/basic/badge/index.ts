import { OASBadge } from './oas-badge.js'

if (!customElements.get('oas-badge')) {
  customElements.define('oas-badge', OASBadge)
}

export { OASBadge }
