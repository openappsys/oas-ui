import { OASSwatch } from './oas-swatch.js'
import { OASSwatchGroup } from './oas-swatch-group.js'

if (!customElements.get('oas-swatch')) {
  customElements.define('oas-swatch', OASSwatch)
}
if (!customElements.get('oas-swatch-group')) {
  customElements.define('oas-swatch-group', OASSwatchGroup)
}

export { OASSwatch, OASSwatchGroup }
