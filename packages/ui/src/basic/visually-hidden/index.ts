import { OASVisuallyHidden } from './oas-visually-hidden.js'

if (!customElements.get('oas-visually-hidden')) {
  customElements.define('oas-visually-hidden', OASVisuallyHidden)
}

export { OASVisuallyHidden }
