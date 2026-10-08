import '@oas-ui/i18n'
import { OASAttachment } from './oas-attachment.js'

if (!customElements.get('oas-attachment')) {
  customElements.define('oas-attachment', OASAttachment)
}

export { OASAttachment }
