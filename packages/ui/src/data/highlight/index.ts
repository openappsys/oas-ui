import { OASHighlight } from './oas-highlight.js'

if (!customElements.get('oas-highlight')) {
  customElements.define('oas-highlight', OASHighlight)
}

export { OASHighlight }
