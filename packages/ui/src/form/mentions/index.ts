import '@oas-ui/i18n'
import { OASMentions } from './oas-mentions.js'

if (!customElements.get('oas-mentions')) {
  customElements.define('oas-mentions', OASMentions)
}

export { OASMentions }
