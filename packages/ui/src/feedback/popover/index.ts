import { OASPopover } from './oas-popover.js'

if (!customElements.get('oas-popover')) {
  customElements.define('oas-popover', OASPopover)
}

export { OASPopover }
