import '@oas-ui/i18n/registry'
import { OASMarquee } from './oas-marquee.js'

if (!customElements.get('oas-marquee')) {
  customElements.define('oas-marquee', OASMarquee)
}

export { OASMarquee }
