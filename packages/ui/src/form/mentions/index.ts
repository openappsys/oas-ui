import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASMentions } from './oas-mentions.js'

if (!customElements.get('oas-mentions')) {
  customElements.define('oas-mentions', OASMentions)
}

export { OASMentions }
