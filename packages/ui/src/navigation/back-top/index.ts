import { OASBackTop } from './oas-back-top.js'

if (!customElements.get('oas-back-top')) {
  customElements.define('oas-back-top', OASBackTop)
}

export { OASBackTop }
