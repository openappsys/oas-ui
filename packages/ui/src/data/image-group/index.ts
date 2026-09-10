import '@oas-ui/i18n'
import '../image/index.js'
import { OASImageGroup } from './oas-image-group.js'

if (!customElements.get('oas-image-group')) {
  customElements.define('oas-image-group', OASImageGroup)
}

export { OASImageGroup }
