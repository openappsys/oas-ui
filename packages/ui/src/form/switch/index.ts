import { OASSwitch } from './oas-switch.js'

if (!customElements.get('oas-switch')) {
  customElements.define('oas-switch', OASSwitch)
}

export { OASSwitch }
