import { OASImage } from './oas-image.js'

if (!customElements.get('oas-image')) {
  customElements.define('oas-image', OASImage)
}

export { OASImage }
