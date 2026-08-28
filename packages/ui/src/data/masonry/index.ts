import '@oas-ui/i18n'
import { OASMasonry, type MasonryItem } from './oas-masonry.js'

if (!customElements.get('oas-masonry')) {
  customElements.define('oas-masonry', OASMasonry)
}

export { OASMasonry, type MasonryItem }
