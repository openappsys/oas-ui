import { OASLink } from './oas-link.js'

if (!customElements.get('oas-link')) {
  customElements.define('oas-link', OASLink)
}

export { OASLink }
export type { LinkType } from './oas-link.js'
