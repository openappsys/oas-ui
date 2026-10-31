import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASDynamicTags } from './oas-dynamic-tags.js'

if (!customElements.get('oas-dynamic-tags')) {
  customElements.define('oas-dynamic-tags', OASDynamicTags)
}

export { OASDynamicTags }
