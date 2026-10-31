import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASCarousel } from './oas-carousel.js'

if (!customElements.get('oas-carousel')) {
  customElements.define('oas-carousel', OASCarousel)
}

export { OASCarousel }
