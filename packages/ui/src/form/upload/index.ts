import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import '../../feedback/progress/index.js'
import '../../basic/icon/index.js'
import { OASUpload } from './oas-upload.js'

if (!customElements.get('oas-upload')) {
  customElements.define('oas-upload', OASUpload)
}

export { OASUpload }
export type {
  UploadEchoFile,
  UploadEntry,
  UploadRequestOptions,
  UploadCustomRequest,
  UploadBeforeUpload,
} from './oas-upload.js'
