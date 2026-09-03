import { OASHoverCard } from './oas-hover-card.js'

if (!customElements.get('oas-hover-card')) {
  customElements.define('oas-hover-card', OASHoverCard)
}

export { OASHoverCard }
