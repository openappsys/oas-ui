import { OAStooltip } from './oas-tooltip.js'

if (!customElements.get('oas-tooltip')) {
  customElements.define('oas-tooltip', OAStooltip)
}

export { OAStooltip }
