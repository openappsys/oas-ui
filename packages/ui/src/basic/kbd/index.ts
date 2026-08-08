import { OASKbd } from './oas-kbd.js'

if (!customElements.get('oas-kbd')) {
  customElements.define('oas-kbd', OASKbd)
}

export { OASKbd }
