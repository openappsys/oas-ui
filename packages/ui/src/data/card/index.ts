import { OASCard } from './oas-card.js'

if (!customElements.get('oas-card')) {
  customElements.define('oas-card', OASCard)
}

export { OASCard }
