import { OASCollapsible } from './oas-collapsible.js'

if (!customElements.get('oas-collapsible')) {
  customElements.define('oas-collapsible', OASCollapsible)
}

export { OASCollapsible }
