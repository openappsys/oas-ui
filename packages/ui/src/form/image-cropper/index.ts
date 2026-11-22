import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASImageCropper } from './oas-image-cropper.js'

if (!customElements.get('oas-image-cropper')) {
  customElements.define('oas-image-cropper', OASImageCropper)
}

export { OASImageCropper }
