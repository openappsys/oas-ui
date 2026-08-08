import '@oas-ui/i18n'
import { OASCarousel } from './oas-carousel.js'

if (!customElements.get('oas-carousel')) {
  customElements.define('oas-carousel', OASCarousel)
}

export { OASCarousel }
