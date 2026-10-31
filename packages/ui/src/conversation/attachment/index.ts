import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { conversationMessages } from '@oas-ui/i18n/slices/conversation'
registerDefaultMessages(conversationMessages)
import { OASAttachment } from './oas-attachment.js'
import { OASAttachmentGroup } from './oas-attachment-group.js'

if (!customElements.get('oas-attachment')) {
  customElements.define('oas-attachment', OASAttachment)
}
if (!customElements.get('oas-attachment-group')) {
  customElements.define('oas-attachment-group', OASAttachmentGroup)
}

export { OASAttachment, OASAttachmentGroup }
