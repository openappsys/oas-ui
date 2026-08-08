import '@oas-ui/i18n'
import { OASSplitter } from './oas-splitter.js'

if (!customElements.get('oas-splitter')) {
  customElements.define('oas-splitter', OASSplitter)
}

export { OASSplitter }
