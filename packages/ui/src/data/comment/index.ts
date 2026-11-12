import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASComment } from './oas-comment.js'

if (!customElements.get('oas-comment')) {
  customElements.define('oas-comment', OASComment)
}

export { OASComment }
export type { CommentSubmitDetail, CommentResolveDetail } from './oas-comment.js'
