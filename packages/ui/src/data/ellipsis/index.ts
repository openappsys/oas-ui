import { OASEllipsis } from './oas-ellipsis.js'

if (!customElements.get('oas-ellipsis')) {
  customElements.define('oas-ellipsis', OASEllipsis)
}

export { OASEllipsis }
