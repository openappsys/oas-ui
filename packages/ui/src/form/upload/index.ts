import '@oas-ui/i18n'
import '../../feedback/progress/index.js'
import '../../basic/icon/index.js'
import { OASUpload } from './oas-upload.js'

if (!customElements.get('oas-upload')) {
  customElements.define('oas-upload', OASUpload)
}

export { OASUpload }
