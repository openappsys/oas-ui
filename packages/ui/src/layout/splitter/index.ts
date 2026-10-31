import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { layoutMessages } from '@oas-ui/i18n/slices/layout'
registerDefaultMessages(layoutMessages)
import { OASSplitter } from './oas-splitter.js'

if (!customElements.get('oas-splitter')) {
  customElements.define('oas-splitter', OASSplitter)
}

export { OASSplitter }
